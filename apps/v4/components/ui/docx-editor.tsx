"use client"

import * as React from "react"
import {
  DocxEditorViewer,
  paragraphLetterheadFloatSideAtNodeIndex,
  useDocxBorders,
  useDocxDocumentTheme,
  useDocxEditor,
  useDocxLineSpacing,
  useDocxPageLayout,
  useDocxParagraphStyles,
  useDocxTrackChanges,
  useDocxViewerThumbnails,
  type DocxBorderContext,
  type DocxBorderPreset,
  type DocxDocumentTheme,
  type DocxEditorController,
} from "@extend-ai/react-docx"
import {
  ArrowExpandDiagonal01Icon,
  ArrowExpandDiagonal02Icon,
  BorderAll01Icon,
  BorderBottom01Icon,
  BorderHorizontalIcon,
  BorderInnerIcon,
  BorderLeft01Icon,
  BorderNone01Icon,
  BorderRight01Icon,
  BorderTop01Icon,
  BorderVerticalIcon,
  ColumnsThreeCogIcon,
  Download01Icon,
  EditOffIcon,
  FileDiffIcon,
  HighlighterIcon,
  ImageAdd01Icon,
  LeftToRightListBulletIcon,
  LeftToRightListNumberIcon,
  LineIcon,
  Link02Icon,
  MinusSignCircleIcon,
  Moon02Icon,
  PlusSignCircleIcon,
  Redo02Icon,
  SidebarLeftIcon,
  Sun03Icon,
  TableIcon,
  TextAlignCenterIcon,
  TextAlignJustifyLeftIcon,
  TextAlignLeft01Icon,
  TextAlignRight01Icon,
  TextBoldIcon,
  TextColorIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextSubscriptIcon,
  TextSuperscriptIcon,
  TextUnderlineIcon,
  Undo02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DocumentViewerThumbnailSidebar,
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/components/ui/document-viewer-sidebar"
import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/registry/new-york-v4/ui/dropdown-menu"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

const DOCX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
const DOCX_SOURCE_CACHE_LIMIT = 3
const DOCX_LOADING_INDICATOR_DELAY_MS = 300
const DOCX_THUMBNAIL_WIDTH = 92
const DOCX_EDITOR_DEFAULT_ZOOM_SCALE = 75
const ZOOM_OPTIONS = [50, 75, 90, 100, 110, 125, 150, 175, 200] as const
const FONT_FAMILIES = [
  "Calibri",
  "Arial",
  "Times New Roman",
  "Georgia",
  "Helvetica",
  "Courier New",
] as const
const FONT_SIZE_OPTIONS = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48,
] as const
const LINE_SPACING_OPTIONS = [1, 1.15, 1.2, 1.5, 2, 2.5, 3] as const
const FALLBACK_PARAGRAPH_STYLE_OPTIONS = [
  { id: "Normal", name: "Body" },
  { id: "Heading1", name: "Heading 1" },
  { id: "Heading2", name: "Heading 2" },
  { id: "Heading3", name: "Heading 3" },
] as const
const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "yellow", color: "#fff59d" },
  { label: "Green", value: "green", color: "#bbf7d0" },
  { label: "Cyan", value: "cyan", color: "#a5f3fc" },
  { label: "Magenta", value: "magenta", color: "#f5d0fe" },
  { label: "Red", value: "red", color: "#fecaca" },
  { label: "Blue", value: "blue", color: "#bfdbfe" },
] as const
const DOCX_PADDING_WARNING_TEXT = "a style property during rerender"

const docxFileCache = new Map<string, File>()
const docxFilePromiseCache = new Map<string, Promise<File>>()

type UploadedDocxFile = {
  file: File
  identity: string
}

type BorderControlOption = {
  id: DocxBorderPreset
  label: string
  contexts?: DocxBorderContext[]
  separatorBefore?: boolean
}

const BORDER_CONTROL_OPTIONS: BorderControlOption[] = [
  { id: "bottom", label: "Bottom Border" },
  { id: "top", label: "Top Border" },
  { id: "left", label: "Left Border" },
  { id: "right", label: "Right Border" },
  { id: "none", label: "No Border", separatorBefore: true },
  { id: "all", label: "All Borders" },
  { id: "outside", label: "Outside Borders" },
  { id: "inside", label: "Inside Borders", contexts: ["table"] },
  {
    id: "inside-horizontal",
    label: "Inside Horizontal Border",
    contexts: ["table"],
  },
  {
    id: "inside-vertical",
    label: "Inside Vertical Border",
    contexts: ["table"],
  },
  {
    id: "diagonal-down",
    label: "Diagonal Down Border",
    contexts: ["table"],
    separatorBefore: true,
  },
  { id: "diagonal-up", label: "Diagonal Up Border", contexts: ["table"] },
  { id: "horizontal-line", label: "Horizontal Line", separatorBefore: true },
]

function borderControlOptionIcon(optionId: DocxBorderPreset) {
  switch (optionId) {
    case "bottom":
      return BorderBottom01Icon
    case "top":
      return BorderTop01Icon
    case "left":
      return BorderLeft01Icon
    case "right":
      return BorderRight01Icon
    case "none":
      return BorderNone01Icon
    case "inside":
      return BorderInnerIcon
    case "inside-horizontal":
      return BorderHorizontalIcon
    case "inside-vertical":
      return BorderVerticalIcon
    case "diagonal-down":
      return ArrowExpandDiagonal01Icon
    case "diagonal-up":
      return ArrowExpandDiagonal02Icon
    case "horizontal-line":
      return LineIcon
    default:
      return BorderAll01Icon
  }
}

function getDocumentCacheKey(url: string, fileName?: string) {
  return `${url.split("?")[0] ?? url}::${fileName ?? ""}`
}

function rememberDocxFile(cacheKey: string, file: File) {
  if (docxFileCache.has(cacheKey)) {
    docxFileCache.delete(cacheKey)
  }

  docxFileCache.set(cacheKey, file)

  while (docxFileCache.size > DOCX_SOURCE_CACHE_LIMIT) {
    const oldestKey = docxFileCache.keys().next().value
    if (!oldestKey) break
    docxFileCache.delete(oldestKey)
  }
}

async function loadCachedDocxFile(
  url: string,
  displayFileName: string,
  cacheKey: string
): Promise<File> {
  const cachedFile = docxFileCache.get(cacheKey)
  if (cachedFile) return cachedFile

  const pendingRequest = docxFilePromiseCache.get(cacheKey)
  if (pendingRequest) return pendingRequest

  const nextRequest = fetch(url)
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch DOCX (${response.status})`)
      }

      const blob = await response.blob()
      const docxFile = new File([blob], displayFileName, {
        type: blob.type || DOCX_MIME_TYPE,
      })

      rememberDocxFile(cacheKey, docxFile)
      return docxFile
    })
    .finally(() => {
      docxFilePromiseCache.delete(cacheKey)
    })

  docxFilePromiseCache.set(cacheKey, nextRequest)
  return nextRequest
}

function formatDocumentName(fileName: string | undefined, url: string) {
  if (fileName?.trim()) return fileName

  const pathname = url.split("?")[0] ?? ""
  const rawName = pathname.split("/").pop() ?? "document.docx"

  try {
    return decodeURIComponent(rawName)
  } catch {
    return rawName
  }
}

function getNextZoomScale(currentZoomScale: number, direction: 1 | -1) {
  const currentIndex = ZOOM_OPTIONS.indexOf(
    currentZoomScale as (typeof ZOOM_OPTIONS)[number]
  )
  let fallbackIndex = -1

  if (direction > 0) {
    fallbackIndex = ZOOM_OPTIONS.findIndex((value) => value > currentZoomScale)
  } else {
    for (let index = ZOOM_OPTIONS.length - 1; index >= 0; index -= 1) {
      if (ZOOM_OPTIONS[index] < currentZoomScale) {
        fallbackIndex = index
        break
      }
    }
  }

  const resolvedIndex = currentIndex >= 0 ? currentIndex : fallbackIndex
  if (resolvedIndex < 0) return currentZoomScale

  const nextIndex = Math.min(
    Math.max(resolvedIndex + direction, 0),
    ZOOM_OPTIONS.length - 1
  )

  return ZOOM_OPTIONS[nextIndex] ?? currentZoomScale
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

function useDocumentNightRenderPreference() {
  const [nightRenderEnabled, setNightRenderEnabled] = React.useState(false)
  const [nightRenderPrefLoaded, setNightRenderPrefLoaded] =
    React.useState(false)

  React.useEffect(() => {
    const storedValue = window.localStorage.getItem("docx-editor-night-render")
    setNightRenderEnabled(storedValue !== "false")
    setNightRenderPrefLoaded(true)
  }, [])

  const updateNightRenderEnabled = React.useCallback((checked: boolean) => {
    setNightRenderEnabled(checked)
    window.localStorage.setItem("docx-editor-night-render", String(checked))
  }, [])

  return {
    nightRenderEnabled,
    nightRenderPrefLoaded,
    setNightRenderEnabled: updateNightRenderEnabled,
  }
}

function isDocxPaddingWarning(args: unknown[]) {
  return (
    typeof args[0] === "string" &&
    args[0].includes(DOCX_PADDING_WARNING_TEXT) &&
    args.some((arg) => String(arg).includes("padding"))
  )
}

function useSuppressDocxPaddingWarning(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return

    const originalConsoleError = console.error

    console.error = (...args: unknown[]) => {
      if (isDocxPaddingWarning(args)) return
      originalConsoleError(...args)
    }

    return () => {
      console.error = originalConsoleError
    }
  }, [enabled])
}

function normalizeHexColor(value?: string, fallback = "#111827") {
  if (!value) return fallback

  const trimmed = value.trim()
  const threeDigit = /^#([0-9a-f]{3})$/i.exec(trimmed)
  if (threeDigit?.[1]) {
    const [red, green, blue] = threeDigit[1].split("")
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase()
  }

  const sixDigit = /^#([0-9a-f]{6})$/i.exec(trimmed)
  if (sixDigit?.[1]) {
    return `#${sixDigit[1].toLowerCase()}`
  }

  return fallback
}

function parseToolbarSectionColumns(
  sectionPropertiesXml?: string
): { count: number; gapPx: number } | undefined {
  if (!sectionPropertiesXml) return undefined

  const columnsTag = sectionPropertiesXml.match(/<w:cols\b[^>]*\/?>/i)?.[0]
  if (!columnsTag) return undefined

  const countRaw = columnsTag.match(/\bw:num="(\d+)"/i)?.[1]
  const count = countRaw ? Number(countRaw) : 1
  if (!Number.isFinite(count) || count <= 1) return undefined

  const gapRaw = columnsTag.match(/\bw:space="(\d+)"/i)?.[1]
  const gapTwips = gapRaw ? Number(gapRaw) : 720
  const gapPx = Math.max(0, Math.round((gapTwips * 96) / 1440))

  return {
    count: Math.max(2, Math.round(count)),
    gapPx,
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
    <div className="grid h-full min-h-52 place-items-center bg-transparent">
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

function ToolbarColorInput({
  color,
  disabled,
  icon,
  label,
  onChange,
}: {
  color: string
  disabled?: boolean
  icon: typeof TextColorIcon
  label: string
  onChange: (color: string) => void
}) {
  return (
    <ToolbarTooltip label={label}>
      <label
        className={cn(
          "relative inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-foreground transition-colors hover:bg-accent",
          disabled && "pointer-events-none opacity-64"
        )}
        aria-label={label}
      >
        <HugeiconsIcon icon={icon} className="size-4" />
        <span
          className="absolute right-1 bottom-1 h-1 w-4 rounded-full border border-background"
          style={{ backgroundColor: color }}
        />
        <input
          type="color"
          aria-label={label}
          disabled={disabled}
          value={color}
          className="sr-only"
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </ToolbarTooltip>
  )
}

function DocxSidebarThumbnail({
  canvasRef,
  displayFileName,
  hasError,
  isActive,
  isLoading,
  pageNumber,
  pixelHeightPx,
  pixelWidthPx,
  previewAspectRatio,
}: {
  canvasRef: React.RefCallback<HTMLCanvasElement>
  displayFileName: string
  hasError: boolean
  isActive: boolean
  isLoading: boolean
  pageNumber: number
  pixelHeightPx: number
  pixelWidthPx: number
  previewAspectRatio: number
}) {
  return (
    <FileThumbnail
      file={{
        name: `${displayFileName} page ${pageNumber}`,
        type: DOCX_MIME_TYPE,
      }}
      previewAspectRatio={previewAspectRatio}
      previewClassName="bg-white"
      previewContent={
        <canvas
          ref={canvasRef}
          width={pixelWidthPx}
          height={pixelHeightPx}
          className="!size-full bg-white object-cover object-top"
        />
      }
      renderDocumentPreview={false}
      isLoading={isLoading}
      hasError={hasError}
      showMetadata={false}
      className={cn(
        "w-full rounded-sm border shadow-xs transition-[border-color,box-shadow] duration-150",
        isActive && "border-primary shadow-sm"
      )}
    />
  )
}

function DocxEditorToolbar({
  activePage,
  controlsDisabled,
  editor,
  isReadOnly,
  onImageUploadClick,
  onIsReadOnlyChange,
  onOpenLinkEditor,
  onToggleSidebar,
  onUploadClick,
  pageCount,
  setZoomScale,
  showNightRenderToggle,
  zoomScale,
}: {
  activePage: number
  controlsDisabled: boolean
  editor: DocxEditorController
  isReadOnly: boolean
  onImageUploadClick: () => void
  onIsReadOnlyChange: (checked: boolean) => void
  onOpenLinkEditor: () => void
  onToggleSidebar: () => void
  onUploadClick: () => void
  pageCount: number
  setZoomScale: React.Dispatch<React.SetStateAction<number>>
  showNightRenderToggle: boolean
  zoomScale: number
}) {
  const { documentTheme, setDocumentTheme } = useDocxDocumentTheme(editor)
  const { layout: pageLayout } = useDocxPageLayout(editor)
  const { paragraphStyles, selectedParagraphStyleId, setParagraphStyle } =
    useDocxParagraphStyles(editor)
  const { lineSpacing, setLineSpacing } = useDocxLineSpacing(editor)
  const { borderContext, activeBorderPresets, applyBorderPreset } =
    useDocxBorders(editor)
  const { showTrackedChanges, setShowTrackedChanges } =
    useDocxTrackChanges(editor)
  const selectedRunStyle = editor.selectedRunStyle
  const selectedParagraph = editor.selectedParagraph
  const paragraphStyleOptions =
    paragraphStyles.length > 0
      ? paragraphStyles
      : [...FALLBACK_PARAGRAPH_STYLE_OPTIONS]
  const selectedParagraphStyleValue =
    selectedParagraphStyleId ??
    paragraphStyleOptions.find((option) => "isDefault" in option)?.id ??
    paragraphStyleOptions[0]?.id ??
    "Normal"
  const selectedLineSpacingValue = React.useMemo(() => {
    const current = Number.isFinite(lineSpacing.multiple)
      ? lineSpacing.multiple
      : 1
    const nearest = LINE_SPACING_OPTIONS.reduce((closest, candidate) => {
      return Math.abs(candidate - current) < Math.abs(closest - current)
        ? candidate
        : closest
    }, LINE_SPACING_OPTIONS[0])
    return String(nearest)
  }, [lineSpacing.multiple])
  const textColorValue = normalizeHexColor(selectedRunStyle?.color)
  const highlightColor =
    HIGHLIGHT_COLORS.find(
      (option) => option.value === selectedRunStyle?.highlight
    )?.color ?? "#fff59d"
  const activeNodeIndex =
    editor.selection.kind === "paragraph"
      ? editor.selection.nodeIndex
      : editor.selection.tableIndex
  const letterheadColumns =
    editor.selection.kind === "paragraph" &&
    paragraphLetterheadFloatSideAtNodeIndex(
      editor.model.nodes,
      editor.selection.nodeIndex
    )
      ? { count: 2, gapPx: 28 }
      : undefined
  const sections = editor.model.metadata.sections ?? []
  const activeSection = sections
    .filter((section) => section.startNodeIndex <= activeNodeIndex)
    .at(-1)
  const activeColumns =
    letterheadColumns ??
    parseToolbarSectionColumns(activeSection?.sectionPropertiesXml) ??
    parseToolbarSectionColumns(editor.model.metadata.sectionPropertiesXml) ??
    pageLayout.columns
  const activeBorderControlOptions = BORDER_CONTROL_OPTIONS.filter(
    (option) => activeBorderPresets[option.id]
  )
  const borderTriggerLabel =
    activeBorderControlOptions.length === 1
      ? activeBorderControlOptions[0].label
      : "Borders"
  const borderTriggerIcon = borderControlOptionIcon(
    activeBorderControlOptions.length === 1
      ? activeBorderControlOptions[0].id
      : "all"
  )
  const canEdit = !controlsDisabled && !isReadOnly
  const canZoomIn = zoomScale < ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]
  const canZoomOut = zoomScale > ZOOM_OPTIONS[0]

  const preserveTextSelection = React.useCallback(
    (event: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>) =>
      event.preventDefault(),
    []
  )

  return (
    <div className="border-b bg-background">
      <TooltipProvider>
        <div className="flex min-h-11 items-center gap-2 overflow-x-auto overflow-y-hidden border-b px-3">
          <ToolbarIconButton
            label="Toggle pages"
            disabled={controlsDisabled}
            onClick={onToggleSidebar}
          >
            <HugeiconsIcon icon={SidebarLeftIcon} className="size-4" />
          </ToolbarIconButton>
          <div className="min-w-28 text-sm whitespace-nowrap text-primary">
            Page {pageCount ? activePage : 1} of {pageCount || "-"}
          </div>
          <div className="min-w-0 flex-1" />
          {showNightRenderToggle ? (
            <>
              <ToolbarIconButton
                label={
                  documentTheme === "dark"
                    ? "Use light document"
                    : "Use dark document"
                }
                disabled={controlsDisabled}
                onClick={() =>
                  setDocumentTheme(documentTheme === "dark" ? "light" : "dark")
                }
              >
                <HugeiconsIcon
                  icon={documentTheme === "dark" ? Sun03Icon : Moon02Icon}
                  className="size-4"
                />
              </ToolbarIconButton>
              <Separator
                orientation="vertical"
                className="mx-1 h-4 self-center"
              />
            </>
          ) : null}
          <ToolbarIconButton
            label="Show tracked changes"
            active={showTrackedChanges}
            disabled={controlsDisabled}
            onClick={() => setShowTrackedChanges(!showTrackedChanges)}
          >
            <HugeiconsIcon icon={FileDiffIcon} className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label={isReadOnly ? "Switch to edit mode" : "Switch to read-only"}
            active={isReadOnly}
            disabled={controlsDisabled}
            onClick={() => onIsReadOnlyChange(!isReadOnly)}
          >
            <HugeiconsIcon icon={EditOffIcon} className="size-4" />
          </ToolbarIconButton>
          <Separator orientation="vertical" className="mx-1 h-4 self-center" />
          <ToolbarIconButton
            label="Import DOCX"
            disabled={editor.isImporting}
            onClick={onUploadClick}
          >
            {editor.isImporting ? (
              <Spinner className="size-4" />
            ) : (
              <HugeiconsIcon icon={Upload01Icon} className="size-4" />
            )}
          </ToolbarIconButton>
          <ToolbarIconButton
            label="Download DOCX"
            disabled={controlsDisabled || editor.isImporting}
            onClick={editor.exportDocx}
          >
            <HugeiconsIcon icon={Download01Icon} className="size-4" />
          </ToolbarIconButton>
        </div>

        <div className="flex min-h-12 flex-wrap items-center gap-2 border-b px-3 py-2">
          <div className="flex shrink-0 items-center gap-1">
            <ToolbarIconButton
              label="Undo"
              disabled={!editor.canUndo || isReadOnly}
              onClick={editor.undo}
            >
              <HugeiconsIcon icon={Undo02Icon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Redo"
              disabled={!editor.canRedo || isReadOnly}
              onClick={editor.redo}
            >
              <HugeiconsIcon icon={Redo02Icon} className="size-4" />
            </ToolbarIconButton>
          </div>

          <Select
            value={selectedParagraphStyleValue}
            onValueChange={(value) => {
              if (value) {
                setParagraphStyle(value)
              }
            }}
            disabled={!canEdit}
          >
            <SelectTrigger
              size="sm"
              className="w-[136px] min-w-[136px]"
              aria-label="Paragraph style"
            >
              <SelectValue placeholder="Style" />
            </SelectTrigger>
            <SelectContent align="start" className="z-[100010]">
              {paragraphStyleOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedRunStyle?.fontFamily ?? "Calibri"}
            onValueChange={(value) => {
              if (value) {
                editor.setFontFamily(value)
              }
            }}
            disabled={!canEdit}
          >
            <SelectTrigger
              size="sm"
              className="w-[156px] min-w-[156px]"
              aria-label="Font family"
            >
              <SelectValue placeholder="Font" />
            </SelectTrigger>
            <SelectContent align="start" className="z-[100010]">
              {FONT_FAMILIES.map((fontFamily) => (
                <SelectItem key={fontFamily} value={fontFamily}>
                  <span style={{ fontFamily }}>{fontFamily}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={String(Math.round(selectedRunStyle?.fontSizePt ?? 12))}
            onValueChange={(value) => {
              const nextSize = Number(value)
              if (Number.isFinite(nextSize)) {
                editor.setFontSize(nextSize)
              }
            }}
            disabled={!canEdit}
          >
            <SelectTrigger
              size="sm"
              className="w-[86px] min-w-[86px]"
              aria-label="Font size"
            >
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent align="start" className="z-[100010]">
              {FONT_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} pt
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedLineSpacingValue}
            onValueChange={(value) => {
              const nextSpacing = Number(value)
              if (Number.isFinite(nextSpacing)) {
                setLineSpacing(nextSpacing)
              }
            }}
            disabled={!canEdit}
          >
            <SelectTrigger
              size="sm"
              className="w-[94px] min-w-[94px]"
              aria-label="Line spacing"
            >
              <SelectValue placeholder="Spacing" />
            </SelectTrigger>
            <SelectContent align="start" className="z-[100010]">
              {LINE_SPACING_OPTIONS.map((spacing) => (
                <SelectItem key={spacing} value={String(spacing)}>
                  {spacing}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex shrink-0 items-center gap-1">
            <ToolbarIconButton
              label="Bold"
              active={Boolean(selectedRunStyle?.bold)}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={editor.toggleBold}
            >
              <HugeiconsIcon icon={TextBoldIcon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Italic"
              active={Boolean(selectedRunStyle?.italic)}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={editor.toggleItalic}
            >
              <HugeiconsIcon icon={TextItalicIcon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Underline"
              active={Boolean(selectedRunStyle?.underline)}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={editor.toggleUnderline}
            >
              <HugeiconsIcon icon={TextUnderlineIcon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Strikethrough"
              active={Boolean(selectedRunStyle?.strike)}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={editor.toggleStrike}
            >
              <HugeiconsIcon icon={TextStrikethroughIcon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Superscript"
              active={selectedRunStyle?.verticalAlign === "superscript"}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={editor.toggleSuperscript}
            >
              <HugeiconsIcon icon={TextSuperscriptIcon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Subscript"
              active={selectedRunStyle?.verticalAlign === "subscript"}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={editor.toggleSubscript}
            >
              <HugeiconsIcon icon={TextSubscriptIcon} className="size-4" />
            </ToolbarIconButton>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ToolbarColorInput
              label="Text color"
              icon={TextColorIcon}
              color={textColorValue}
              disabled={!canEdit}
              onChange={(color) =>
                editor.setTextColor(normalizeHexColor(color))
              }
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={!canEdit}
                  aria-label="Highlight color"
                  className="relative"
                >
                  <HugeiconsIcon icon={HighlighterIcon} className="size-4" />
                  <span
                    className="absolute right-1 bottom-1 h-1 w-4 rounded-full border border-background"
                    style={{ backgroundColor: highlightColor }}
                  />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="z-[100010] w-44">
                {HIGHLIGHT_COLORS.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={selectedRunStyle?.highlight === option.value}
                    onCheckedChange={() => editor.setHighlight(option.value)}
                  >
                    <span
                      className="size-3 rounded-full border"
                      style={{ backgroundColor: option.color }}
                    />
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={!selectedRunStyle?.highlight}
                  onCheckedChange={() => editor.setHighlight(undefined)}
                >
                  No highlight
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ToolbarIconButton
              label="Link"
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={onOpenLinkEditor}
            >
              <HugeiconsIcon icon={Link02Icon} className="size-4" />
            </ToolbarIconButton>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ToolbarIconButton
              label="Align left"
              active={
                selectedParagraph?.style?.align === "left" ||
                !selectedParagraph?.style?.align
              }
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={() => editor.setAlignment("left")}
            >
              <HugeiconsIcon icon={TextAlignLeft01Icon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Align center"
              active={selectedParagraph?.style?.align === "center"}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={() => editor.setAlignment("center")}
            >
              <HugeiconsIcon icon={TextAlignCenterIcon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Align right"
              active={selectedParagraph?.style?.align === "right"}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={() => editor.setAlignment("right")}
            >
              <HugeiconsIcon icon={TextAlignRight01Icon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Justify"
              active={selectedParagraph?.style?.align === "justify"}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={() => editor.setAlignment("justify")}
            >
              <HugeiconsIcon
                icon={TextAlignJustifyLeftIcon}
                className="size-4"
              />
            </ToolbarIconButton>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <ToolbarIconButton
              label="Bulleted list"
              active={editor.hasUnorderedList}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={() => editor.toggleList("unordered")}
            >
              <HugeiconsIcon
                icon={LeftToRightListBulletIcon}
                className="size-4"
              />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Numbered list"
              active={editor.hasOrderedList}
              disabled={!canEdit}
              onMouseDown={preserveTextSelection}
              onPointerDown={preserveTextSelection}
              onClick={() => editor.toggleList("ordered")}
            >
              <HugeiconsIcon
                icon={LeftToRightListNumberIcon}
                className="size-4"
              />
            </ToolbarIconButton>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!canEdit}
                className="h-7 gap-1 px-2 shadow-none"
              >
                <HugeiconsIcon icon={borderTriggerIcon} className="size-4" />
                {borderTriggerLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="z-[100010] w-56">
              {BORDER_CONTROL_OPTIONS.map((option) => {
                const enabledForContext =
                  !option.contexts || option.contexts.includes(borderContext)
                const BorderOptionIcon = borderControlOptionIcon(option.id)

                return (
                  <React.Fragment key={option.id}>
                    {option.separatorBefore ? <DropdownMenuSeparator /> : null}
                    <DropdownMenuCheckboxItem
                      checked={activeBorderPresets[option.id]}
                      disabled={!enabledForContext}
                      onCheckedChange={() => {
                        if (enabledForContext) {
                          applyBorderPreset(option.id)
                        }
                      }}
                    >
                      <HugeiconsIcon
                        icon={BorderOptionIcon}
                        className="size-4 text-muted-foreground"
                      />
                      {option.label}
                    </DropdownMenuCheckboxItem>
                  </React.Fragment>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex shrink-0 items-center gap-1">
            <ToolbarIconButton
              label="Insert image"
              disabled={!canEdit}
              onClick={onImageUploadClick}
            >
              <HugeiconsIcon icon={ImageAdd01Icon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarIconButton
              label="Insert table"
              disabled={!canEdit}
              onClick={editor.insertTable}
            >
              <HugeiconsIcon icon={TableIcon} className="size-4" />
            </ToolbarIconButton>
            <ToolbarTooltip label="Section columns">
              <div className="flex h-7 shrink-0 items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground">
                <HugeiconsIcon icon={ColumnsThreeCogIcon} className="size-4" />
                {activeColumns ? `${activeColumns.count} cols` : "1 col"}
              </div>
            </ToolbarTooltip>
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ToolbarIconButton
              label="Zoom out"
              disabled={controlsDisabled || !canZoomOut}
              onClick={() =>
                setZoomScale((currentZoomScale) =>
                  getNextZoomScale(currentZoomScale, -1)
                )
              }
            >
              <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />
            </ToolbarIconButton>
            <Select
              value={zoomScale.toString()}
              onValueChange={(value) => setZoomScale(Number(value))}
              disabled={controlsDisabled}
            >
              <SelectTrigger
                size="sm"
                className="w-[84px] min-w-[84px]"
                aria-label="Zoom level"
              >
                <SelectValue>{Math.round(zoomScale)}%</SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="z-[100010]">
                {ZOOM_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value.toString()}>
                    {value}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarIconButton
              label="Zoom in"
              disabled={controlsDisabled || !canZoomIn}
              onClick={() =>
                setZoomScale((currentZoomScale) =>
                  getNextZoomScale(currentZoomScale, 1)
                )
              }
            >
              <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
            </ToolbarIconButton>
          </div>
        </div>
      </TooltipProvider>
    </div>
  )
}

export function DocxEditorPreview({
  className,
  fileName,
  rounded = false,
  src,
}: {
  className?: string
  fileName?: string
  rounded?: boolean
  src?: string
}) {
  const { resolvedTheme } = useTheme()
  const { nightRenderEnabled, nightRenderPrefLoaded, setNightRenderEnabled } =
    useDocumentNightRenderPreference()
  const isViewerHydrated = resolvedTheme !== undefined && nightRenderPrefLoaded
  const shouldShowHydrationSpinner = useDelayedLoadingIndicator(
    !isViewerHydrated,
    DOCX_LOADING_INDICATOR_DELAY_MS
  )

  if (!isViewerHydrated) {
    return (
      <div
        className={cn(
          "flex h-[720px] min-h-0 flex-col overflow-hidden bg-background",
          className
        )}
      >
        <div
          className={cn(
            "min-h-0 flex-1 overflow-hidden bg-muted/30 p-4",
            rounded && "rounded-b-lg"
          )}
        >
          <EditorLoadingSurface showSpinner={shouldShowHydrationSpinner} />
        </div>
      </div>
    )
  }

  const shouldRenderNightMode = resolvedTheme === "dark"
  const effectiveIsDark = shouldRenderNightMode && nightRenderEnabled

  return (
    <DocxEditorContent
      className={className}
      effectiveIsDark={effectiveIsDark}
      fileName={fileName}
      rounded={rounded}
      setNightRenderEnabled={setNightRenderEnabled}
      shouldRenderNightMode={shouldRenderNightMode}
      url={src}
    />
  )
}

function DocxEditorContent({
  className,
  effectiveIsDark,
  fileName,
  rounded,
  setNightRenderEnabled: _setNightRenderEnabled,
  shouldRenderNightMode,
  url,
}: {
  className?: string
  effectiveIsDark: boolean
  fileName?: string
  rounded: boolean
  setNightRenderEnabled: (checked: boolean) => void
  shouldRenderNightMode: boolean
  url?: string
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)
  const viewportRef = React.useRef<HTMLDivElement | null>(null)
  const [viewerShellRef, viewerShellWidth] = useElementWidth<HTMLDivElement>()
  const [uploadedDocxFile, setUploadedDocxFile] =
    React.useState<UploadedDocxFile | null>(null)
  const [activePage, setActivePage] = React.useState(1)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [zoomScale, setZoomScale] = React.useState<number>(
    DOCX_EDITOR_DEFAULT_ZOOM_SCALE
  )
  const [loadError, setLoadError] = React.useState<string>()
  const [isLoadingDocument, setIsLoadingDocument] = React.useState(true)
  const [isReadOnly, setIsReadOnly] = React.useState(false)
  const [linkEditorOpen, setLinkEditorOpen] = React.useState(false)
  const [linkDraft, setLinkDraft] = React.useState("")
  const viewerBackgroundColor =
    "color-mix(in oklab, var(--muted) 40%, transparent)"
  const displayFileName = React.useMemo(
    () =>
      uploadedDocxFile?.file.name ??
      (url ? formatDocumentName(fileName, url) : (fileName ?? "document.docx")),
    [fileName, uploadedDocxFile?.file.name, url]
  )
  const cacheKey = React.useMemo(
    () =>
      uploadedDocxFile?.identity ??
      (url ? getDocumentCacheKey(url, displayFileName) : "docx-empty"),
    [displayFileName, uploadedDocxFile?.identity, url]
  )
  const [initialDocumentTheme] = React.useState<DocxDocumentTheme>(() =>
    effectiveIsDark ? "dark" : "light"
  )
  const editorOptions = React.useMemo(
    () => ({
      initialDocumentTheme,
      initialFileName: displayFileName,
    }),
    [displayFileName, initialDocumentTheme]
  )
  const editor = useDocxEditor(editorOptions)
  const { importDocxFile, setDocumentTheme, status } = editor
  const thumbnailOptions = React.useMemo(
    () => ({
      pixelRatio: 2,
      resolution: {
        maxHeight: DOCX_THUMBNAIL_WIDTH * 1.35,
        maxWidth: DOCX_THUMBNAIL_WIDTH,
      },
    }),
    []
  )
  const { thumbnails } = useDocxViewerThumbnails(editor, thumbnailOptions)
  const shouldShowDocumentSpinner = useDelayedLoadingIndicator(
    isLoadingDocument,
    DOCX_LOADING_INDICATOR_DELAY_MS
  )
  const loadingState = (
    <EditorLoadingSurface showSpinner={shouldShowDocumentSpinner} />
  )
  const hasDocument = Boolean(url || uploadedDocxFile)
  const sidebarInline = useInlineThumbnailSidebar(viewerShellWidth)
  const pageCount =
    hasDocument && !isLoadingDocument && !loadError
      ? Math.max(1, editor.totalPages)
      : 0
  const controlsDisabled =
    !hasDocument || isLoadingDocument || Boolean(loadError)

  useSuppressDocxPaddingWarning(!isLoadingDocument && !loadError)

  React.useEffect(() => {
    setZoomScale(DOCX_EDITOR_DEFAULT_ZOOM_SCALE)
    setActivePage(1)
    viewportRef.current?.scrollTo({ top: 0, left: 0 })
  }, [url])

  React.useEffect(() => {
    setDocumentTheme(effectiveIsDark ? "dark" : "light")
  }, [effectiveIsDark, setDocumentTheme])

  React.useEffect(() => {
    if (
      status.startsWith("Failed to load file") ||
      status === "Only .docx files are supported"
    ) {
      setLoadError(status)
      setIsLoadingDocument(false)
    }
  }, [status])

  React.useEffect(() => {
    let isCurrent = true

    async function load() {
      if (!uploadedDocxFile && !url) {
        setIsLoadingDocument(false)
        setLoadError(undefined)
        return
      }

      setIsLoadingDocument(true)
      setLoadError(undefined)

      try {
        const docxFile =
          uploadedDocxFile?.file ??
          (url
            ? await loadCachedDocxFile(url, displayFileName, cacheKey)
            : null)
        if (!docxFile) return
        await importDocxFile(docxFile)

        if (isCurrent) {
          setIsLoadingDocument(false)
          setActivePage(1)
          viewportRef.current?.scrollTo({ top: 0, left: 0 })
        }
      } catch (error) {
        if (isCurrent) {
          setLoadError(
            error instanceof Error ? error.message : "Unknown DOCX load error"
          )
          setIsLoadingDocument(false)
        }
      }
    }

    void load()

    return () => {
      isCurrent = false
    }
  }, [cacheKey, displayFileName, importDocxFile, uploadedDocxFile, url])

  React.useEffect(() => {
    if (url) {
      setUploadedDocxFile(null)
    }
  }, [url])

  const updateActivePageFromViewport = React.useCallback(() => {
    const viewport = viewportRef.current
    if (!viewport || !pageCount) return

    const viewportRect = viewport.getBoundingClientRect()
    const viewportCenter = viewportRect.top + viewportRect.height / 2
    let closestPage = 1
    let closestDistance = Number.POSITIVE_INFINITY

    viewport
      .querySelectorAll<HTMLElement>(
        '[data-docx-page-wrapper="true"][data-index]'
      )
      .forEach((page) => {
        const pageIndex = Number(page.dataset.index)
        if (!Number.isFinite(pageIndex)) return

        const pageRect = page.getBoundingClientRect()
        const pageCenter = pageRect.top + pageRect.height / 2
        const distance = Math.abs(pageCenter - viewportCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestPage = pageIndex + 1
        }
      })

    setActivePage((currentPage) =>
      currentPage === closestPage ? currentPage : closestPage
    )
  }, [pageCount])

  React.useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport || !pageCount) return

    let frameId = 0
    const handleScroll = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(updateActivePageFromViewport)
    }

    frameId = window.requestAnimationFrame(updateActivePageFromViewport)
    viewport.addEventListener("scroll", handleScroll, { passive: true })

    return () => {
      window.cancelAnimationFrame(frameId)
      viewport.removeEventListener("scroll", handleScroll)
    }
  }, [pageCount, updateActivePageFromViewport])

  const scrollToPage = React.useCallback((pageNumber: number) => {
    const viewport = viewportRef.current
    const targetPageIndex = pageNumber - 1
    const page = viewport?.querySelector<HTMLElement>(
      `[data-docx-page-wrapper="true"][data-index="${targetPageIndex}"]`
    )

    setActivePage(pageNumber)

    if (!viewport || !page) return

    viewport.scrollTo({
      top:
        page.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top +
        viewport.scrollTop -
        24,
      behavior: "auto",
    })
  }, [])

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    setZoomScale(DOCX_EDITOR_DEFAULT_ZOOM_SCALE)
    setActivePage(1)
    setUploadedDocxFile({
      file,
      identity: `${file.name}-${file.size}-${file.lastModified}`,
    })
  }

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    await editor.insertImageFile(file)
  }

  function openLinkEditor() {
    setLinkDraft(editor.selectedLink ?? "")
    setLinkEditorOpen(true)
  }

  function applyLink() {
    editor.setLink(linkDraft.trim() || undefined)
    setLinkEditorOpen(false)
  }

  return (
    <div
      className={cn(
        "flex h-[720px] min-h-0 flex-col overflow-hidden bg-background",
        className
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleUpload}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <DocxEditorToolbar
        activePage={activePage}
        controlsDisabled={controlsDisabled}
        editor={editor}
        isReadOnly={isReadOnly}
        onImageUploadClick={() => imageInputRef.current?.click()}
        onIsReadOnlyChange={setIsReadOnly}
        onOpenLinkEditor={openLinkEditor}
        onToggleSidebar={() => setSidebarOpen((open) => !open)}
        onUploadClick={() => fileInputRef.current?.click()}
        pageCount={pageCount}
        setZoomScale={setZoomScale}
        showNightRenderToggle={shouldRenderNightMode}
        zoomScale={zoomScale}
      />
      <div
        ref={viewerShellRef}
        className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30"
      >
        {linkEditorOpen ? (
          <div className="absolute top-3 left-1/2 z-50 flex w-[min(420px,calc(100%-2rem))] -translate-x-1/2 items-center gap-2 rounded-lg border bg-background p-2 shadow-lg">
            <Input
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  applyLink()
                }
                if (event.key === "Escape") {
                  setLinkEditorOpen(false)
                }
              }}
              placeholder="https://example.com"
              aria-label="Link URL"
            />
            <Button type="button" size="sm" onClick={applyLink}>
              Apply
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                editor.setLink(undefined)
                setLinkEditorOpen(false)
              }}
            >
              Clear
            </Button>
          </div>
        ) : null}
        <DocumentViewerThumbnailSidebar
          inline={sidebarInline}
          open={Boolean(sidebarOpen && (pageCount || isLoadingDocument))}
        >
          <ScrollArea className="h-full" scrollFade>
            <div className="p-4">
              {isLoadingDocument ? (
                <>
                  <div className="mx-auto h-28 w-20 rounded-sm border bg-background shadow-xs">
                    <div className="h-full animate-pulse bg-muted" />
                  </div>
                  <div className="mx-auto mt-3 h-3 w-10 rounded-full bg-muted" />
                </>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {thumbnails.slice(0, pageCount || 0).map((thumbnail) => (
                    <Button
                      key={thumbnail.pageIndex}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "!h-auto w-full flex-col items-center gap-2 p-2 text-xs text-muted-foreground shadow-none hover:bg-sidebar-accent",
                        thumbnail.pageNumber === activePage &&
                          "bg-sidebar-accent"
                      )}
                      onFocus={(event) => event.currentTarget.blur()}
                      onClick={() => scrollToPage(thumbnail.pageNumber)}
                    >
                      <DocxSidebarThumbnail
                        canvasRef={thumbnail.canvasRef}
                        displayFileName={displayFileName}
                        hasError={thumbnail.status === "error"}
                        isActive={thumbnail.pageNumber === activePage}
                        isLoading={
                          !thumbnail.isMounted &&
                          thumbnail.status !== "ready" &&
                          thumbnail.status !== "error"
                        }
                        pageNumber={thumbnail.pageNumber}
                        pixelHeightPx={thumbnail.pixelHeightPx}
                        pixelWidthPx={thumbnail.pixelWidthPx}
                        previewAspectRatio={thumbnail.aspectRatio}
                      />
                      {thumbnail.pageNumber}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </DocumentViewerThumbnailSidebar>
        <div
          ref={viewportRef}
          className={cn(
            "min-h-0 flex-1 overflow-auto p-4",
            rounded && "rounded-b-lg"
          )}
          style={{ backgroundColor: viewerBackgroundColor }}
        >
          {!url && !uploadedDocxFile ? (
            <div className="grid h-full min-h-96 place-items-center p-6 text-center">
              <div className="max-w-md rounded-lg border bg-background p-4 text-sm shadow-xs">
                <div className="font-medium">Upload a DOCX to edit</div>
                <div className="mt-1 text-muted-foreground">
                  Pass a DOCX URL with the <code>src</code> prop or upload a
                  file.
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <HugeiconsIcon icon={Upload01Icon} className="size-4" />
                  Upload DOCX
                </Button>
              </div>
            </div>
          ) : loadError ? (
            <div className="grid h-full min-h-96 place-items-center p-6 text-center">
              <div className="max-w-md rounded-lg border bg-background p-4 text-sm text-destructive shadow-xs">
                <div className="font-medium">Unable to edit DOCX</div>
                <div className="mt-1 text-muted-foreground">{loadError}</div>
              </div>
            </div>
          ) : isLoadingDocument ? (
            loadingState
          ) : (
            <div className="mx-auto flex min-h-full justify-center">
              <div
                className={cn(
                  "origin-top",
                  editor.documentTheme === "dark" && "docx-night-reader-shell"
                )}
                style={{ zoom: zoomScale / 100 }}
              >
                <DocxEditorViewer
                  editor={editor}
                  mode={isReadOnly ? "read-only" : "edit"}
                  showTrackedChanges={editor.showTrackedChanges}
                  loadingState={loadingState}
                  pageBackgroundColor={
                    editor.documentTheme === "dark" ? "#0a0a0a" : undefined
                  }
                  pageGapBackgroundColor={viewerBackgroundColor}
                  pageVirtualization={{ enabled: false }}
                  deferInitialPaginationPaint={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
