"use client"

import * as React from "react"
import {
  blendModeLabel,
  blendModeValues,
  makeStandardFont,
  PDF_FORM_FIELD_FLAG,
  PDF_FORM_FIELD_TYPE,
  PdfAnnotationBorderStyle,
  PdfAnnotationLineEnding,
  PdfAnnotationSubtype,
  PdfStandardFont,
  PdfStandardFontFamily,
  PdfTextAlignment,
  PdfVerticalAlignment,
  STANDARD_FONT_FAMILIES,
  standardFontFamily,
  standardFontIsBold,
  standardFontIsItalic,
  type LineEndings,
  type PdfAnnotationFlagName,
  type PdfAnnotationObject,
  type PdfTextWidgetAnnoField,
  type PdfWidgetAnnoField,
  type PdfWidgetAnnoObject,
  type PdfWidgetAnnoOption,
} from "@embedpdf/models"
import {
  getSelectedAnnotations,
  useAnnotation,
  useAnnotationCapability,
  type AnnotationTool,
  type TrackedAnnotation,
} from "@embedpdf/plugin-annotation/react"
import { useFormCapability } from "@embedpdf/plugin-form/react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ColorPicker } from "@/components/ui/color-picker"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle"
import {
  AlignBottomGlyph,
  AlignCenterGlyph,
  AlignLeftGlyph,
  AlignMiddleGlyph,
  AlignRightGlyph,
  AlignTopGlyph,
  BoldGlyph,
  formatDateTime,
  getAnnotationMeta,
  ItalicGlyph,
  PdfEditorEmptyState,
  PdfEditorFieldLabel,
  PdfEditorSection,
  PdfEditorSwatch,
  SlidersGlyph,
  TrashGlyph,
  usePdfEditor,
} from "@/components/extend/pdf-editor-shared"

/* -------------------------------------------------------------------------- */
/* Property schema                                                            */
/* -------------------------------------------------------------------------- */

type PropertyKind =
  | "color"
  | "colorWithTransparent"
  | "opacity"
  | "strokeWidth"
  | "strokeStyle"
  | "strokeStyleWithCloudy"
  | "linkStrokeStyle"
  | "lineEnding"
  | "lineEndings"
  | "fontFamily"
  | "fontSize"
  | "fontColor"
  | "textAlign"
  | "verticalAlign"
  | "blendMode"
  | "overlayText"
  | "rotation"

type PropertyConfig = {
  key: string
  kind: PropertyKind
  label: string
  /** Only shown while editing an existing annotation, never for tool defaults. */
  editOnly?: boolean
}

const PROPERTY_CONFIGS: Record<string, PropertyConfig> = {
  color: { key: "color", kind: "colorWithTransparent", label: "Fill" },
  strokeColor: {
    key: "strokeColor",
    kind: "colorWithTransparent",
    label: "Stroke",
  },
  markupColor: { key: "strokeColor", kind: "color", label: "Color" },
  opacity: { key: "opacity", kind: "opacity", label: "Opacity" },
  strokeWidth: {
    key: "strokeWidth",
    kind: "strokeWidth",
    label: "Stroke width",
  },
  strokeStyle: {
    key: "strokeStyle",
    kind: "strokeStyle",
    label: "Border style",
  },
  strokeStyleWithCloudy: {
    key: "strokeStyle",
    kind: "strokeStyleWithCloudy",
    label: "Border style",
  },
  linkStrokeStyle: {
    key: "strokeStyle",
    kind: "linkStrokeStyle",
    label: "Border style",
  },
  lineEnding: {
    key: "lineEnding",
    kind: "lineEnding",
    label: "Line ending",
  },
  lineEndings: {
    key: "lineEndings",
    kind: "lineEndings",
    label: "Line endings",
  },
  fontFamily: { key: "fontFamily", kind: "fontFamily", label: "Font" },
  fontSize: { key: "fontSize", kind: "fontSize", label: "Font size" },
  fontColor: { key: "fontColor", kind: "fontColor", label: "Text color" },
  textAlign: { key: "textAlign", kind: "textAlign", label: "Alignment" },
  verticalAlign: {
    key: "verticalAlign",
    kind: "verticalAlign",
    label: "Vertical alignment",
  },
  blendMode: { key: "blendMode", kind: "blendMode", label: "Blend mode" },
  overlayText: {
    key: "overlayText",
    kind: "overlayText",
    label: "Overlay text",
  },
  rotation: {
    key: "rotation",
    kind: "rotation",
    label: "Rotation",
    editOnly: true,
  },
}

/** Ordered property lists keyed by EmbedPDF tool id. */
const TOOL_PROPERTIES: Record<string, string[]> = {
  highlight: ["markupColor", "opacity", "blendMode"],
  underline: ["markupColor", "opacity", "blendMode"],
  strikeout: ["markupColor", "opacity", "blendMode"],
  squiggly: ["markupColor", "opacity", "blendMode"],
  ink: ["markupColor", "opacity", "strokeWidth", "rotation"],
  inkHighlighter: [
    "markupColor",
    "opacity",
    "strokeWidth",
    "blendMode",
    "rotation",
  ],
  signatureInk: ["markupColor", "opacity", "strokeWidth", "rotation"],
  circle: [
    "color",
    "opacity",
    "strokeColor",
    "strokeStyleWithCloudy",
    "strokeWidth",
    "rotation",
  ],
  square: [
    "color",
    "opacity",
    "strokeColor",
    "strokeStyleWithCloudy",
    "strokeWidth",
    "rotation",
  ],
  polygon: [
    "strokeColor",
    "opacity",
    "strokeStyleWithCloudy",
    "strokeWidth",
    "color",
    "rotation",
  ],
  line: [
    "strokeColor",
    "opacity",
    "strokeStyle",
    "strokeWidth",
    "lineEndings",
    "color",
    "rotation",
  ],
  lineArrow: [
    "strokeColor",
    "opacity",
    "strokeStyle",
    "strokeWidth",
    "lineEndings",
    "color",
    "rotation",
  ],
  polyline: [
    "strokeColor",
    "opacity",
    "strokeStyle",
    "strokeWidth",
    "lineEndings",
    "color",
    "rotation",
  ],
  textComment: ["markupColor", "opacity"],
  insertText: ["markupColor", "opacity"],
  replaceText: ["markupColor", "opacity"],
  freeText: [
    "fontFamily",
    "fontSize",
    "fontColor",
    "textAlign",
    "verticalAlign",
    "opacity",
    "color",
    "rotation",
  ],
  freeTextCallout: [
    "fontFamily",
    "fontSize",
    "fontColor",
    "textAlign",
    "verticalAlign",
    "opacity",
    "color",
    "markupColor",
    "strokeWidth",
    "lineEnding",
  ],
  stamp: ["rotation"],
  rubberStamp: ["rotation"],
  signatureStamp: ["rotation"],
  redact: ["strokeColor", "color", "opacity", "overlayText"],
  link: ["strokeColor", "strokeWidth", "linkStrokeStyle"],
  formTextField: [
    "fontSize",
    "fontColor",
    "strokeColor",
    "strokeWidth",
    "color",
  ],
  formCheckbox: ["strokeColor", "color", "strokeWidth"],
  formCombobox: [
    "fontSize",
    "fontColor",
    "strokeColor",
    "strokeWidth",
    "color",
  ],
  formListbox: [
    "fontFamily",
    "fontSize",
    "fontColor",
    "strokeColor",
    "strokeWidth",
    "color",
  ],
  formRadioButton: ["strokeColor", "color", "strokeWidth"],
}

function getSharedProperties(toolIds: string[]) {
  const unique = [...new Set(toolIds)]

  if (unique.length === 0) return []

  const first = new Set(TOOL_PROPERTIES[unique[0]] ?? [])

  for (const id of unique.slice(1)) {
    const own = new Set(TOOL_PROPERTIES[id] ?? [])
    for (const property of first) {
      if (!own.has(property)) first.delete(property)
    }
  }

  return (TOOL_PROPERTIES[unique[0]] ?? []).filter((property) =>
    first.has(property)
  )
}

const FONT_SIZE_PRESETS = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72,
]

const LINE_ENDING_OPTIONS: Array<{
  value: PdfAnnotationLineEnding
  label: string
}> = [
  { value: PdfAnnotationLineEnding.None, label: "None" },
  { value: PdfAnnotationLineEnding.OpenArrow, label: "Open arrow" },
  { value: PdfAnnotationLineEnding.ClosedArrow, label: "Closed arrow" },
  { value: PdfAnnotationLineEnding.ROpenArrow, label: "Reverse open arrow" },
  {
    value: PdfAnnotationLineEnding.RClosedArrow,
    label: "Reverse closed arrow",
  },
  { value: PdfAnnotationLineEnding.Square, label: "Square" },
  { value: PdfAnnotationLineEnding.Circle, label: "Circle" },
  { value: PdfAnnotationLineEnding.Diamond, label: "Diamond" },
  { value: PdfAnnotationLineEnding.Butt, label: "Butt" },
  { value: PdfAnnotationLineEnding.Slash, label: "Slash" },
]

const FLAG_OPTIONS: Array<{
  flag: PdfAnnotationFlagName
  label: string
  description: string
}> = [
  {
    flag: "locked",
    label: "Lock position",
    description: "Prevents moving, resizing, and deleting.",
  },
  {
    flag: "lockedContents",
    label: "Lock contents",
    description: "Prevents editing the text.",
  },
  {
    flag: "print",
    label: "Print",
    description: "Include when printing.",
  },
]

/* -------------------------------------------------------------------------- */
/* Controls                                                                   */
/* -------------------------------------------------------------------------- */

function useDebouncedCommit<T>(
  value: T,
  onCommit: (value: T) => void,
  delay = 150
) {
  const [draft, setDraft] = React.useState(value)
  const timeoutRef = React.useRef<number | null>(null)
  const onCommitRef = React.useRef(onCommit)

  React.useEffect(() => {
    onCommitRef.current = onCommit
  })

  const [previousValue, setPreviousValue] = React.useState(value)
  if (!Object.is(previousValue, value)) {
    setPreviousValue(value)
    setDraft(value)
  }

  React.useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    },
    []
  )

  const update = React.useCallback(
    (next: T) => {
      setDraft(next)

      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)

      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null
        onCommitRef.current(next)
      }, delay)
    },
    [delay]
  )

  return [draft, update] as const
}

function PropertySwitch({
  checked,
  disabled,
  label,
  description,
  onCheckedChange,
}: {
  checked: boolean
  disabled?: boolean
  label: React.ReactNode
  description?: React.ReactNode
  onCheckedChange: (checked: boolean) => void
}) {
  const id = React.useId()

  return (
    <label
      htmlFor={id}
      data-slot="label"
      className={cn(
        "flex items-center justify-between gap-4 rounded-md px-1 py-1",
        disabled ? "cursor-not-allowed opacity-64" : "cursor-pointer"
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm leading-4">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
      />
    </label>
  )
}

function ColorControl({
  label,
  value,
  presets,
  allowTransparent,
  onChange,
}: {
  label: string
  value: string | undefined
  presets: string[]
  allowTransparent: boolean
  onChange: (value: string) => void
}) {
  const current = (value ?? "").toLowerCase()
  const isTransparent = !value || current === "transparent"
  const pickerSource = isTransparent ? "#111827" : (value ?? "#111827")

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <PdfEditorFieldLabel>{label}</PdfEditorFieldLabel>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {isTransparent ? "None" : current}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((preset) => (
          <PdfEditorSwatch
            key={preset}
            color={preset}
            active={!isTransparent && current === preset.toLowerCase()}
            onClick={() => onChange(preset)}
          />
        ))}
        {allowTransparent ? (
          <PdfEditorSwatch
            color="transparent"
            label="No fill"
            active={isTransparent}
            onClick={() => onChange("transparent")}
          />
        ) : null}
        <ColorPicker
          label={`Custom ${label.toLowerCase()}`}
          rainbowTrigger
          color={pickerSource}
          onChange={onChange}
        />
      </div>
    </div>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (value: number) => void
}) {
  const [draft, update] = useDebouncedCommit(value, onChange)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <PdfEditorFieldLabel>{label}</PdfEditorFieldLabel>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {format(draft)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={draft}
        aria-label={label}
        onChange={(event) => update(Number(event.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
      />
    </div>
  )
}

type StrokeStyleValue =
  | "solid"
  | "dotted"
  | "short-dashed"
  | "dashed"
  | "long-dashed"
  | "dash-dot"
  | "long-dash-dot"
  | "dash-dot-dot"
  | "cloudy-1"
  | "cloudy-2"
  | "underline"
  | "custom"

const STROKE_STYLE_PRESETS: Array<{
  value: Exclude<
    StrokeStyleValue,
    "cloudy-1" | "cloudy-2" | "underline" | "custom"
  >
  label: string
  dashArray?: number[]
}> = [
  { value: "solid", label: "Solid" },
  { value: "dotted", label: "Dotted", dashArray: [1, 2] },
  { value: "short-dashed", label: "Short dashed", dashArray: [2, 2] },
  { value: "dashed", label: "Dashed", dashArray: [4, 3] },
  { value: "long-dashed", label: "Long dashed", dashArray: [8, 4] },
  { value: "dash-dot", label: "Dash dot", dashArray: [6, 3, 1, 3] },
  {
    value: "long-dash-dot",
    label: "Long dash dot",
    dashArray: [10, 4, 1, 4],
  },
  {
    value: "dash-dot-dot",
    label: "Dash dot dot",
    dashArray: [6, 3, 1, 3, 1, 3],
  },
]

function getStrokeDashArray(value: StrokeStyleValue) {
  return STROKE_STYLE_PRESETS.find((preset) => preset.value === value)
    ?.dashArray
}

function StrokeStylePreview({
  value,
  dashArray,
}: {
  value: StrokeStyleValue
  dashArray?: number[]
}) {
  const path =
    value === "cloudy-2"
      ? "M1 8 Q3 2 5 8 Q7 2 9 8 Q11 2 13 8 Q15 2 17 8 Q19 2 21 8 Q23 2 25 8 Q27 2 29 8 Q31 2 33 8 Q35 2 37 8 Q39 2 41 8 Q43 2 45 8 Q47 2 49 8 Q51 2 55 8"
      : "M1 8 Q5 1 9 8 Q13 1 17 8 Q21 1 25 8 Q29 1 33 8 Q37 1 41 8 Q45 1 49 8 Q53 1 55 8"
  const resolvedDashArray = dashArray ?? getStrokeDashArray(value)

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 56 12"
      className="h-6! w-24! shrink-0 text-foreground"
    >
      <path
        d={value.startsWith("cloudy") ? path : "M1 6H55"}
        fill="none"
        stroke="currentColor"
        strokeDasharray={resolvedDashArray?.join(" ")}
        strokeLinecap="round"
        strokeWidth="2.25"
      />
    </svg>
  )
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{
    value: string
    label: string
    preview?: React.ReactNode
  }>
  onChange: (value: string) => void
}) {
  const selectedOption =
    options.find((option) => option.value === value) ?? null

  return (
    <div className="space-y-1.5">
      <PdfEditorFieldLabel>{label}</PdfEditorFieldLabel>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          if (next) onChange(String(next))
        }}
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue placeholder={label}>
            {selectedOption ? (
              <span className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <span className="truncate">{selectedOption.label}</span>
                {selectedOption.preview}
              </span>
            ) : (
              label
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className={cn(option.preview && "py-0.5 pe-2")}
            >
              <span className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <span className="truncate">{option.label}</span>
                {option.preview}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function getStrokeStyleValue(
  strokeStyle: PdfAnnotationBorderStyle | undefined,
  cloudyBorderIntensity: number | undefined,
  strokeDashArray: number[] | undefined
): StrokeStyleValue {
  if (
    strokeStyle === PdfAnnotationBorderStyle.CLOUDY ||
    (cloudyBorderIntensity ?? 0) > 0
  ) {
    return (cloudyBorderIntensity ?? 1) >= 2 ? "cloudy-2" : "cloudy-1"
  }

  if (strokeStyle === PdfAnnotationBorderStyle.UNDERLINE) return "underline"

  if (strokeStyle === PdfAnnotationBorderStyle.DASHED) {
    const preset = STROKE_STYLE_PRESETS.find((item) => {
      if (!item.dashArray || !strokeDashArray) return false
      if (item.dashArray.length !== strokeDashArray.length) return false

      return item.dashArray.every(
        (part, index) => part === strokeDashArray[index]
      )
    })

    return preset?.value ?? "custom"
  }

  return "solid"
}

function getStrokeStylePatch(
  value: StrokeStyleValue,
  customDashArray?: number[]
) {
  const dashArray = getStrokeDashArray(value)

  if (dashArray || value === "custom") {
    return {
      strokeStyle: PdfAnnotationBorderStyle.DASHED,
      strokeDashArray: dashArray ?? customDashArray ?? [4, 3],
      cloudyBorderIntensity: 0,
    }
  }

  switch (value) {
    case "underline":
      return {
        strokeStyle: PdfAnnotationBorderStyle.UNDERLINE,
        strokeDashArray: undefined,
        cloudyBorderIntensity: 0,
      }
    case "cloudy-1":
      return {
        strokeStyle: PdfAnnotationBorderStyle.CLOUDY,
        strokeDashArray: undefined,
        cloudyBorderIntensity: 1,
      }
    case "cloudy-2":
      return {
        strokeStyle: PdfAnnotationBorderStyle.CLOUDY,
        strokeDashArray: undefined,
        cloudyBorderIntensity: 2,
      }
    default:
      return {
        strokeStyle: PdfAnnotationBorderStyle.SOLID,
        strokeDashArray: undefined,
        cloudyBorderIntensity: 0,
      }
  }
}

function FontControl({
  value,
  onChange,
}: {
  value: PdfStandardFont | undefined
  onChange: (value: PdfStandardFont) => void
}) {
  const font = value ?? PdfStandardFont.Helvetica
  const family = standardFontFamily(font)
  const bold = standardFontIsBold(font)
  const italic = standardFontIsItalic(font)
  const supportsStyles =
    family !== PdfStandardFontFamily.Symbol &&
    family !== PdfStandardFontFamily.ZapfDingbats
  const familyOptions = STANDARD_FONT_FAMILIES.filter(
    (item) => item !== PdfStandardFontFamily.Unknown
  ).map((item) => ({ label: item, value: item }))

  const apply = (
    nextFamily: PdfStandardFontFamily,
    nextBold: boolean,
    nextItalic: boolean
  ) => {
    const next =
      makeStandardFont(nextFamily, { bold: nextBold, italic: nextItalic }) ??
      makeStandardFont(nextFamily, { bold: false, italic: false })

    if (next !== undefined && next !== PdfStandardFont.Unknown) onChange(next)
  }

  return (
    <div className="space-y-1.5">
      <PdfEditorFieldLabel>Font</PdfEditorFieldLabel>
      <div className="flex items-center gap-1.5">
        <Select
          items={familyOptions}
          value={family}
          onValueChange={(next) =>
            apply(String(next) as PdfStandardFontFamily, bold, italic)
          }
        >
          <SelectTrigger size="sm" className="min-w-0 flex-1">
            <SelectValue placeholder="Font" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {familyOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup
          multiple
          value={[bold ? "bold" : "", italic ? "italic" : ""].filter(Boolean)}
          onValueChange={(next: string[]) =>
            apply(family, next.includes("bold"), next.includes("italic"))
          }
          spacing="none"
          className="shrink-0"
        >
          <ToggleGroupItem
            value="bold"
            size="sm"
            variant="outline"
            aria-label="Bold"
            disabled={!supportsStyles}
          >
            <BoldGlyph className="size-3.5" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="italic"
            size="sm"
            variant="outline"
            aria-label="Italic"
            disabled={!supportsStyles}
          >
            <ItalicGlyph className="size-3.5" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  )
}

function FontSizeControl({
  value,
  onChange,
}: {
  value: number | undefined
  onChange: (value: number) => void
}) {
  const [draft, update] = useDebouncedCommit(value ?? 12, onChange, 250)
  const sizeOptions = (
    FONT_SIZE_PRESETS.includes(draft)
      ? FONT_SIZE_PRESETS
      : [...FONT_SIZE_PRESETS, draft].sort((a, b) => a - b)
  ).map((size) => ({ label: `${size} pt`, value: String(size) }))

  return (
    <div className="space-y-1.5">
      <PdfEditorFieldLabel>Font size</PdfEditorFieldLabel>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          size="sm"
          min={4}
          max={200}
          value={draft}
          className="w-20"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const next = Number(event.target.value)
            if (Number.isFinite(next) && next > 0) update(next)
          }}
        />
        <Select
          items={sizeOptions}
          value={String(draft)}
          onValueChange={(next) => onChange(Number(next))}
        >
          <SelectTrigger size="sm" className="min-w-0 flex-1">
            <SelectValue placeholder="Size" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {sizeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function AlignControl({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string; glyph: React.ReactNode }>
}) {
  return (
    <div className="space-y-1.5">
      <PdfEditorFieldLabel>{label}</PdfEditorFieldLabel>
      <ToggleGroup
        value={[value]}
        onValueChange={(next: string[]) => {
          const selected = next[0]
          if (selected !== undefined) onChange(selected)
        }}
        spacing="none"
      >
        {options.map((option) => (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            size="sm"
            variant="outline"
            aria-label={option.label}
          >
            {option.glyph}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

function LineEndingPreview({ value }: { value: PdfAnnotationLineEnding }) {
  const isOpenArrow =
    value === PdfAnnotationLineEnding.OpenArrow ||
    value === PdfAnnotationLineEnding.ROpenArrow
  const isClosedArrow =
    value === PdfAnnotationLineEnding.ClosedArrow ||
    value === PdfAnnotationLineEnding.RClosedArrow
  const isReverse =
    value === PdfAnnotationLineEnding.ROpenArrow ||
    value === PdfAnnotationLineEnding.RClosedArrow
  const lineEndX = isReverse
    ? isClosedArrow
      ? 58
      : 56
    : isClosedArrow
      ? 68
      : 66

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 72 16"
      className="h-6! w-24! shrink-0 text-foreground"
    >
      <path
        d={`M2 8H${lineEndX}`}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
      {isOpenArrow ? (
        <path
          d={isReverse ? "M56 8 66 2M56 8l10 6" : "M66 8 56 2M66 8l-10 6"}
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
      ) : null}
      {isClosedArrow ? (
        <path
          d={isReverse ? "m58 8 10-6v12Z" : "m68 8-10-6v12Z"}
          fill="currentColor"
        />
      ) : null}
      {value === PdfAnnotationLineEnding.Square ? (
        <rect x="60" y="2" width="12" height="12" fill="currentColor" />
      ) : null}
      {value === PdfAnnotationLineEnding.Circle ? (
        <circle cx="66" cy="8" r="6" fill="currentColor" />
      ) : null}
      {value === PdfAnnotationLineEnding.Diamond ? (
        <path d="m66 2 6 6-6 6-6-6Z" fill="currentColor" />
      ) : null}
      {value === PdfAnnotationLineEnding.Butt ? (
        <path d="M66 2v12" stroke="currentColor" strokeWidth="2.5" />
      ) : null}
      {value === PdfAnnotationLineEnding.Slash ? (
        <path d="m60 14 12-12" stroke="currentColor" strokeWidth="2.5" />
      ) : null}
    </svg>
  )
}

function LineEndingsControl({
  value,
  onChange,
}: {
  value: LineEndings | undefined
  onChange: (value: LineEndings) => void
}) {
  const start = value?.start ?? PdfAnnotationLineEnding.None
  const end = value?.end ?? PdfAnnotationLineEnding.None
  const options = LINE_ENDING_OPTIONS.map((option) => ({
    value: String(option.value),
    label: option.label,
    preview: <LineEndingPreview value={option.value} />,
  }))

  return (
    <div className="space-y-2">
      <SelectControl
        label="Line start"
        value={String(start)}
        options={options}
        onChange={(next) =>
          onChange({ start: Number(next) as PdfAnnotationLineEnding, end })
        }
      />
      <SelectControl
        label="Line end"
        value={String(end)}
        options={options}
        onChange={(next) =>
          onChange({ start, end: Number(next) as PdfAnnotationLineEnding })
        }
      />
    </div>
  )
}

function LineEndingControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: PdfAnnotationLineEnding | undefined
  onChange: (value: PdfAnnotationLineEnding) => void
}) {
  const options = LINE_ENDING_OPTIONS.map((option) => ({
    value: String(option.value),
    label: option.label,
    preview: <LineEndingPreview value={option.value} />,
  }))

  return (
    <SelectControl
      label={label}
      value={String(value ?? PdfAnnotationLineEnding.None)}
      options={options}
      onChange={(next) => onChange(Number(next) as PdfAnnotationLineEnding)}
    />
  )
}

function TextControl({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  const [draft, update] = useDebouncedCommit(value, onChange, 400)

  return (
    <div className="space-y-1.5">
      <PdfEditorFieldLabel>{label}</PdfEditorFieldLabel>
      <Input
        size="sm"
        value={draft}
        placeholder={placeholder}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          update(event.target.value)
        }
      />
    </div>
  )
}

function RotationControl({
  value,
  onChange,
}: {
  value: number
  onChange: (value: number) => void
}) {
  const [draft, update] = useDebouncedCommit(value, onChange, 250)

  return (
    <div className="space-y-1.5">
      <PdfEditorFieldLabel>Rotation</PdfEditorFieldLabel>
      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          size="sm"
          min={0}
          max={359}
          value={Math.round(draft)}
          className="w-20"
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            update(((Number(event.target.value) % 360) + 360) % 360)
          }
        />
        <span className="text-xs text-muted-foreground">degrees</span>
        {[0, 90, 180, 270].map((preset) => (
          <Button
            key={preset}
            type="button"
            size="xs"
            variant={draft === preset ? "secondary" : "ghost"}
            onClick={() => {
              update(preset)
            }}
          >
            {preset}°
          </Button>
        ))}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Property list                                                              */
/* -------------------------------------------------------------------------- */

function PropertyControl({
  config,
  values,
  colorPresets,
  onPatch,
  onRotate,
}: {
  config: PropertyConfig
  values: Record<string, unknown>
  colorPresets: string[]
  onPatch: (patch: Record<string, unknown>) => void
  onRotate?: (rotation: number) => void
}) {
  const value = values[config.key]

  switch (config.kind) {
    case "color":
    case "colorWithTransparent":
    case "fontColor":
      return (
        <ColorControl
          label={config.label}
          value={typeof value === "string" ? value : undefined}
          presets={colorPresets}
          allowTransparent={config.kind === "colorWithTransparent"}
          onChange={(next) => onPatch({ [config.key]: next })}
        />
      )
    case "opacity":
      return (
        <SliderControl
          label={config.label}
          value={typeof value === "number" ? value : 1}
          min={0}
          max={1}
          step={0.05}
          format={(item) => `${Math.round(item * 100)}%`}
          onChange={(next) => onPatch({ [config.key]: next })}
        />
      )
    case "strokeWidth":
      return (
        <SliderControl
          label={config.label}
          value={typeof value === "number" ? value : 1}
          min={1}
          max={30}
          step={1}
          format={(item) => `${item} pt`}
          onChange={(next) => onPatch({ [config.key]: next })}
        />
      )
    case "strokeStyle":
    case "strokeStyleWithCloudy":
    case "linkStrokeStyle": {
      const strokeDashArray = values.strokeDashArray as number[] | undefined
      const selectedValue = getStrokeStyleValue(
        value as PdfAnnotationBorderStyle | undefined,
        values.cloudyBorderIntensity as number | undefined,
        strokeDashArray
      )
      const options: Array<{
        value: string
        label: string
        preview: React.ReactNode
      }> = STROKE_STYLE_PRESETS.map((preset) => ({
        value: preset.value,
        label: preset.label,
        preview: (
          <StrokeStylePreview
            value={preset.value}
            dashArray={preset.dashArray}
          />
        ),
      }))

      if (config.kind === "linkStrokeStyle") {
        options.splice(1, 0, {
          value: "underline",
          label: "Underline",
          preview: <StrokeStylePreview value="underline" />,
        })
      }

      if (config.kind === "strokeStyleWithCloudy") {
        options.push(
          {
            value: "cloudy-1",
            label: "Cloudy",
            preview: <StrokeStylePreview value="cloudy-1" />,
          },
          {
            value: "cloudy-2",
            label: "Cloudy (dense)",
            preview: <StrokeStylePreview value="cloudy-2" />,
          }
        )
      }

      if (selectedValue === "custom") {
        options.push({
          value: "custom",
          label: "Custom dashed",
          preview: (
            <StrokeStylePreview value="custom" dashArray={strokeDashArray} />
          ),
        })
      }

      return (
        <SelectControl
          label={config.label}
          value={selectedValue}
          options={options}
          onChange={(next) =>
            onPatch(
              getStrokeStylePatch(next as StrokeStyleValue, strokeDashArray)
            )
          }
        />
      )
    }
    case "lineEnding":
      return (
        <LineEndingControl
          label={config.label}
          value={value as PdfAnnotationLineEnding | undefined}
          onChange={(next) => onPatch({ [config.key]: next })}
        />
      )
    case "lineEndings":
      return (
        <LineEndingsControl
          value={value as LineEndings | undefined}
          onChange={(next) => onPatch({ lineEndings: next })}
        />
      )
    case "fontFamily":
      return (
        <FontControl
          value={value as PdfStandardFont | undefined}
          onChange={(next) => onPatch({ fontFamily: next })}
        />
      )
    case "fontSize":
      return (
        <FontSizeControl
          value={typeof value === "number" ? value : undefined}
          onChange={(next) => onPatch({ fontSize: next })}
        />
      )
    case "textAlign":
      return (
        <AlignControl
          label={config.label}
          value={String(value ?? PdfTextAlignment.Left)}
          onChange={(next) => onPatch({ textAlign: Number(next) })}
          options={[
            {
              value: String(PdfTextAlignment.Left),
              label: "Align left",
              glyph: <AlignLeftGlyph className="size-3.5" />,
            },
            {
              value: String(PdfTextAlignment.Center),
              label: "Align center",
              glyph: <AlignCenterGlyph className="size-3.5" />,
            },
            {
              value: String(PdfTextAlignment.Right),
              label: "Align right",
              glyph: <AlignRightGlyph className="size-3.5" />,
            },
          ]}
        />
      )
    case "verticalAlign":
      return (
        <AlignControl
          label={config.label}
          value={String(value ?? PdfVerticalAlignment.Top)}
          onChange={(next) => onPatch({ verticalAlign: Number(next) })}
          options={[
            {
              value: String(PdfVerticalAlignment.Top),
              label: "Align top",
              glyph: <AlignTopGlyph className="size-3.5" />,
            },
            {
              value: String(PdfVerticalAlignment.Middle),
              label: "Align middle",
              glyph: <AlignMiddleGlyph className="size-3.5" />,
            },
            {
              value: String(PdfVerticalAlignment.Bottom),
              label: "Align bottom",
              glyph: <AlignBottomGlyph className="size-3.5" />,
            },
          ]}
        />
      )
    case "blendMode":
      return (
        <SelectControl
          label={config.label}
          value={String(value ?? 0)}
          options={blendModeValues.map((mode) => ({
            value: String(mode),
            label: blendModeLabel(mode),
          }))}
          onChange={(next) => onPatch({ blendMode: Number(next) })}
        />
      )
    case "overlayText":
      return (
        <TextControl
          label={config.label}
          value={typeof value === "string" ? value : ""}
          placeholder="e.g. REDACTED"
          onChange={(next) => onPatch({ overlayText: next })}
        />
      )
    case "rotation":
      return (
        <RotationControl
          value={typeof value === "number" ? value : 0}
          onChange={(next) =>
            onRotate ? onRotate(next) : onPatch({ rotation: next })
          }
        />
      )
    default:
      return null
  }
}

/* -------------------------------------------------------------------------- */
/* Widget (form field) properties                                             */
/* -------------------------------------------------------------------------- */

const FIELD_TYPE_LABELS: Partial<Record<PDF_FORM_FIELD_TYPE, string>> = {
  [PDF_FORM_FIELD_TYPE.TEXTFIELD]: "Text field",
  [PDF_FORM_FIELD_TYPE.CHECKBOX]: "Checkbox",
  [PDF_FORM_FIELD_TYPE.RADIOBUTTON]: "Radio button",
  [PDF_FORM_FIELD_TYPE.COMBOBOX]: "Dropdown",
  [PDF_FORM_FIELD_TYPE.LISTBOX]: "List box",
  [PDF_FORM_FIELD_TYPE.PUSHBUTTON]: "Button",
  [PDF_FORM_FIELD_TYPE.SIGNATURE]: "Signature field",
}

export function getFormFieldTypeLabel(type: PDF_FORM_FIELD_TYPE) {
  return FIELD_TYPE_LABELS[type] ?? "Form field"
}

function WidgetProperties({
  documentId,
  widget,
}: {
  documentId: string
  widget: PdfWidgetAnnoObject
}) {
  const { provides: annotation } = useAnnotation(documentId)
  const { provides: form } = useFormCapability()
  const { openDialog, notify } = usePdfEditor()
  const [nameDraft, setNameDraft] = React.useState(widget.field.name)
  const [nameError, setNameError] = React.useState<string | null>(null)
  const field = widget.field
  const fieldLabel = getFormFieldTypeLabel(field.type)

  const [previousField, setPreviousField] = React.useState({
    id: widget.id,
    name: widget.field.name,
  })
  if (
    previousField.id !== widget.id ||
    previousField.name !== widget.field.name
  ) {
    setPreviousField({ id: widget.id, name: widget.field.name })
    setNameDraft(widget.field.name)
    setNameError(null)
  }

  const updateField = React.useCallback(
    (patch: Partial<PdfWidgetAnnoField>) => {
      annotation?.updateAnnotations([
        {
          pageIndex: widget.pageIndex,
          id: widget.id,
          patch: { field: { ...widget.field, ...patch } as PdfWidgetAnnoField },
        },
      ])
    },
    [annotation, widget.field, widget.id, widget.pageIndex]
  )

  const toggleFlag = (flag: PDF_FORM_FIELD_FLAG, enabled: boolean) => {
    const current = field.flag ?? PDF_FORM_FIELD_FLAG.NONE
    updateField({ flag: enabled ? current | flag : current & ~flag })
  }

  const commitName = () => {
    const nextName = nameDraft.trim()

    if (!form || !nextName || nextName === field.name) {
      setNameDraft(field.name)
      return
    }

    form.renameField(widget.id, nextName, documentId).wait(
      (result) => {
        setNameError(null)

        if (result.outcome === "conflict") {
          openDialog({
            type: "confirm",
            title: "Share this field?",
            description: `A ${fieldLabel.toLowerCase()} named "${result.fieldName}" already exists. Sharing makes both widgets show the same value.`,
            confirmLabel: "Share field",
            onConfirm: () => {
              form
                .shareField(widget.id, result.targetAnnotationId, documentId)
                .wait(
                  () => notify("Field shared.", "success"),
                  (failure) => {
                    setNameError(failure.reason.message)
                    setNameDraft(field.name)
                  }
                )
            },
          })
        }
      },
      (failure) => {
        setNameError(failure.reason.message)
        setNameDraft(field.name)
      }
    )
  }

  const options: PdfWidgetAnnoOption[] =
    field.type === PDF_FORM_FIELD_TYPE.COMBOBOX ||
    field.type === PDF_FORM_FIELD_TYPE.LISTBOX
      ? ((field as { options?: PdfWidgetAnnoOption[] }).options ?? [])
      : []
  const setOptions = (next: PdfWidgetAnnoOption[]) =>
    updateField({ options: next } as Partial<PdfWidgetAnnoField>)

  const isTextField = field.type === PDF_FORM_FIELD_TYPE.TEXTFIELD
  const textField = field as PdfTextWidgetAnnoField
  const maxLength = isTextField ? (textField.maxLen ?? 0) : 0
  const isComb = Boolean(field.flag & PDF_FORM_FIELD_FLAG.TEXT_COMB)

  return (
    <PdfEditorSection title={`${fieldLabel} settings`}>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <PdfEditorFieldLabel htmlFor={`pdf-editor-field-name-${widget.id}`}>
            Field name
          </PdfEditorFieldLabel>
          <Input
            id={`pdf-editor-field-name-${widget.id}`}
            size="sm"
            value={nameDraft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setNameDraft(event.target.value)
            }
            onBlur={commitName}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === "Enter") event.currentTarget.blur()
            }}
          />
          {nameError ? (
            <div className="text-xs text-destructive">{nameError}</div>
          ) : null}
        </div>

        {isTextField ? (
          <>
            <TextControl
              label="Default value"
              value={field.value ?? ""}
              onChange={(next) => updateField({ value: next })}
            />
            <div className="space-y-1.5">
              <PdfEditorFieldLabel>Max length</PdfEditorFieldLabel>
              <Input
                type="number"
                size="sm"
                min={0}
                placeholder="Unlimited"
                value={maxLength || ""}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  const parsed = Number.parseInt(event.target.value, 10)
                  const next =
                    Number.isNaN(parsed) || parsed <= 0 ? undefined : parsed
                  updateField({ maxLen: next } as Partial<PdfWidgetAnnoField>)
                  if (!next && isComb)
                    toggleFlag(PDF_FORM_FIELD_FLAG.TEXT_COMB, false)
                }}
              />
            </div>
          </>
        ) : null}

        {options.length > 0 ||
        field.type === PDF_FORM_FIELD_TYPE.COMBOBOX ||
        field.type === PDF_FORM_FIELD_TYPE.LISTBOX ? (
          <div className="space-y-1.5">
            <PdfEditorFieldLabel>Options</PdfEditorFieldLabel>
            <div className="space-y-1.5">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  <Input
                    size="sm"
                    defaultValue={option.label}
                    onBlur={(event: React.FocusEvent<HTMLInputElement>) => {
                      const nextLabel = event.target.value
                      if (nextLabel === option.label) return
                      setOptions(
                        options.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, label: nextLabel }
                            : item
                        )
                      )
                    }}
                    onKeyDown={(
                      event: React.KeyboardEvent<HTMLInputElement>
                    ) => {
                      if (event.key === "Enter") event.currentTarget.blur()
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label="Remove option"
                    onClick={() =>
                      setOptions(
                        options.filter((_, itemIndex) => itemIndex !== index)
                      )
                    }
                  >
                    <TrashGlyph className="size-3.5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() =>
                  setOptions([
                    ...options,
                    {
                      label: `Option ${options.length + 1}`,
                      isSelected: false,
                    },
                  ])
                }
              >
                Add option
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-0.5">
          <PropertySwitch
            checked={Boolean(field.flag & PDF_FORM_FIELD_FLAG.READONLY)}
            onCheckedChange={(checked) =>
              toggleFlag(PDF_FORM_FIELD_FLAG.READONLY, checked)
            }
            label="Read only"
          />
          <PropertySwitch
            checked={Boolean(field.flag & PDF_FORM_FIELD_FLAG.REQUIRED)}
            onCheckedChange={(checked) =>
              toggleFlag(PDF_FORM_FIELD_FLAG.REQUIRED, checked)
            }
            label="Required"
          />
          {isTextField ? (
            <>
              <PropertySwitch
                checked={Boolean(
                  field.flag & PDF_FORM_FIELD_FLAG.TEXT_MULTIPLINE
                )}
                onCheckedChange={(checked) =>
                  toggleFlag(PDF_FORM_FIELD_FLAG.TEXT_MULTIPLINE, checked)
                }
                label="Multiline"
              />
              <PropertySwitch
                checked={isComb}
                disabled={maxLength <= 0}
                onCheckedChange={(checked) =>
                  toggleFlag(PDF_FORM_FIELD_FLAG.TEXT_COMB, checked)
                }
                label="Comb of characters"
                description="Requires a max length."
              />
            </>
          ) : null}
          {field.type === PDF_FORM_FIELD_TYPE.LISTBOX ? (
            <PropertySwitch
              checked={Boolean(
                field.flag & PDF_FORM_FIELD_FLAG.CHOICE_MULTL_SELECT
              )}
              onCheckedChange={(checked) =>
                toggleFlag(PDF_FORM_FIELD_FLAG.CHOICE_MULTL_SELECT, checked)
              }
              label="Allow multiple selections"
            />
          ) : null}
        </div>
      </div>
    </PdfEditorSection>
  )
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

export function PdfEditorPropertiesPanel({
  documentId,
}: {
  documentId: string
}) {
  const { provides: annotationCapability } = useAnnotationCapability()
  const { provides: annotation, state } = useAnnotation(documentId)
  const { permissions } = usePdfEditor()
  const [toolSnapshot, setToolSnapshot] = React.useState<{
    source: typeof annotationCapability
    tools: AnnotationTool[]
  } | null>(null)

  React.useEffect(() => {
    if (!annotationCapability) return

    return annotationCapability.onToolsChange(({ tools }) =>
      setToolSnapshot({ source: annotationCapability, tools })
    )
  }, [annotationCapability])

  const selected = React.useMemo(() => getSelectedAnnotations(state), [state])
  const tools =
    toolSnapshot?.source === annotationCapability
      ? toolSnapshot.tools
      : (annotationCapability?.getTools() ?? [])
  const activeTool: AnnotationTool | null =
    state.activeToolId && annotationCapability
      ? (tools.find((tool) => tool.id === state.activeToolId) ?? null)
      : null
  const colorPresets = annotationCapability?.getColorPresets() ?? []

  const selectedToolIds = React.useMemo(
    () =>
      selected
        .map(
          (item) => annotationCapability?.findToolForAnnotation(item.object)?.id
        )
        .filter((id): id is string => Boolean(id)),
    [annotationCapability, selected]
  )

  const isEditing = selected.length > 0
  const propertyKeys = isEditing
    ? getSharedProperties(selectedToolIds)
    : activeTool
      ? (TOOL_PROPERTIES[activeTool.id] ?? [])
      : []
  const configs = propertyKeys
    .map((key) => PROPERTY_CONFIGS[key])
    .filter((config): config is PropertyConfig => Boolean(config))
    .filter((config) => isEditing || !config.editOnly)

  const values = React.useMemo<Record<string, unknown>>(() => {
    if (isEditing)
      return selected[0].object as unknown as Record<string, unknown>
    if (activeTool)
      return activeTool.defaults as unknown as Record<string, unknown>
    return {}
  }, [activeTool, isEditing, selected])

  const canEdit = permissions.canModifyAnnotations
  const structurallyLocked = selected.some((item) =>
    annotation ? annotation.isAnnotationStructurallyLocked(item.object) : false
  )

  const applyPatch = React.useCallback(
    (patch: Record<string, unknown>) => {
      if (isEditing) {
        annotation?.updateAnnotations(
          selected.map((item) => ({
            pageIndex: item.object.pageIndex,
            id: item.object.id,
            patch: {
              ...patch,
              modified: new Date(),
            } as Partial<PdfAnnotationObject>,
          }))
        )
        return
      }

      if (activeTool && annotationCapability) {
        annotationCapability.setToolDefaults(
          activeTool.id,
          patch as Partial<PdfAnnotationObject> & Record<string, unknown>
        )
      }
    },
    [activeTool, annotation, annotationCapability, isEditing, selected]
  )

  const applyRotation = React.useCallback(
    (rotation: number) => {
      if (!annotation || !annotationCapability) return

      for (const item of selected) {
        const current = item.object.rotation ?? 0
        let patch: Partial<PdfAnnotationObject>

        try {
          patch = annotationCapability.transformAnnotation(item.object, {
            type: "rotate",
            changes: { rotation },
            metadata: {
              rotationAngle: rotation,
              rotationDelta: rotation - current,
            },
          })
        } catch {
          patch = { rotation }
        }

        annotation.updateAnnotation(item.object.pageIndex, item.object.id, {
          ...patch,
          modified: new Date(),
        })
      }
    },
    [annotation, annotationCapability, selected]
  )

  const single: TrackedAnnotation | null =
    selected.length === 1 ? selected[0] : null
  const singleMeta = single ? getAnnotationMeta(single.object) : null
  const isWidget = single?.object.type === PdfAnnotationSubtype.WIDGET

  const title = isEditing
    ? selected.length > 1
      ? `${selected.length} annotations`
      : (singleMeta?.label ?? "Annotation")
    : activeTool
      ? `${activeTool.name} defaults`
      : "Properties"

  if (!isEditing && !activeTool) {
    return (
      <PdfEditorEmptyState
        glyph={SlidersGlyph}
        title="Nothing selected"
        description="Select an annotation on the page, or pick a tool to edit its default style."
      />
    )
  }

  const flags = single?.object.flags ?? []
  const contents =
    single && !isWidget && typeof single.object.contents === "string"
      ? single.object.contents
      : ""
  const verticalAlignmentConfig = configs.find(
    (config) => config.kind === "verticalAlign"
  )

  return (
    <div className="space-y-5 p-3">
      <div>
        <div className="text-sm font-medium text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground">
          {isEditing
            ? structurallyLocked
              ? "This annotation is locked. Unlock it to make changes."
              : canEdit
                ? "Changes apply immediately."
                : "This document does not allow annotation changes."
            : "New annotations use these settings."}
        </div>
      </div>

      {configs.length > 0 ? (
        <PdfEditorSection title="Appearance">
          <fieldset
            disabled={isEditing && (!canEdit || structurallyLocked)}
            className="space-y-4 disabled:opacity-60"
          >
            {configs.map((config) => {
              if (
                config.kind === "verticalAlign" &&
                configs.some((item) => item.kind === "textAlign")
              ) {
                return null
              }

              if (config.kind === "textAlign" && verticalAlignmentConfig) {
                return (
                  <div
                    key="alignment-controls"
                    className="grid grid-cols-2 items-start gap-3"
                  >
                    <PropertyControl
                      config={config}
                      values={values}
                      colorPresets={colorPresets}
                      onPatch={applyPatch}
                      onRotate={isEditing ? applyRotation : undefined}
                    />
                    <PropertyControl
                      config={verticalAlignmentConfig}
                      values={values}
                      colorPresets={colorPresets}
                      onPatch={applyPatch}
                      onRotate={isEditing ? applyRotation : undefined}
                    />
                  </div>
                )
              }

              return (
                <PropertyControl
                  key={config.key + config.kind}
                  config={config}
                  values={values}
                  colorPresets={colorPresets}
                  onPatch={applyPatch}
                  onRotate={isEditing ? applyRotation : undefined}
                />
              )
            })}
          </fieldset>
        </PdfEditorSection>
      ) : null}

      {single && isWidget ? (
        <WidgetProperties
          documentId={documentId}
          widget={single.object as PdfWidgetAnnoObject}
        />
      ) : null}

      {single && !isWidget ? (
        <PdfEditorSection title="Note">
          <NoteEditor
            key={single.object.id}
            value={contents}
            disabled={!canEdit}
            onChange={(next) =>
              annotation?.updateAnnotation(
                single.object.pageIndex,
                single.object.id,
                {
                  contents: next,
                  modified: new Date(),
                }
              )
            }
          />
        </PdfEditorSection>
      ) : null}

      {isEditing ? (
        <PdfEditorSection title="Behavior">
          <div className="space-y-0.5">
            {FLAG_OPTIONS.map((option) => {
              const checked = selected.every((item) =>
                (item.object.flags ?? []).includes(option.flag)
              )

              return (
                <PropertySwitch
                  key={option.flag}
                  checked={checked}
                  disabled={!canEdit}
                  onCheckedChange={(next) => {
                    annotation?.updateAnnotations(
                      selected.map((item) => {
                        const current = item.object.flags ?? []
                        const nextFlags = next
                          ? current.includes(option.flag)
                            ? current
                            : [...current, option.flag]
                          : current.filter((flag) => flag !== option.flag)

                        return {
                          pageIndex: item.object.pageIndex,
                          id: item.object.id,
                          patch: { flags: nextFlags },
                        }
                      })
                    )
                  }}
                  label={option.label}
                  description={option.description}
                />
              )
            })}
          </div>
        </PdfEditorSection>
      ) : null}

      {single ? (
        <PdfEditorSection title="Details">
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-muted-foreground">Type</dt>
            <dd>{singleMeta?.label}</dd>
            <dt className="text-muted-foreground">Page</dt>
            <dd>{single.object.pageIndex + 1}</dd>
            <dt className="text-muted-foreground">Author</dt>
            <dd className="truncate">{single.object.author || "—"}</dd>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{formatDateTime(single.object.created)}</dd>
            <dt className="text-muted-foreground">Modified</dt>
            <dd>{formatDateTime(single.object.modified)}</dd>
            {flags.length > 0 ? (
              <>
                <dt className="text-muted-foreground">Flags</dt>
                <dd className="truncate">{flags.join(", ")}</dd>
              </>
            ) : null}
          </dl>
        </PdfEditorSection>
      ) : null}
    </div>
  )
}

function NoteEditor({
  value,
  disabled,
  onChange,
}: {
  value: string
  disabled?: boolean
  onChange: (value: string) => void
}) {
  const [draft, setDraft] = React.useState(value)

  const [previousValue, setPreviousValue] = React.useState(value)
  if (!Object.is(previousValue, value)) {
    setPreviousValue(value)
    setDraft(value)
  }

  return (
    <textarea
      value={draft}
      disabled={disabled}
      rows={3}
      placeholder="Add a note…"
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        if (draft !== value) onChange(draft)
      }}
      className={cn(
        "w-full resize-y rounded-lg border border-input bg-background px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      )}
    />
  )
}
