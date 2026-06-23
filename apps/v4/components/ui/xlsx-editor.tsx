"use client"

import * as React from "react"
import {
  useXlsxViewer,
  useXlsxViewerController,
  useXlsxViewerEditing,
  useXlsxViewerSelection,
  useXlsxViewerZoom,
  XlsxViewer,
  XlsxViewerProvider,
  type XlsxCellAlignmentInput,
  type XlsxCellBorderEdgeInput,
  type XlsxCellRange,
  type XlsxCellStyleInput,
  type XlsxSheetData,
  type XlsxTableHeaderMenuRenderProps,
} from "@extend-ai/react-xlsx"
import {
  Add01Icon,
  AlignBoxBottomCenterIcon,
  AlignBoxMiddleCenterIcon,
  AlignBoxTopCenterIcon,
  BorderAll01Icon,
  BorderBottom01Icon,
  BorderLeft01Icon,
  BorderNone01Icon,
  BorderRight01Icon,
  BorderTop01Icon,
  Calendar03Icon,
  CellsIcon,
  ChevronDownIcon,
  Delete02Icon,
  DollarCircleIcon,
  Download01Icon,
  DropletOffIcon,
  Grid2X2XIcon,
  MinusSignCircleIcon,
  Moon02Icon,
  MoreHorizontalIcon,
  PaintBucketIcon,
  PathfinderMergeIcon,
  PercentIcon,
  PlusSignCircleIcon,
  Redo02Icon,
  Sun03Icon,
  TableRowsSplitIcon,
  TextAlignCenterIcon,
  TextAlignLeft01Icon,
  TextAlignRight01Icon,
  TextBoldIcon,
  TextColorIcon,
  TextItalicIcon,
  TextNumberSignIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  TextWrapIcon,
  Undo02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ColorPicker, ColorPickerPanel } from "@/components/ui/color-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Group, GroupSeparator, GroupText } from "@/components/ui/group"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  renderXlsxScroller,
  WorkbookSheetTabs,
  WorkbookTableHeaderMenu,
} from "@/components/ui/xlsx-viewer"

const XLSX_LOADING_INDICATOR_DELAY_MS = 300
const XLSX_EDITOR_READ_ONLY_THRESHOLD_BYTES = 5 * 1024 * 1024
const XLSX_DROPDOWN_Z_INDEX_CLASS = "z-40"
const ZOOM_OPTIONS = [50, 75, 100, 125, 150, 200, 400] as const
const DEFAULT_FONT_FAMILY = "Arial"
const FONT_FAMILIES = [
  "Arial",
  "Times New Roman",
  "Georgia",
  "Helvetica",
  "Courier New",
] as const
const FONT_SIZE_OPTIONS = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48,
] as const
const DEFAULT_TEXT_COLOR = "#111827"
const DEFAULT_FILL_COLOR = "#fde68a"
const DEFAULT_BORDER_COLOR = "#111827"
const XLSX_EDITOR_SELECT_CHROME_CLASS =
  "shadow-none before:shadow-none not-data-disabled:not-focus-visible:not-aria-invalid:not-data-pressed:before:shadow-none dark:not-data-disabled:not-focus-visible:not-aria-invalid:not-data-pressed:before:shadow-none"
const XLSX_EDITOR_FORMULA_INPUT_CHROME_CLASS =
  "has-disabled:opacity-100 dark:has-disabled:before:shadow-[0_-1px_--theme(--color-white/6%)]"

type UploadedWorkbook = {
  buffer: ArrayBuffer
  fileName: string
  identity: string
}

type NumberFormatOption = {
  formatString?: string
  formatType: NonNullable<XlsxCellStyleInput["numberFormat"]>["formatType"]
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  id?: number
  label: string
  value: string
}

type BorderOption = {
  action: XlsxBorderAction
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  label: string
}

type XlsxResolvedCellStyle = XlsxSheetData["styleById"][number]
type XlsxResolvedStyleGroup = Record<string, unknown>

type HorizontalAlignment = NonNullable<XlsxCellAlignmentInput["horizontal"]>

type VerticalAlignment = NonNullable<XlsxCellAlignmentInput["vertical"]>

type HorizontalAlignmentToggleValue = Extract<
  HorizontalAlignment,
  "left" | "center" | "right"
>

type VerticalAlignmentToggleValue = Extract<
  VerticalAlignment,
  "top" | "center" | "bottom"
>

type XlsxFontToggleValue = "bold" | "italic" | "underline" | "strikethrough"

type XlsxMergeRegion = XlsxCellRange

type XlsxBorderEdgeKey = "bottom" | "left" | "top" | "right"

type XlsxBorderAction = "all" | "outside" | "none" | XlsxBorderEdgeKey

type XlsxWorksheetWithMergeRegions = {
  mergedRegions?: unknown[]
  unmergeCells?: (range: string) => boolean
}

const NUMBER_FORMAT_OPTIONS: NumberFormatOption[] = [
  {
    formatType: "general",
    icon: TextNumberSignIcon,
    label: "General",
    value: "General",
  },
  {
    formatString: "0.00",
    formatType: "custom",
    icon: TextNumberSignIcon,
    label: "Number",
    value: "Number",
  },
  {
    formatString: "$#,##0.00",
    formatType: "custom",
    icon: DollarCircleIcon,
    label: "Currency",
    value: "Currency",
  },
  {
    formatString: "0.00%",
    formatType: "custom",
    icon: PercentIcon,
    label: "Percent",
    value: "Percent",
  },
  {
    formatString: "m/d/yyyy",
    formatType: "custom",
    icon: Calendar03Icon,
    label: "Date",
    value: "Date",
  },
]

const GENERAL_NUMBER_FORMAT_VALUE = "General"
const BUILTIN_NUMBER_FORMAT_VALUE_PREFIX = "builtin:"

function formatWorkbookName(fileName: string | undefined, url: string) {
  if (fileName?.trim()) return fileName

  const pathname = url.split("?")[0] ?? ""
  const rawName = pathname.split("/").pop() ?? "workbook.xlsx"

  try {
    return decodeURIComponent(rawName)
  } catch {
    return rawName
  }
}

function useDelayedLoadingIndicator(isLoading: boolean, delayMs: number) {
  const [showSpinner, setShowSpinner] = React.useState(false)

  React.useEffect(() => {
    if (!isLoading) {
      setShowSpinner(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowSpinner(true)
    }, delayMs)

    return () => window.clearTimeout(timeoutId)
  }, [delayMs, isLoading])

  return showSpinner
}

function normalizeHexColor(value: string, fallback = DEFAULT_TEXT_COLOR) {
  const trimmed = value.trim()
  const threeDigit = /^#?([0-9a-f]{3})$/i.exec(trimmed)
  if (threeDigit?.[1]) {
    const [red, green, blue] = threeDigit[1].split("")
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase()
  }

  const sixDigit = /^#?([0-9a-f]{6})$/i.exec(trimmed)
  if (sixDigit?.[1]) {
    return `#${sixDigit[1].toLowerCase()}`
  }

  return fallback
}

function toXlsxRgbColor(value: string) {
  return {
    colorType: "rgb" as const,
    hex: normalizeHexColor(value).slice(1).toUpperCase(),
  }
}

function asResolvedStyleGroup(
  value: unknown
): XlsxResolvedStyleGroup | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as XlsxResolvedStyleGroup)
    : undefined
}

function mergeResolvedCellStyle(
  base: XlsxResolvedCellStyle | null | undefined,
  overlay: XlsxResolvedCellStyle | null | undefined
): XlsxResolvedCellStyle | null {
  if (!base && !overlay) return null

  const nextStyle = { ...(base ?? {}), ...(overlay ?? {}) }
  const baseFont = asResolvedStyleGroup(base?.font)
  const overlayFont = asResolvedStyleGroup(overlay?.font)

  if (baseFont || overlayFont) {
    nextStyle.font = overlayFont ?? baseFont
  }

  return nextStyle
}

function resolveInheritedCellStyle(
  sheet: XlsxSheetData | null,
  row: number,
  col: number
): XlsxResolvedCellStyle | null {
  if (!sheet) return null

  const colStyleId = sheet.colStyleIds[col]
  const rowStyleId = sheet.rowStyleIds[row]
  const colStyle =
    colStyleId !== undefined ? sheet.styleById[colStyleId] : undefined
  const rowStyle =
    rowStyleId !== undefined ? sheet.styleById[rowStyleId] : undefined

  return mergeResolvedCellStyle(colStyle, rowStyle)
}

function getFontToggleValuesFromStyle(
  style: XlsxResolvedCellStyle | null
): XlsxFontToggleValue[] {
  const font = asResolvedStyleGroup(style?.font)
  const values: XlsxFontToggleValue[] = []

  if (font?.bold === true) values.push("bold")
  if (font?.italic === true) values.push("italic")
  if (font?.underline && font.underline !== "none") values.push("underline")
  if (font?.strikethrough === true) values.push("strikethrough")

  return values
}

function getFontFamilyValue(style: XlsxResolvedCellStyle | null) {
  const font = asResolvedStyleGroup(style?.font)
  const fontName = font?.name

  return typeof fontName === "string" && fontName.trim()
    ? fontName.trim()
    : undefined
}

function getHorizontalAlignmentValue(
  style: XlsxResolvedCellStyle | null
): HorizontalAlignmentToggleValue[] {
  const alignment = asResolvedStyleGroup(style?.alignment)
  const horizontal = alignment?.horizontal

  return horizontal === "left" ||
    horizontal === "center" ||
    horizontal === "right"
    ? [horizontal]
    : []
}

function getVerticalAlignmentValue(
  style: XlsxResolvedCellStyle | null
): VerticalAlignmentToggleValue[] {
  const alignment = asResolvedStyleGroup(style?.alignment)
  const vertical = alignment?.vertical

  if (vertical === undefined || vertical === null) return ["bottom"]

  return vertical === "top" || vertical === "center" || vertical === "bottom"
    ? [vertical]
    : []
}

function getNumberFormatValue(style: XlsxResolvedCellStyle | null) {
  const numberFormat = asResolvedStyleGroup(style?.numberFormat)

  if (!numberFormat) return GENERAL_NUMBER_FORMAT_VALUE

  const formatType = numberFormat.formatType
  const formatString =
    typeof numberFormat.formatString === "string"
      ? numberFormat.formatString.trim()
      : ""
  const id = getNumericValue(numberFormat.id)

  if (formatString) {
    const matchingOption = NUMBER_FORMAT_OPTIONS.find(
      (option) => option.formatString === formatString
    )

    return matchingOption?.value ?? formatString
  }
  if (formatType === "builtin" && id !== undefined) {
    const matchingOption = NUMBER_FORMAT_OPTIONS.find(
      (option) => option.id === id
    )

    if (matchingOption) return matchingOption.value

    return `${BUILTIN_NUMBER_FORMAT_VALUE_PREFIX}${id}`
  }
  if (formatType === "general") return GENERAL_NUMBER_FORMAT_VALUE

  return GENERAL_NUMBER_FORMAT_VALUE
}

function getNumberFormatLabel(value: string) {
  if (value === GENERAL_NUMBER_FORMAT_VALUE) return "General"

  const matchingOption = NUMBER_FORMAT_OPTIONS.find(
    (option) => option.value === value
  )
  if (matchingOption) return matchingOption.label

  if (value.startsWith(BUILTIN_NUMBER_FORMAT_VALUE_PREFIX)) {
    return `Builtin ${value.slice(BUILTIN_NUMBER_FORMAT_VALUE_PREFIX.length)}`
  }

  return value
}

function getNumberFormatIcon(value: string) {
  return (
    NUMBER_FORMAT_OPTIONS.find((option) => option.value === value)?.icon ??
    TextNumberSignIcon
  )
}

function createNumberFormatStyle(value: string): XlsxCellStyleInput {
  const matchingOption = NUMBER_FORMAT_OPTIONS.find(
    (option) => option.value === value
  )

  if (matchingOption) {
    return {
      numberFormat: {
        formatString: matchingOption.formatString,
        formatType: matchingOption.formatType,
        id: matchingOption.id,
      },
    }
  }

  if (value.startsWith(BUILTIN_NUMBER_FORMAT_VALUE_PREFIX)) {
    const id = Number(value.slice(BUILTIN_NUMBER_FORMAT_VALUE_PREFIX.length))

    if (Number.isFinite(id)) {
      return {
        numberFormat: {
          formatType: "builtin",
          id: Math.max(0, Math.trunc(id)),
        },
      }
    }
  }

  return {
    numberFormat: {
      formatString: value,
      formatType: "custom",
    },
  }
}

function normalizeCellRange(range: XlsxCellRange): XlsxCellRange {
  return {
    start: {
      row: Math.min(range.start.row, range.end.row),
      col: Math.min(range.start.col, range.end.col),
    },
    end: {
      row: Math.max(range.start.row, range.end.row),
      col: Math.max(range.start.col, range.end.col),
    },
  }
}

function getNumericValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : undefined
}

function getWorksheetMergeRegions(
  worksheet: XlsxWorksheetWithMergeRegions | null
): XlsxMergeRegion[] {
  if (!Array.isArray(worksheet?.mergedRegions)) return []

  return worksheet.mergedRegions.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []

    const region = entry as Record<string, unknown>
    const start = asResolvedStyleGroup(region.start)
    const end = asResolvedStyleGroup(region.end)
    const startRow = getNumericValue(region.startRow ?? start?.row)
    const startCol = getNumericValue(region.startCol ?? start?.col)
    const endRow = getNumericValue(region.endRow ?? end?.row)
    const endCol = getNumericValue(region.endCol ?? end?.col)

    if (
      startRow === undefined ||
      startCol === undefined ||
      endRow === undefined ||
      endCol === undefined
    ) {
      return []
    }

    return [
      normalizeCellRange({
        start: { row: startRow, col: startCol },
        end: { row: endRow, col: endCol },
      }),
    ]
  })
}

function rangesIntersect(
  firstRange: XlsxCellRange,
  secondRange: XlsxCellRange
) {
  const first = normalizeCellRange(firstRange)
  const second = normalizeCellRange(secondRange)

  return (
    first.start.row <= second.end.row &&
    first.end.row >= second.start.row &&
    first.start.col <= second.end.col &&
    first.end.col >= second.start.col
  )
}

function isSingleCellRange(range: XlsxCellRange) {
  const normalizedRange = normalizeCellRange(range)

  return (
    normalizedRange.start.row === normalizedRange.end.row &&
    normalizedRange.start.col === normalizedRange.end.col
  )
}

function getCellColumnLabel(col: number) {
  let label = ""
  let value = col

  do {
    label = String.fromCharCode(65 + (value % 26)) + label
    value = Math.floor(value / 26) - 1
  } while (value >= 0)

  return label
}

function cellAddressToA1(cell: XlsxCellRange["start"]) {
  return `${getCellColumnLabel(cell.col)}${cell.row + 1}`
}

function rangeToA1(range: XlsxCellRange) {
  const normalizedRange = normalizeCellRange(range)

  return `${cellAddressToA1(normalizedRange.start)}:${cellAddressToA1(
    normalizedRange.end
  )}`
}

function getRangeKey(range: XlsxCellRange) {
  const normalizedRange = normalizeCellRange(range)

  return `${normalizedRange.start.row}:${normalizedRange.start.col}:${normalizedRange.end.row}:${normalizedRange.end.col}`
}

function createBorderEdge(
  color = DEFAULT_BORDER_COLOR
): XlsxCellBorderEdgeInput {
  return {
    color: toXlsxRgbColor(color),
    style: "thin",
  }
}

function createBorderPatch(
  entries: Partial<Record<XlsxBorderEdgeKey, XlsxCellBorderEdgeInput>>
): XlsxCellStyleInput {
  return {
    border: entries,
  }
}

function createNoBorderPatch(): XlsxCellStyleInput {
  return {
    border: {
      bottom: { style: "none" },
      left: { style: "none" },
      right: { style: "none" },
      top: { style: "none" },
    },
  }
}

function createBorderOptions(): BorderOption[] {
  return [
    {
      action: "bottom",
      icon: BorderBottom01Icon,
      label: "Bottom border",
    },
    {
      action: "left",
      icon: BorderLeft01Icon,
      label: "Left border",
    },
    {
      action: "top",
      icon: BorderTop01Icon,
      label: "Top border",
    },
    {
      action: "right",
      icon: BorderRight01Icon,
      label: "Right border",
    },
    {
      action: "all",
      icon: BorderAll01Icon,
      label: "All borders",
    },
    {
      action: "outside",
      icon: BorderAll01Icon,
      label: "Outside border",
    },
    {
      action: "none",
      icon: BorderNone01Icon,
      label: "No border",
    },
  ]
}

function getBorderEdgeRange(
  range: XlsxCellRange,
  edgeKey: XlsxBorderEdgeKey
): XlsxCellRange {
  const normalizedRange = normalizeCellRange(range)

  if (edgeKey === "top") {
    return {
      start: normalizedRange.start,
      end: { row: normalizedRange.start.row, col: normalizedRange.end.col },
    }
  }

  if (edgeKey === "bottom") {
    return {
      start: { row: normalizedRange.end.row, col: normalizedRange.start.col },
      end: normalizedRange.end,
    }
  }

  if (edgeKey === "left") {
    return {
      start: normalizedRange.start,
      end: { row: normalizedRange.end.row, col: normalizedRange.start.col },
    }
  }

  return {
    start: { row: normalizedRange.start.row, col: normalizedRange.end.col },
    end: normalizedRange.end,
  }
}

function ToolbarTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

function EditorLoadingSurface({
  showSpinner = true,
}: {
  showSpinner?: boolean
}) {
  return (
    <div className="grid h-full min-h-52 w-full min-w-full place-items-center bg-transparent">
      {showSpinner ? <Spinner className="size-4" /> : null}
    </div>
  )
}

function ToolbarIconButton({
  active,
  children,
  label,
  ...props
}: React.ComponentProps<typeof Button> & {
  active?: boolean
  label: string
}) {
  return (
    <ToolbarTooltip label={label}>
      <Button
        type="button"
        variant={active ? "secondary" : "ghost"}
        size="icon-sm"
        aria-label={label}
        data-pressed={active ? "" : undefined}
        {...props}
      >
        {children}
      </Button>
    </ToolbarTooltip>
  )
}

function ToolbarSeparator() {
  return <Separator orientation="vertical" className="mx-1 h-4 self-center" />
}

function StyleDropdownItem({
  children,
  icon,
  onClick,
}: {
  children: React.ReactNode
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
  onClick: () => void
}) {
  return (
    <DropdownMenuItem onClick={onClick}>
      <HugeiconsIcon icon={icon} className="size-4" />
      {children}
    </DropdownMenuItem>
  )
}

function MergeCellsMenu({
  canMerge,
  canMergeAcross,
  canUnmerge,
  disabled,
  isMerged,
  onMergeAcross,
  onMergeAndCenter,
  onMergeCells,
  onUnmergeCells,
}: {
  canMerge: boolean
  canMergeAcross: boolean
  canUnmerge: boolean
  disabled: boolean
  isMerged: boolean
  onMergeAcross: () => void
  onMergeAndCenter: () => void
  onMergeCells: () => void
  onUnmergeCells: () => void
}) {
  return (
    <DropdownMenu>
      <div
        className={cn(
          "inline-flex shrink-0 overflow-hidden rounded-lg border border-transparent"
        )}
      >
        <ToolbarTooltip
          label={isMerged ? "Unmerge cells from the menu" : "Merge & Center"}
        >
          <Button
            type="button"
            variant={isMerged ? "secondary" : "ghost"}
            size="sm"
            aria-label="Merge & Center"
            className="h-7 rounded-r-none border-0 px-2.5 before:rounded-r-none"
            data-pressed={isMerged ? "" : undefined}
            disabled={disabled || !canMerge}
            onClick={onMergeAndCenter}
          >
            <HugeiconsIcon icon={PathfinderMergeIcon} className="size-4" />
            <span className="hidden text-xs font-medium lg:inline">
              Merge & Center
            </span>
          </Button>
        </ToolbarTooltip>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant={isMerged ? "secondary" : "ghost"}
            size="icon-sm"
            aria-label="Merge cells options"
            className="h-7 w-6 rounded-l-none border-0 px-0 before:rounded-l-none"
            data-pressed={isMerged ? "" : undefined}
            disabled={disabled}
          >
            <HugeiconsIcon
              icon={ChevronDownIcon}
              className="size-3.5 opacity-100"
            />
          </Button>
        </DropdownMenuTrigger>
      </div>
      <DropdownMenuContent
        align="start"
        className={cn("w-56", XLSX_DROPDOWN_Z_INDEX_CLASS)}
      >
        <DropdownMenuItem disabled={!canMerge} onClick={onMergeAndCenter}>
          <HugeiconsIcon icon={PathfinderMergeIcon} className="size-4" />
          Merge & Center
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canMergeAcross} onClick={onMergeAcross}>
          <HugeiconsIcon icon={TableRowsSplitIcon} className="size-4" />
          Merge Across
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canMerge} onClick={onMergeCells}>
          <HugeiconsIcon icon={CellsIcon} className="size-4" />
          Merge Cells
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={!canUnmerge} onClick={onUnmergeCells}>
          <HugeiconsIcon icon={Grid2X2XIcon} className="size-4" />
          Unmerge Cells
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NumberFormatSelect({
  disabled,
  onApplyStyle,
  value,
}: {
  disabled: boolean
  onApplyStyle: (style: XlsxCellStyleInput) => void
  value: string
}) {
  const hasMatchingOption = NUMBER_FORMAT_OPTIONS.some(
    (option) => option.value === value
  )
  const currentLabel = getNumberFormatLabel(value)
  const CurrentIcon = getNumberFormatIcon(value)

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (!nextValue) return
        onApplyStyle(createNumberFormatStyle(nextValue))
      }}
      disabled={disabled}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          "w-[132px] min-w-[132px]",
          XLSX_EDITOR_SELECT_CHROME_CLASS
        )}
        aria-label="Number format"
      >
        <HugeiconsIcon icon={CurrentIcon} className="size-4" />
        <SelectValue placeholder="General" />
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className={XLSX_DROPDOWN_Z_INDEX_CLASS}
      >
        {NUMBER_FORMAT_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex min-w-0 items-center gap-2">
              <HugeiconsIcon icon={option.icon} className="size-4" />
              <span className="truncate">{option.label}</span>
            </span>
          </SelectItem>
        ))}
        {!hasMatchingOption && value !== GENERAL_NUMBER_FORMAT_VALUE ? (
          <SelectItem value={value}>
            <span className="flex min-w-0 items-center gap-2">
              <HugeiconsIcon icon={CurrentIcon} className="size-4" />
              <span className="truncate">{currentLabel}</span>
            </span>
          </SelectItem>
        ) : null}
      </SelectContent>
    </Select>
  )
}

function BorderMenu({
  borderColor,
  disabled,
  onApplyBorder,
  onBorderColorChange,
}: {
  borderColor: string
  disabled: boolean
  onApplyBorder: (action: XlsxBorderAction) => void
  onBorderColorChange: (color: string) => void
}) {
  const borderOptions = React.useMemo(() => createBorderOptions(), [])
  const edgeBorderOptions = borderOptions.filter(
    (option) =>
      option.action === "bottom" ||
      option.action === "left" ||
      option.action === "top" ||
      option.action === "right"
  )
  const groupedBorderOptions = borderOptions.filter(
    (option) =>
      option.action === "all" ||
      option.action === "outside" ||
      option.action === "none"
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="Cell borders"
          className="relative"
        >
          <HugeiconsIcon icon={BorderAll01Icon} className="size-4" />
          <span
            className="absolute right-1 bottom-1 h-1 w-4 rounded-full border border-background"
            style={{ backgroundColor: borderColor }}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("w-48", XLSX_DROPDOWN_Z_INDEX_CLASS)}
      >
        {edgeBorderOptions.map((option) => (
          <StyleDropdownItem
            key={option.label}
            icon={option.icon}
            onClick={() => onApplyBorder(option.action)}
          >
            {option.label}
          </StyleDropdownItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {groupedBorderOptions.map((option) => (
            <StyleDropdownItem
              key={option.label}
              icon={option.icon}
              onClick={() => onApplyBorder(option.action)}
            >
              {option.label}
            </StyleDropdownItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <HugeiconsIcon
              icon={TextColorIcon}
              className="size-4 text-muted-foreground"
            />
            Border color
            <span
              className="h-3 w-5 rounded-full border border-border"
              style={{ backgroundColor: borderColor }}
            />
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className={cn("w-64 p-2", XLSX_DROPDOWN_Z_INDEX_CLASS)}
          >
            <ColorPickerPanel
              label="Border color"
              color={borderColor}
              onChange={(color) =>
                onBorderColorChange(normalizeHexColor(color))
              }
            />
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function AlignmentMoreMenu({
  disabled,
  onApplyStyle,
}: {
  disabled: boolean
  onApplyStyle: (style: XlsxCellStyleInput) => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={disabled}
          aria-label="More alignment"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className={cn("w-48", XLSX_DROPDOWN_Z_INDEX_CLASS)}
      >
        <StyleDropdownItem
          icon={TextWrapIcon}
          onClick={() => onApplyStyle({ alignment: { wrapText: false } })}
        >
          Do not wrap
        </StyleDropdownItem>
        <StyleDropdownItem
          icon={TextWrapIcon}
          onClick={() => onApplyStyle({ alignment: { shrinkToFit: true } })}
        >
          Shrink to fit
        </StyleDropdownItem>
        <StyleDropdownItem
          icon={TextWrapIcon}
          onClick={() => onApplyStyle({ alignment: { shrinkToFit: false } })}
        >
          Do not shrink
        </StyleDropdownItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EditorFileActionsMenu({
  canExport,
  exportXlsx,
  onUploadClick,
}: {
  canExport: boolean
  exportXlsx: () => void
  onUploadClick: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Open workbook actions"
        >
          <HugeiconsIcon icon={MoreHorizontalIcon} className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={cn("w-40", XLSX_DROPDOWN_Z_INDEX_CLASS)}
      >
        <DropdownMenuItem disabled={!canExport} onClick={exportXlsx}>
          <HugeiconsIcon icon={Download01Icon} className="size-4" />
          Download
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onUploadClick}>
          <HugeiconsIcon icon={Upload01Icon} className="size-4" />
          Upload
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EditorToolbar({
  isDark,
  onIsDarkChange,
  onUploadClick,
  showNightRenderToggle,
}: {
  isDark: boolean
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  showNightRenderToggle: boolean
}) {
  const {
    activeSheet,
    activeSheetIndex,
    canExport,
    exportXlsx,
    getActiveWorksheet,
    revision,
    setActiveSheetIndex,
    sheets,
  } = useXlsxViewer()
  const { activeCell, activeCellAddress, selectRange, selection } =
    useXlsxViewerSelection()
  const {
    addSheet,
    canRedo,
    canUndo,
    mergeSelection,
    pasteStructuredClipboardData,
    readOnly,
    redo,
    removeActiveSheet,
    selectedFormula,
    selectedValue,
    setCellStyle,
    setCellFormula,
    setCellValue,
    setRangeStyle,
    undo,
    unmergeSelection,
  } = useXlsxViewerEditing()
  const { canZoomIn, canZoomOut, setZoomScale, zoomIn, zoomOut, zoomScale } =
    useXlsxViewerZoom()
  const [formulaDraft, setFormulaDraft] = React.useState("")
  const [formulaFocused, setFormulaFocused] = React.useState(false)
  const [fontFamily, setFontFamily] = React.useState(DEFAULT_FONT_FAMILY)
  const [fontSize, setFontSize] = React.useState(11)
  const [textColor, setTextColor] = React.useState(DEFAULT_TEXT_COLOR)
  const [fillColor, setFillColor] = React.useState(DEFAULT_FILL_COLOR)
  const [borderColor, setBorderColor] = React.useState(DEFAULT_BORDER_COLOR)
  const [appliedMergeRegions, setAppliedMergeRegions] = React.useState<
    XlsxMergeRegion[]
  >([])
  const formulaEditCellRef = React.useRef<typeof activeCell>(null)
  const formulaInitialValueRef = React.useRef("")
  const hasWorkbook = sheets.length > 0
  const hasSelection = Boolean(selection)
  const hasActiveCell = Boolean(activeCell)
  const canStyleSelection = (hasSelection || hasActiveCell) && !readOnly
  const activeRange = React.useMemo<XlsxCellRange | null>(() => {
    if (selection) return normalizeCellRange(selection)
    if (!activeCell) return null

    return {
      start: activeCell,
      end: activeCell,
    }
  }, [activeCell, selection])
  const worksheetMergeRegions = React.useMemo(() => {
    void revision

    return getWorksheetMergeRegions(
      getActiveWorksheet() as XlsxWorksheetWithMergeRegions | null
    )
  }, [getActiveWorksheet, revision])
  const mergeRegions = React.useMemo(
    () => [...worksheetMergeRegions, ...appliedMergeRegions],
    [appliedMergeRegions, worksheetMergeRegions]
  )
  const selectionIntersectsMerge = Boolean(
    activeRange &&
      mergeRegions.some((mergeRegion) =>
        rangesIntersect(activeRange, mergeRegion)
      )
  )

  React.useEffect(() => {
    if (
      appliedMergeRegions.length === 0 ||
      worksheetMergeRegions.length === 0
    ) {
      return
    }

    setAppliedMergeRegions((currentRegions) =>
      currentRegions.filter(
        (currentRegion) =>
          !worksheetMergeRegions.some((worksheetRegion) =>
            rangesIntersect(currentRegion, worksheetRegion)
          )
      )
    )
  }, [appliedMergeRegions.length, worksheetMergeRegions])

  React.useEffect(() => {
    setAppliedMergeRegions([])
  }, [activeSheetIndex])
  const selectionIsSingleCell = activeRange
    ? isSingleCellRange(activeRange)
    : true
  const selectionSpansMultipleColumns = activeRange
    ? activeRange.start.col !== activeRange.end.col
    : false
  const canMergeSelectedCells = Boolean(
    selection &&
      !readOnly &&
      !selectionIntersectsMerge &&
      !selectionIsSingleCell
  )
  const canMergeAcross = Boolean(
    selection &&
      !readOnly &&
      !selectionIntersectsMerge &&
      selectionSpansMultipleColumns
  )
  const canUnmergeSelectedCells = Boolean(
    selection && !readOnly && selectionIntersectsMerge
  )
  const currentZoom = Math.round(zoomScale)
  const selectedCellInputValue = selectedFormula || selectedValue

  React.useEffect(() => {
    if (formulaFocused) return
    setFormulaDraft(selectedCellInputValue)
  }, [formulaFocused, selectedCellInputValue, activeCellAddress])

  const activeCellStyle = React.useMemo(() => {
    // Worksheet style objects are mutable; revision invalidates this read after edits.
    void revision

    if (!activeCell) return null

    const worksheet = getActiveWorksheet()
    const inheritedStyle = resolveInheritedCellStyle(
      activeSheet,
      activeCell.row,
      activeCell.col
    )
    const cellStyle = worksheet?.getCellStyleAt(
      activeCell.row,
      activeCell.col
    ) as XlsxResolvedCellStyle | null | undefined

    return mergeResolvedCellStyle(inheritedStyle, cellStyle)
  }, [activeCell, activeSheet, getActiveWorksheet, revision])
  const fontToggleValues = React.useMemo(
    () => getFontToggleValuesFromStyle(activeCellStyle),
    [activeCellStyle]
  )
  const fontFamilyValue = getFontFamilyValue(activeCellStyle) ?? fontFamily
  const horizontalAlignmentValue = React.useMemo(
    () => getHorizontalAlignmentValue(activeCellStyle),
    [activeCellStyle]
  )
  const verticalAlignmentValue = React.useMemo(
    () => getVerticalAlignmentValue(activeCellStyle),
    [activeCellStyle]
  )
  const numberFormatValue = React.useMemo(
    () => getNumberFormatValue(activeCellStyle),
    [activeCellStyle]
  )

  const commitFormula = React.useCallback(() => {
    const targetCell = formulaEditCellRef.current ?? activeCell
    if (!targetCell) return
    if (formulaDraft === formulaInitialValueRef.current) return

    if (formulaDraft.trim().startsWith("=")) {
      setCellFormula(targetCell, formulaDraft)
    } else {
      setCellValue(targetCell, formulaDraft)
    }
    formulaInitialValueRef.current = formulaDraft
  }, [activeCell, formulaDraft, setCellFormula, setCellValue])

  const applyStyle = React.useCallback(
    (style: XlsxCellStyleInput) => {
      if (!activeRange) return

      const normalizedRange = normalizeCellRange(activeRange)
      const targetRanges = [
        normalizedRange,
        ...mergeRegions.filter((mergeRegion) =>
          rangesIntersect(normalizedRange, mergeRegion)
        ),
      ]
      const uniqueTargetRanges = new Map<string, XlsxCellRange>()

      targetRanges.forEach((targetRange) => {
        const normalizedTargetRange = normalizeCellRange(targetRange)
        uniqueTargetRanges.set(
          getRangeKey(normalizedTargetRange),
          normalizedTargetRange
        )
      })

      uniqueTargetRanges.forEach((targetRange) => {
        setRangeStyle(targetRange, style)
      })
    },
    [activeRange, mergeRegions, setRangeStyle]
  )

  const applyBorderAction = React.useCallback(
    (action: XlsxBorderAction) => {
      if (!activeRange) return

      const normalizedRange = normalizeCellRange(activeRange)
      const edge = createBorderEdge(borderColor)
      const allBorderPatch = createBorderPatch({
        bottom: edge,
        left: edge,
        right: edge,
        top: edge,
      })

      if (action === "all") {
        setRangeStyle(normalizedRange, allBorderPatch)
        return
      }

      if (action === "none") {
        setRangeStyle(normalizedRange, createNoBorderPatch())
        return
      }

      if (action === "outside") {
        if (isSingleCellRange(normalizedRange)) {
          setCellStyle(normalizedRange.start, allBorderPatch)
          return
        }

        const outsideEdgeKeys: XlsxBorderEdgeKey[] = [
          "top",
          "bottom",
          "left",
          "right",
        ]

        outsideEdgeKeys.forEach((edgeKey) => {
          setRangeStyle(
            getBorderEdgeRange(normalizedRange, edgeKey),
            createBorderPatch({ [edgeKey]: edge })
          )
        })
        return
      }

      setRangeStyle(
        getBorderEdgeRange(normalizedRange, action),
        createBorderPatch({ [action]: edge })
      )
    },
    [activeRange, borderColor, setCellStyle, setRangeStyle]
  )

  const applyHorizontalAlignment = React.useCallback(
    (horizontal: HorizontalAlignmentToggleValue | undefined) => {
      if (!horizontal) return

      applyStyle({ alignment: { horizontal } })
    },
    [applyStyle]
  )

  const applyVerticalAlignment = React.useCallback(
    (vertical: VerticalAlignmentToggleValue | undefined) => {
      if (!vertical) return

      applyStyle({ alignment: { vertical } })
    },
    [applyStyle]
  )

  const mergeSelectedCells = React.useCallback(() => {
    if (!canMergeSelectedCells || !selection) return

    setAppliedMergeRegions([normalizeCellRange(selection)])
    mergeSelection()
  }, [canMergeSelectedCells, mergeSelection, selection])

  const mergeAcrossSelectedCells = React.useCallback(() => {
    if (!activeCell || !canMergeAcross || !selection) return

    const normalizedRange = normalizeCellRange(selection)
    const worksheet = getActiveWorksheet()
    if (!worksheet) return

    const formula = worksheet.getFormulaAt(activeCell.row, activeCell.col)
    const rawValue = worksheet.getCellAt(activeCell.row, activeCell.col).toJs()
    const colSpan = normalizedRange.end.col - normalizedRange.start.col + 1
    const rowSpan = normalizedRange.end.row - normalizedRange.start.row + 1
    const merges = Array.from({ length: rowSpan }, (_, rowOffset) => ({
      colOffset: normalizedRange.start.col - activeCell.col,
      colSpan,
      rowOffset: normalizedRange.start.row + rowOffset - activeCell.row,
      rowSpan: 1,
    }))
    const mergeRegionsByRow = Array.from({ length: rowSpan }, (_, rowOffset) =>
      normalizeCellRange({
        start: {
          col: normalizedRange.start.col,
          row: normalizedRange.start.row + rowOffset,
        },
        end: {
          col: normalizedRange.end.col,
          row: normalizedRange.start.row + rowOffset,
        },
      })
    )

    const didPaste = pasteStructuredClipboardData(
      JSON.stringify({
        cells: [
          formula
            ? { colOffset: 0, formula, rowOffset: 0 }
            : { colOffset: 0, rowOffset: 0, value: rawValue ?? "" },
        ],
        cols: colSpan,
        merges,
        rows: rowSpan,
      })
    )

    if (!didPaste) return

    setAppliedMergeRegions(mergeRegionsByRow)
    selectRange(normalizedRange)
  }, [
    activeCell,
    canMergeAcross,
    getActiveWorksheet,
    pasteStructuredClipboardData,
    selectRange,
    selection,
  ])

  const mergeAndCenterSelectedCells = React.useCallback(() => {
    if (!canMergeSelectedCells || !selection) return

    setAppliedMergeRegions([normalizeCellRange(selection)])
    setRangeStyle(selection, { alignment: { horizontal: "center" } })
    mergeSelection()
  }, [canMergeSelectedCells, mergeSelection, selection, setRangeStyle])

  const unmergeSelectedCells = React.useCallback(() => {
    if (!canUnmergeSelectedCells || !activeRange) return

    const worksheet =
      getActiveWorksheet() as XlsxWorksheetWithMergeRegions | null
    if (!worksheet?.unmergeCells) return

    const normalizedRange = normalizeCellRange(activeRange)
    const uniqueMergeRegions = new Map<string, XlsxMergeRegion>()

    ;[...worksheetMergeRegions, ...appliedMergeRegions].forEach(
      (mergeRegion) => {
        if (!rangesIntersect(normalizedRange, mergeRegion)) return

        uniqueMergeRegions.set(getRangeKey(mergeRegion), mergeRegion)
      }
    )

    let didUnmerge = false

    uniqueMergeRegions.forEach((mergeRegion) => {
      didUnmerge =
        worksheet.unmergeCells?.(rangeToA1(mergeRegion)) || didUnmerge
    })

    if (!didUnmerge) {
      unmergeSelection()
      return
    }

    setAppliedMergeRegions([])
    setRangeStyle(normalizedRange, {})
    selectRange(normalizedRange)
  }, [
    activeRange,
    appliedMergeRegions,
    canUnmergeSelectedCells,
    getActiveWorksheet,
    selectRange,
    setRangeStyle,
    unmergeSelection,
    worksheetMergeRegions,
  ])

  const applyFontToggleValues = React.useCallback(
    (nextValues: XlsxFontToggleValue[]) => {
      const previousValues = fontToggleValues
      const changedValue =
        nextValues.find((value) => !previousValues.includes(value)) ??
        previousValues.find((value) => !nextValues.includes(value))

      if (!changedValue) return

      const isPressed = nextValues.includes(changedValue)

      if (changedValue === "bold") {
        applyStyle({ font: { bold: isPressed } })
      } else if (changedValue === "italic") {
        applyStyle({ font: { italic: isPressed } })
      } else if (changedValue === "underline") {
        applyStyle({ font: { underline: isPressed ? "single" : "none" } })
      } else if (changedValue === "strikethrough") {
        applyStyle({ font: { strikethrough: isPressed } })
      }
    },
    [applyStyle, fontToggleValues]
  )

  return (
    <div className="border-b bg-background">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b px-3">
        <div className="min-w-0 flex-1" />
        <TooltipProvider>
          <div className="flex shrink-0 items-center gap-1">
            {showNightRenderToggle ? (
              <>
                <ToolbarTooltip
                  label={isDark ? "Use light workbook" : "Use dark workbook"}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      isDark ? "Use light workbook" : "Use dark workbook"
                    }
                    onClick={() => onIsDarkChange(!isDark)}
                  >
                    <HugeiconsIcon
                      icon={isDark ? Sun03Icon : Moon02Icon}
                      className="size-4"
                    />
                  </Button>
                </ToolbarTooltip>
                <Separator
                  orientation="vertical"
                  className="mx-1 h-4 self-center"
                />
              </>
            ) : null}
            <EditorFileActionsMenu
              canExport={canExport}
              exportXlsx={exportXlsx}
              onUploadClick={onUploadClick}
            />
          </div>
        </TooltipProvider>
      </div>
      <TooltipProvider>
        <div className="flex min-h-12 flex-wrap items-center gap-2 border-b bg-background px-3 py-2">
          <div className="flex shrink-0 items-center gap-1">
            <ToolbarTooltip label="Undo">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
                disabled={!canUndo || readOnly}
                onClick={undo}
              >
                <HugeiconsIcon icon={Undo02Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Redo">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
                disabled={!canRedo || readOnly}
                onClick={redo}
              >
                <HugeiconsIcon icon={Redo02Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
          </div>
          <ToolbarSeparator />
          <div className="flex shrink-0 items-center gap-1">
            <Select
              value={fontFamilyValue}
              onValueChange={(value) => {
                setFontFamily(value)
                applyStyle({ font: { name: value } })
              }}
              disabled={!canStyleSelection}
              modal={false}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  "w-[132px] min-w-[132px]",
                  XLSX_EDITOR_SELECT_CHROME_CLASS
                )}
                aria-label="Font family"
              >
                <SelectValue placeholder="Font">{fontFamilyValue}</SelectValue>
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className={XLSX_DROPDOWN_Z_INDEX_CLASS}
              >
                {FONT_FAMILIES.map((option) => (
                  <SelectItem key={option} value={option}>
                    <span style={{ fontFamily: option }}>{option}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(fontSize)}
              onValueChange={(value) => {
                const nextFontSize = Number(value)
                if (!Number.isFinite(nextFontSize)) return

                setFontSize(nextFontSize)
                applyStyle({ font: { size: nextFontSize } })
              }}
              disabled={!canStyleSelection}
              modal={false}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  "w-[78px] min-w-[78px]",
                  XLSX_EDITOR_SELECT_CHROME_CLASS
                )}
                aria-label="Font size"
              >
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent
                align="start"
                alignItemWithTrigger={false}
                className={XLSX_DROPDOWN_Z_INDEX_CLASS}
              >
                {FONT_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size} pt
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ToolbarSeparator />
          <ToggleGroup
            className="shrink-0"
            disabled={!canStyleSelection}
            multiple
            spacing="default"
            value={fontToggleValues}
            onValueChange={(value) =>
              applyFontToggleValues(value as XlsxFontToggleValue[])
            }
          >
            <ToolbarTooltip label="Bold">
              <ToggleGroupItem aria-label="Bold" size="sm" value="bold">
                <HugeiconsIcon icon={TextBoldIcon} className="size-4" />
              </ToggleGroupItem>
            </ToolbarTooltip>
            <ToolbarTooltip label="Italic">
              <ToggleGroupItem aria-label="Italic" size="sm" value="italic">
                <HugeiconsIcon icon={TextItalicIcon} className="size-4" />
              </ToggleGroupItem>
            </ToolbarTooltip>
            <ToolbarTooltip label="Underline">
              <ToggleGroupItem
                aria-label="Underline"
                size="sm"
                value="underline"
              >
                <HugeiconsIcon icon={TextUnderlineIcon} className="size-4" />
              </ToggleGroupItem>
            </ToolbarTooltip>
            <ToolbarTooltip label="Strikethrough">
              <ToggleGroupItem
                aria-label="Strikethrough"
                size="sm"
                value="strikethrough"
              >
                <HugeiconsIcon
                  icon={TextStrikethroughIcon}
                  className="size-4"
                />
              </ToggleGroupItem>
            </ToolbarTooltip>
          </ToggleGroup>
          <ToolbarSeparator />
          <div className="flex shrink-0 items-center gap-1">
            <ColorPicker
              label="Text color"
              icon={TextColorIcon}
              color={textColor}
              disabled={!canStyleSelection}
              onChange={(color) => {
                const nextColor = normalizeHexColor(color)
                setTextColor(nextColor)
                applyStyle({ font: { color: toXlsxRgbColor(nextColor) } })
              }}
            />
            <ColorPicker
              label="Fill color"
              icon={PaintBucketIcon}
              color={fillColor}
              disabled={!canStyleSelection}
              onChange={(color) => {
                const nextColor = normalizeHexColor(color, DEFAULT_FILL_COLOR)
                setFillColor(nextColor)
                applyStyle({
                  fill: {
                    color: toXlsxRgbColor(nextColor),
                    fillType: "solid",
                  },
                })
              }}
            />
            <ToolbarIconButton
              label="No fill"
              disabled={!canStyleSelection}
              onClick={() => applyStyle({ fill: { fillType: "none" } })}
            >
              <HugeiconsIcon icon={DropletOffIcon} className="size-4" />
            </ToolbarIconButton>
          </div>
          <ToolbarSeparator />
          <div className="flex shrink-0 items-center gap-1">
            <ToggleGroup
              className="shrink-0"
              disabled={!canStyleSelection}
              spacing="default"
              value={horizontalAlignmentValue}
            >
              <ToolbarTooltip label="Align left">
                <ToggleGroupItem
                  aria-label="Align left"
                  size="sm"
                  value="left"
                  onClick={() => applyHorizontalAlignment("left")}
                >
                  <HugeiconsIcon
                    icon={TextAlignLeft01Icon}
                    className="size-4"
                  />
                </ToggleGroupItem>
              </ToolbarTooltip>
              <ToolbarTooltip label="Align center">
                <ToggleGroupItem
                  aria-label="Align center"
                  size="sm"
                  value="center"
                  onClick={() => applyHorizontalAlignment("center")}
                >
                  <HugeiconsIcon
                    icon={TextAlignCenterIcon}
                    className="size-4"
                  />
                </ToggleGroupItem>
              </ToolbarTooltip>
              <ToolbarTooltip label="Align right">
                <ToggleGroupItem
                  aria-label="Align right"
                  size="sm"
                  value="right"
                  onClick={() => applyHorizontalAlignment("right")}
                >
                  <HugeiconsIcon
                    icon={TextAlignRight01Icon}
                    className="size-4"
                  />
                </ToggleGroupItem>
              </ToolbarTooltip>
            </ToggleGroup>
            <ToggleGroup
              className="shrink-0"
              disabled={!canStyleSelection}
              spacing="default"
              value={verticalAlignmentValue}
            >
              <ToolbarTooltip label="Align top">
                <ToggleGroupItem
                  aria-label="Align top"
                  size="sm"
                  value="top"
                  onClick={() => applyVerticalAlignment("top")}
                >
                  <HugeiconsIcon
                    icon={AlignBoxTopCenterIcon}
                    className="size-4"
                  />
                </ToggleGroupItem>
              </ToolbarTooltip>
              <ToolbarTooltip label="Align middle">
                <ToggleGroupItem
                  aria-label="Align middle"
                  size="sm"
                  value="center"
                  onClick={() => applyVerticalAlignment("center")}
                >
                  <HugeiconsIcon
                    icon={AlignBoxMiddleCenterIcon}
                    className="size-4"
                  />
                </ToggleGroupItem>
              </ToolbarTooltip>
              <ToolbarTooltip label="Align bottom">
                <ToggleGroupItem
                  aria-label="Align bottom"
                  size="sm"
                  value="bottom"
                  onClick={() => applyVerticalAlignment("bottom")}
                >
                  <HugeiconsIcon
                    icon={AlignBoxBottomCenterIcon}
                    className="size-4"
                  />
                </ToggleGroupItem>
              </ToolbarTooltip>
            </ToggleGroup>
            <ToolbarIconButton
              label="Wrap text"
              disabled={!canStyleSelection}
              onClick={() => applyStyle({ alignment: { wrapText: true } })}
            >
              <HugeiconsIcon icon={TextWrapIcon} className="size-4" />
            </ToolbarIconButton>
            <AlignmentMoreMenu
              disabled={!canStyleSelection}
              onApplyStyle={applyStyle}
            />
          </div>
          <ToolbarSeparator />
          <div className="flex shrink-0 items-center gap-1">
            <NumberFormatSelect
              disabled={!canStyleSelection}
              onApplyStyle={applyStyle}
              value={numberFormatValue}
            />
            <BorderMenu
              borderColor={borderColor}
              disabled={!canStyleSelection}
              onApplyBorder={applyBorderAction}
              onBorderColorChange={setBorderColor}
            />
          </div>
          <ToolbarSeparator />
          <div className="flex shrink-0 items-center gap-1">
            <MergeCellsMenu
              canMerge={canMergeSelectedCells}
              canMergeAcross={canMergeAcross}
              canUnmerge={canUnmergeSelectedCells}
              disabled={!hasSelection || readOnly}
              isMerged={selectionIntersectsMerge}
              onMergeAcross={mergeAcrossSelectedCells}
              onMergeAndCenter={mergeAndCenterSelectedCells}
              onMergeCells={mergeSelectedCells}
              onUnmergeCells={unmergeSelectedCells}
            />
          </div>
          <ToolbarSeparator />
          <div className="flex shrink-0 items-center gap-1">
            <ToolbarTooltip label="Add sheet">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Add sheet"
                disabled={!hasWorkbook || readOnly}
                onClick={() => addSheet()}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Remove active sheet">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove active sheet"
                disabled={sheets.length <= 1 || readOnly}
                onClick={removeActiveSheet}
              >
                <HugeiconsIcon icon={Delete02Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Select
              value={String(activeSheetIndex)}
              onValueChange={(value) => setActiveSheetIndex(Number(value))}
              disabled={!hasWorkbook}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  "w-[150px] min-w-[150px]",
                  XLSX_EDITOR_SELECT_CHROME_CLASS
                )}
                aria-label="Active sheet"
              >
                <SelectValue>{activeSheet?.name ?? "Sheet"}</SelectValue>
              </SelectTrigger>
              <SelectContent
                align="start"
                className={XLSX_DROPDOWN_Z_INDEX_CLASS}
              >
                {sheets.map((sheet, index) => (
                  <SelectItem
                    key={`${sheet.name}-${index}`}
                    value={String(index)}
                  >
                    {sheet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ToolbarSeparator />
          <div className="flex flex-none items-center gap-1">
            <ToolbarTooltip label="Zoom out">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!hasWorkbook || !canZoomOut}
                aria-label="Zoom out"
                onClick={zoomOut}
              >
                <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Select
              value={currentZoom.toString()}
              onValueChange={(value) => setZoomScale(Number(value))}
              disabled={!hasWorkbook}
              modal={false}
            >
              <SelectTrigger
                size="sm"
                className={cn(
                  "w-[84px] min-w-[84px]",
                  XLSX_EDITOR_SELECT_CHROME_CLASS
                )}
                aria-label="Zoom level"
              >
                <SelectValue>{currentZoom}%</SelectValue>
              </SelectTrigger>
              <SelectContent
                align="end"
                alignItemWithTrigger={false}
                className={XLSX_DROPDOWN_Z_INDEX_CLASS}
              >
                {ZOOM_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {value}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarTooltip label="Zoom in">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!hasWorkbook || !canZoomIn}
                aria-label="Zoom in"
                onClick={zoomIn}
              >
                <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
          </div>
        </div>
        <div className="border-t bg-background px-2 py-1">
          <Group className="w-full">
            <Input
              className={cn(
                "h-8 w-[92px] shrink-0 font-mono text-xs",
                XLSX_EDITOR_FORMULA_INPUT_CHROME_CLASS
              )}
              readOnly
              value={activeCellAddress ?? ""}
            />
            <GroupSeparator />
            <GroupText className="h-8 w-9 shrink-0 justify-center px-0 text-[11px] font-semibold italic">
              fx
            </GroupText>
            <GroupSeparator />
            <Input
              className={cn(
                "h-8 flex-1",
                XLSX_EDITOR_FORMULA_INPUT_CHROME_CLASS
              )}
              disabled={!hasActiveCell || readOnly}
              value={formulaDraft}
              onBlur={() => {
                commitFormula()
                setFormulaFocused(false)
              }}
              onChange={(event) => setFormulaDraft(event.target.value)}
              onFocus={() => {
                formulaEditCellRef.current = activeCell
                formulaInitialValueRef.current = formulaDraft
                setFormulaFocused(true)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commitFormula()
                  setFormulaFocused(false)
                }
              }}
              placeholder="Select a cell, then enter a value or formula"
            />
          </Group>
        </div>
      </TooltipProvider>
    </div>
  )
}

export function XlsxEditorSurface({
  className,
  isDark,
  onIsDarkChange,
  onUploadClick,
  renderTableHeaderMenu,
  showNightRenderToggle,
  workbookIdentity,
}: {
  className?: string
  isDark: boolean
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  renderTableHeaderMenu: (
    props: XlsxTableHeaderMenuRenderProps
  ) => React.ReactNode
  showNightRenderToggle: boolean
  workbookIdentity: string
}) {
  const { error } = useXlsxViewer()

  return (
    <div
      className={cn(
        "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
        className
      )}
    >
      <EditorToolbar
        isDark={isDark}
        onIsDarkChange={onIsDarkChange}
        onUploadClick={onUploadClick}
        showNightRenderToggle={showNightRenderToggle}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 bg-muted/20">
          <XlsxViewer
            allowResizeInReadOnly
            className="h-full min-h-0 min-w-0"
            height="100%"
            isDark={isDark}
            readOnly={false}
            rounded={false}
            showDefaultToolbar={false}
            showImages
            fileTooLargeState={
              <div className="grid h-full w-full min-w-full place-items-center p-6">
                <div className="max-w-sm rounded-lg border bg-background p-4 text-sm">
                  <p className="font-medium">File too large for editing</p>
                  <p className="mt-1 text-muted-foreground">
                    This workbook exceeds the editor limit. Download it or open
                    a smaller file to make changes.
                  </p>
                </div>
              </div>
            }
            loadingState={<EditorLoadingSurface />}
            renderScroller={renderXlsxScroller}
            errorState={
              <div className="grid h-full w-full min-w-full place-items-center p-6 text-sm text-destructive">
                {error?.message ?? "Unable to edit workbook."}
              </div>
            }
            renderTableHeaderMenu={renderTableHeaderMenu}
          />
        </div>
        <WorkbookSheetTabs workbookIdentity={workbookIdentity} />
      </div>
    </div>
  )
}

export function XlsxEditorPreview({
  className,
  fileName,
  isDark,
  onIsDarkChange,
  src,
}: {
  className?: string
  fileName?: string
  isDark: boolean
  onIsDarkChange: (isDark: boolean) => void
  src?: string
}) {
  return (
    <XlsxEditorContent
      className={className}
      effectiveIsDark={isDark}
      fileName={fileName}
      setNightRenderEnabled={onIsDarkChange}
      shouldRenderNightMode
      url={src}
    />
  )
}

function XlsxEditorContent({
  className,
  effectiveIsDark,
  fileName,
  setNightRenderEnabled,
  shouldRenderNightMode,
  url,
}: {
  className?: string
  effectiveIsDark: boolean
  fileName?: string
  setNightRenderEnabled: (checked: boolean) => void
  shouldRenderNightMode: boolean
  url?: string
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadedWorkbook, setUploadedWorkbook] =
    React.useState<UploadedWorkbook | null>(null)
  const [workbookBuffer, setWorkbookBuffer] =
    React.useState<ArrayBuffer | null>(null)
  const [loadError, setLoadError] = React.useState<string>()
  const sourceFileName = React.useMemo(
    () =>
      url ? formatWorkbookName(fileName, url) : (fileName ?? "workbook.xlsx"),
    [fileName, url]
  )
  const displayFileName = uploadedWorkbook?.fileName ?? sourceFileName
  const workbookIdentity =
    uploadedWorkbook?.identity ?? `${url ?? "empty"}::${displayFileName}`
  const shouldShowLoadingSpinner = useDelayedLoadingIndicator(
    !workbookBuffer && !loadError && !uploadedWorkbook,
    XLSX_LOADING_INDICATOR_DELAY_MS
  )

  React.useEffect(() => {
    let isCurrent = true

    if (url) {
      setUploadedWorkbook(null)
    }

    async function loadWorkbook(): Promise<void> {
      if (!url) {
        setWorkbookBuffer(null)
        setLoadError(undefined)
        return
      }

      setWorkbookBuffer(null)
      setLoadError(undefined)

      try {
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch XLSX (${response.status})`)
        }

        const nextWorkbookBuffer = await response.arrayBuffer()
        if (!isCurrent) return

        setWorkbookBuffer(nextWorkbookBuffer)
      } catch (error) {
        if (!isCurrent) return

        setLoadError(
          error instanceof Error ? error.message : "Unknown XLSX load error"
        )
      }
    }

    void loadWorkbook()

    return () => {
      isCurrent = false
    }
  }, [url])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    const buffer = await file.arrayBuffer()
    setWorkbookBuffer(null)
    setLoadError(undefined)
    setUploadedWorkbook({
      buffer,
      fileName: file.name,
      identity: `${file.name}-${file.size}-${file.lastModified}`,
    })
  }

  const activeBuffer = uploadedWorkbook?.buffer ?? workbookBuffer

  if (!url && !uploadedWorkbook) {
    return (
      <div
        className={cn(
          "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={handleUpload}
        />
        <div className="grid min-h-0 flex-1 place-items-center bg-muted/30 p-4">
          <div className="max-w-md rounded-lg border bg-background p-4 text-center text-sm shadow-xs">
            <p className="font-medium">Upload a workbook to edit</p>
            <p className="mt-1 text-muted-foreground">
              Pass an XLSX URL with the <code>src</code> prop or upload a local
              file.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              Upload XLSX
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (loadError && !activeBuffer) {
    return (
      <div
        className={cn(
          "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={handleUpload}
        />
        <div className="grid min-h-0 flex-1 place-items-center bg-muted/30 p-4">
          <div className="max-w-md rounded-lg border bg-background p-4 text-sm">
            <p className="font-medium">Unable to edit workbook</p>
            <p className="mt-1 text-muted-foreground">{loadError}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              Upload XLSX
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!activeBuffer) {
    return (
      <div
        className={cn(
          "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
          className
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          className="hidden"
          onChange={handleUpload}
        />
        <EditorLoadingSurface showSpinner={shouldShowLoadingSpinner} />
      </div>
    )
  }

  return (
    <div className={cn("overflow-hidden", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
        onChange={handleUpload}
      />
      <XlsxWorkbookLoadedEditor
        fileName={displayFileName}
        isDark={effectiveIsDark}
        onIsDarkChange={setNightRenderEnabled}
        onUploadClick={() => fileInputRef.current?.click()}
        renderTableHeaderMenu={(props) => (
          <WorkbookTableHeaderMenu {...props} />
        )}
        showNightRenderToggle={shouldRenderNightMode}
        workbookBuffer={activeBuffer}
        workbookIdentity={workbookIdentity}
      />
    </div>
  )
}

function XlsxWorkbookLoadedEditor({
  fileName,
  isDark,
  onIsDarkChange,
  onUploadClick,
  renderTableHeaderMenu,
  showNightRenderToggle,
  workbookBuffer,
  workbookIdentity,
}: {
  fileName: string
  isDark: boolean
  onIsDarkChange: (checked: boolean) => void
  onUploadClick: () => void
  renderTableHeaderMenu: (
    props: XlsxTableHeaderMenuRenderProps
  ) => React.ReactNode
  showNightRenderToggle: boolean
  workbookBuffer: ArrayBuffer
  workbookIdentity: string
}) {
  const controller = useXlsxViewerController(
    React.useMemo(
      () => ({
        allowResizeInReadOnly: true,
        file: workbookBuffer,
        fileName,
        readOnly: false,
        readOnlyAboveBytes: XLSX_EDITOR_READ_ONLY_THRESHOLD_BYTES,
        useWorker: true,
      }),
      [fileName, workbookBuffer]
    )
  )

  return (
    <XlsxViewerProvider controller={controller} isDark={isDark}>
      <XlsxEditorSurface
        isDark={isDark}
        onIsDarkChange={onIsDarkChange}
        onUploadClick={onUploadClick}
        renderTableHeaderMenu={renderTableHeaderMenu}
        showNightRenderToggle={showNightRenderToggle}
        workbookIdentity={workbookIdentity}
      />
    </XlsxViewerProvider>
  )
}
