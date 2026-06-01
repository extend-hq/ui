"use client"

import * as React from "react"
import {
  DataEditor,
  emptyGridSelection,
  GridCellKind,
  type EditableGridCell,
  type GridCell,
  type GridColumn,
  type GridSelection,
  type Item,
  type NumberCell,
  type ProvideEditorComponent,
  type Rectangle,
  type TextCell,
  type Theme,
} from "@glideapps/glide-data-grid"
import {
  ArrowLeft01Icon,
  CancelCircleIcon,
  FileDiffIcon,
  InputNumericIcon,
  InputTextIcon,
  SecondBracketIcon,
  SourceCodeSquareIcon,
  TextCheckIcon,
  Undo02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { MultiFileDiff, Virtualizer } from "@pierre/diffs/react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

import { cn } from "@/lib/utils"
import { useMounted } from "@/hooks/use-mounted"
import { Button } from "@/components/ui/button"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { Input } from "@/registry/new-york-v4/ui/input"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/new-york-v4/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

import "@glideapps/glide-data-grid/dist/index.css"

type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | JsonObject | JsonArray
type JsonObject = { [key: string]: JsonValue }
type JsonArray = JsonValue[]
type SchemaPropertyType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"
  | "array"

type ReviewFieldSchema = {
  type: SchemaPropertyType
  title?: string
  description?: string
  enum?: Array<string | number>
  properties?: Record<string, ReviewFieldSchema>
  items?: ReviewFieldSchema
}

type ReviewFieldDefinition = {
  key: string
  schema: ReviewFieldSchema
  actual: JsonValue
  expected: JsonValue
  location?: {
    page: number
    area: HighlightArea
  }
}

type HighlightArea = {
  left: number
  top: number
  width: number
  height: number
}

const PDF_URL = "/samples/attention.pdf"
const DEFAULT_ZOOM = 0.75
const REVIEW_HIGHLIGHT_STYLE =
  "border-blue-500/70 bg-blue-500/12 shadow-[0_4px_16px_rgb(59_130_246_/_10%)]"
const DIFF_VIEWER_THEME = {
  "--diffs-light-bg": "oklch(0.985 0.002 247)",
  "--diffs-dark-bg": "oklch(0.18 0.003 247)",
  "--diffs-light": "oklch(0.22 0.01 247)",
  "--diffs-dark": "oklch(0.92 0.006 247)",
  "--diffs-bg-context-override":
    "light-dark(oklch(0.967 0.003 247), oklch(0.235 0.004 247))",
  "--diffs-bg-context-gutter-override":
    "light-dark(oklch(0.948 0.004 247), oklch(0.205 0.004 247))",
  "--diffs-bg-separator-override":
    "light-dark(oklch(0.94 0.004 247), oklch(0.255 0.005 247))",
  "--diffs-bg-buffer-override":
    "light-dark(oklch(0.955 0.004 247), oklch(0.225 0.004 247))",
  "--diffs-light-addition-color": "oklch(0.54 0.13 158)",
  "--diffs-dark-addition-color": "oklch(0.72 0.13 158)",
  "--diffs-light-deletion-color": "oklch(0.55 0.16 28)",
  "--diffs-dark-deletion-color": "oklch(0.72 0.14 28)",
  "--diffs-bg-addition-override":
    "light-dark(oklch(0.957 0.032 158), oklch(0.255 0.052 158))",
  "--diffs-bg-addition-emphasis-override":
    "light-dark(oklch(0.88 0.06 158), oklch(0.36 0.08 158))",
  "--diffs-bg-deletion-override":
    "light-dark(oklch(0.958 0.03 28), oklch(0.255 0.047 28))",
  "--diffs-bg-deletion-emphasis-override":
    "light-dark(oklch(0.9 0.052 28), oklch(0.36 0.075 28))",
  "--diffs-fg-number-override":
    "light-dark(oklch(0.56 0.018 247), oklch(0.66 0.012 247))",
  "--diffs-font-size": "12px",
  "--diffs-line-height": "20px",
} as React.CSSProperties

function readIsDarkTheme() {
  return (
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark")
  )
}

// Share one observer across the paired array grids. The form can keep its
// tab mounted now, so avoiding per-grid observers keeps tab switches cheap.
const darkThemeListeners = new Set<(isDark: boolean) => void>()
let darkThemeObserver: MutationObserver | null = null
let sharedIsDarkTheme = false

function ensureDarkThemeObserver() {
  if (
    darkThemeObserver ||
    typeof document === "undefined" ||
    typeof MutationObserver === "undefined"
  ) {
    return
  }

  sharedIsDarkTheme = readIsDarkTheme()
  darkThemeObserver = new MutationObserver(() => {
    const nextIsDark = readIsDarkTheme()
    if (nextIsDark === sharedIsDarkTheme) return

    sharedIsDarkTheme = nextIsDark
    darkThemeListeners.forEach((listener) => listener(nextIsDark))
  })
  darkThemeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  })
}

function useIsDarkTheme() {
  const [isDark, setIsDark] = React.useState(readIsDarkTheme)

  React.useEffect(() => {
    ensureDarkThemeObserver()
    setIsDark(sharedIsDarkTheme)
    darkThemeListeners.add(setIsDark)

    return () => {
      darkThemeListeners.delete(setIsDark)
      if (darkThemeListeners.size === 0 && darkThemeObserver) {
        darkThemeObserver.disconnect()
        darkThemeObserver = null
      }
    }
  }, [])

  return isDark
}

function useHumanReviewGridTheme() {
  const isDark = useIsDarkTheme()

  return React.useMemo<Partial<Theme>>(
    () => ({
      accentColor: isDark ? "rgb(96, 165, 250)" : "rgb(37, 99, 235)",
      accentLight: isDark ? "rgba(29, 78, 216, 0.15)" : "rgb(219, 234, 254)",
      accentFg: "rgb(255, 255, 255)",
      textDark: isDark ? "rgb(229, 229, 229)" : "rgb(23, 23, 23)",
      textMedium: isDark ? "rgb(163, 163, 163)" : "rgb(82, 82, 82)",
      textLight: isDark ? "rgb(115, 115, 115)" : "rgb(163, 163, 163)",
      textBubble: isDark ? "rgb(245, 245, 245)" : "rgb(23, 23, 23)",
      textHeader: isDark ? "rgb(245, 245, 245)" : "rgb(23, 23, 23)",
      textGroupHeader: isDark ? "rgb(163, 163, 163)" : "rgb(82, 82, 82)",
      bgCell: isDark ? "rgb(10, 10, 10)" : "rgb(255, 255, 255)",
      bgCellMedium: isDark ? "rgb(23, 23, 23)" : "rgb(250, 250, 250)",
      bgHeader: isDark ? "rgb(23, 23, 23)" : "rgb(250, 250, 250)",
      bgHeaderHasFocus: isDark ? "rgb(38, 38, 38)" : "rgb(245, 245, 245)",
      bgHeaderHovered: isDark ? "rgb(38, 38, 38)" : "rgb(245, 245, 245)",
      borderColor: isDark ? "rgb(38, 38, 38)" : "rgb(229, 229, 229)",
      horizontalBorderColor: isDark ? "rgb(38, 38, 38)" : "rgb(229, 229, 229)",
      cellHorizontalPadding: 8,
      cellVerticalPadding: 3,
      headerIconSize: 18,
      baseFontStyle: "13px",
      headerFontStyle: "600 13px",
      markerFontStyle: "11px",
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      editorFontSize: "13px",
    }),
    [isDark]
  )
}

const REVIEW_SCHEMA: ReviewFieldDefinition[] = [
  {
    key: "vendor_name",
    schema: {
      type: "string",
      title: "Vendor name",
      description: "Supplier shown on the invoice header.",
    },
    actual: "Acme Supplies LLC",
    expected: "Acme Supply LLC",
    location: {
      page: 1,
      area: { left: 31, top: 30, width: 40, height: 5.8 },
    },
  },
  {
    key: "line_items",
    schema: {
      type: "array",
      title: "Line items",
      description: "Invoice rows with nested allocation details.",
      items: {
        type: "object",
        properties: {
          description: {
            type: "string",
            title: "Description",
          },
          quantity: {
            type: "number",
            title: "Qty",
          },
          unit_price: {
            type: "number",
            title: "Unit price",
          },
          tax_detail: {
            type: "object",
            title: "Tax detail",
            properties: {
              code: {
                type: "string",
                title: "Code",
              },
              jurisdiction: {
                type: "string",
                title: "Jurisdiction",
              },
            },
          },
          allocations: {
            type: "array",
            title: "Allocations",
            items: {
              type: "object",
              properties: {
                department: {
                  type: "string",
                  title: "Department",
                },
                percent: {
                  type: "number",
                  title: "Percent",
                },
              },
            },
          },
        },
      },
    },
    actual: [
      {
        description: "Transformer implementation support",
        quantity: 2,
        unit_price: 4200,
        tax_detail: { code: "TX-CA", jurisdiction: "CA" },
        allocations: [
          { department: "Research", percent: 70 },
          { department: "Platform", percent: 20 },
        ],
      },
      {
        description: "Attention model review",
        quantity: 1,
        unit_price: 4080,
        tax_detail: { code: "TX-NY", jurisdiction: "NY" },
        allocations: [{ department: "Research", percent: 100 }],
      },
    ],
    expected: [
      {
        description: "Transformer implementation support",
        quantity: 2,
        unit_price: 4200,
        tax_detail: { code: "TX-CA", jurisdiction: "CA" },
        allocations: [
          { department: "Research", percent: 70 },
          { department: "Platform", percent: 30 },
        ],
      },
      {
        description: "Attention model review",
        quantity: 1,
        unit_price: 4080.75,
        tax_detail: { code: "TX-NY", jurisdiction: "NY" },
        allocations: [{ department: "Research", percent: 100 }],
      },
    ],
    location: {
      page: 1,
      area: { left: 13.5, top: 66, width: 73.5, height: 7.5 },
    },
  },
  {
    key: "total_amount",
    schema: {
      type: "number",
      title: "Total amount",
      description: "Final amount due including tax.",
    },
    actual: 12480,
    expected: 12480.75,
    location: {
      page: 1,
      area: { left: 13.5, top: 66, width: 73.5, height: 7.5 },
    },
  },
  {
    key: "payment_terms",
    schema: {
      type: "string",
      title: "Payment terms",
      enum: ["Due on receipt", "Net 15", "Net 30"],
    },
    actual: "Net 15",
    expected: "Net 30",
    location: {
      page: 1,
      area: { left: 13.5, top: 55.5, width: 73.5, height: 7.5 },
    },
  },
  {
    key: "requires_review",
    schema: {
      type: "boolean",
      title: "Requires review",
      description: "Whether a human should verify this document before export.",
    },
    actual: false,
    expected: true,
    location: {
      page: 2,
      area: { left: 9.5, top: 12, width: 81, height: 11.5 },
    },
  },
  {
    key: "remittance",
    schema: {
      type: "object",
      title: "Remittance details",
      description: "Payment destination used for invoice reconciliation.",
      properties: {
        account_holder: {
          type: "string",
          title: "Account holder",
        },
        routing_number: {
          type: "string",
          title: "Routing number",
        },
        verified: {
          type: "boolean",
          title: "Verified",
        },
      },
    },
    actual: {
      account_holder: "Acme Supplies LLC",
      routing_number: "021000021",
      verified: false,
    },
    expected: {
      account_holder: "Acme Supply LLC",
      routing_number: "021000021",
      verified: true,
    },
  },
]

const INITIAL_EXPECTED_VALUES = REVIEW_SCHEMA.reduce<JsonObject>(
  (values, field) => {
    values[field.key] = field.expected
    return values
  },
  {}
)

const ACTUAL_VALUES = REVIEW_SCHEMA.reduce<JsonObject>((values, field) => {
  values[field.key] = field.actual
  return values
}, {})

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value)
}

function getObjectValue(value: JsonValue, key: string): JsonValue {
  if (!isJsonObject(value)) return null
  return value[key] ?? null
}

function setObjectValue(
  value: JsonValue,
  key: string,
  childValue: JsonValue
): JsonObject {
  return {
    ...(isJsonObject(value) ? value : {}),
    [key]: childValue,
  }
}

function getArrayValue(value: JsonValue): JsonArray {
  return isJsonArray(value) ? value : []
}

function setArrayItemValue(
  value: JsonValue,
  index: number,
  childValue: JsonValue
): JsonArray {
  const nextValue = getArrayValue(value).slice()
  nextValue[index] = childValue
  return nextValue
}

function getPrimitiveValue(value: JsonValue): JsonPrimitive {
  return isJsonObject(value) || isJsonArray(value) ? null : value
}

function jsonValuesEqual(left: JsonValue, right: JsonValue) {
  return formatJson(left) === formatJson(right)
}

function countReviewFields(fields: ReviewFieldDefinition[]): number {
  return fields.reduce((count, field) => {
    if (field.schema.type !== "object") return count + 1

    const properties = field.schema.properties ?? {}
    const childFields = Object.entries(properties).map(
      ([key, schema]): ReviewFieldDefinition => ({
        key: `${field.key}.${key}`,
        schema,
        actual: getObjectValue(field.actual, key),
        expected: getObjectValue(field.expected, key),
      })
    )

    return count + Math.max(countReviewFields(childFields), 1)
  }, 0)
}

function findReviewField(
  fields: ReviewFieldDefinition[],
  fieldKey: string | undefined
): ReviewFieldDefinition | undefined {
  if (!fieldKey) return undefined

  for (const field of fields) {
    if (field.key === fieldKey) return field

    if (field.schema.type === "object") {
      const childFields = Object.entries(field.schema.properties ?? {}).map(
        ([key, schema]): ReviewFieldDefinition => ({
          key: `${field.key}.${key}`,
          schema,
          actual: getObjectValue(field.actual, key),
          expected: getObjectValue(field.expected, key),
        })
      )
      const childField = findReviewField(childFields, fieldKey)
      if (childField) return childField
    }
  }

  return undefined
}

function formatValue(value: JsonValue) {
  if (value === null) return "NULL"
  if (isJsonObject(value) || isJsonArray(value)) return formatJson(value)
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

function areGridRangesEqual(
  left: Readonly<Rectangle> | undefined,
  right: Readonly<Rectangle> | undefined
) {
  return (
    left === right ||
    (left !== undefined &&
      right !== undefined &&
      left.x === right.x &&
      left.y === right.y &&
      left.width === right.width &&
      left.height === right.height)
  )
}

function areGridRangeStacksEqual(
  left: readonly Readonly<Rectangle>[] | undefined,
  right: readonly Readonly<Rectangle>[] | undefined
) {
  if (left === right) return true
  if (!left || !right || left.length !== right.length) return false

  return left.every((range, index) => areGridRangesEqual(range, right[index]))
}

function areGridSelectionsEqual(left: GridSelection, right: GridSelection) {
  const leftCurrent = left.current
  const rightCurrent = right.current

  return (
    leftCurrent?.cell[0] === rightCurrent?.cell[0] &&
    leftCurrent?.cell[1] === rightCurrent?.cell[1] &&
    areGridRangesEqual(leftCurrent?.range, rightCurrent?.range) &&
    areGridRangeStacksEqual(
      leftCurrent?.rangeStack,
      rightCurrent?.rangeStack
    ) &&
    left.columns.equals(right.columns) &&
    left.rows.equals(right.rows)
  )
}

function getGridSelectionRanges(selection: GridSelection | undefined) {
  const current = selection?.current
  if (!current) return []

  return [...(current.rangeStack ?? []), current.range]
}

function areArrayNestedViewsEqual(
  left: ArrayNestedView[],
  right: ArrayNestedView[]
) {
  if (left === right) return true
  if (left.length !== right.length) return false

  return left.every((view, index) => {
    const other = right[index]

    return (
      view.rowIndex === other?.rowIndex &&
      view.columnId === other.columnId &&
      view.title === other.title &&
      view.schema === other.schema &&
      Object.is(view.value, other.value)
    )
  })
}

type HumanReviewOverlayCell = TextCell | NumberCell

type HumanReviewTextOverlayEditorProps = React.ComponentProps<
  ProvideEditorComponent<HumanReviewOverlayCell>
> & {
  overlayOpenRef: React.RefObject<boolean>
  readOnly?: boolean
}

function HumanReviewTextOverlayEditor({
  isHighlighted,
  onFinishedEditing,
  overlayOpenRef,
  readOnly = false,
  validatedSelection,
  value,
}: HumanReviewTextOverlayEditorProps) {
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null)
  const initialValue =
    value.kind === GridCellKind.Number ? value.displayData : value.data
  const latestValueRef = React.useRef(initialValue)
  const finishedRef = React.useRef(false)

  const finishEditing = React.useCallback(
    (
      shouldSave: boolean,
      movement: readonly [-1 | 0 | 1, -1 | 0 | 1] = [0, 0]
    ) => {
      if (finishedRef.current) return

      finishedRef.current = true
      overlayOpenRef.current = false

      if (!shouldSave || readOnly) {
        onFinishedEditing(undefined, movement)
        return
      }

      if (value.kind === GridCellKind.Number) {
        const numericValue = Number(latestValueRef.current)

        onFinishedEditing(
          {
            ...value,
            data: Number.isFinite(numericValue) ? numericValue : value.data,
            displayData: latestValueRef.current,
          },
          movement
        )
        return
      }

      onFinishedEditing(
        {
          ...value,
          data: latestValueRef.current,
          displayData: latestValueRef.current,
        },
        movement
      )
    },
    [onFinishedEditing, overlayOpenRef, readOnly, value]
  )

  React.useEffect(() => {
    overlayOpenRef.current = true

    const input = inputRef.current
    if (!input) {
      return () => {
        overlayOpenRef.current = false
      }
    }

    const handleInput = (event: Event) => {
      event.stopPropagation()
      latestValueRef.current = input.value
    }
    const stopTextInputPropagation = (event: Event) => {
      event.stopPropagation()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      event.stopPropagation()

      if (event.key === "Escape") {
        event.preventDefault()
        finishEditing(false)
        return
      }

      if (event.key === "Tab") {
        event.preventDefault()
        finishEditing(true, [event.shiftKey ? -1 : 1, 0])
        return
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        finishEditing(true, [0, 1])
      }
    }

    input.addEventListener("input", handleInput)
    input.addEventListener("beforeinput", stopTextInputPropagation, true)
    input.addEventListener("keydown", handleKeyDown, true)

    input.focus()

    if (validatedSelection !== undefined) {
      const selectionRange =
        typeof validatedSelection === "number"
          ? [validatedSelection, validatedSelection]
          : validatedSelection
      input.setSelectionRange(selectionRange[0], selectionRange[1])
    } else if (isHighlighted) {
      input.setSelectionRange(0, input.value.length)
    } else {
      input.setSelectionRange(input.value.length, input.value.length)
    }

    return () => {
      input.removeEventListener("input", handleInput)
      input.removeEventListener("beforeinput", stopTextInputPropagation, true)
      input.removeEventListener("keydown", handleKeyDown, true)
      overlayOpenRef.current = false
    }
  }, [
    finishEditing,
    isHighlighted,
    overlayOpenRef,
    validatedSelection,
    readOnly,
  ])

  React.useEffect(() => {
    const handlePointerOutside = (event: PointerEvent | MouseEvent) => {
      const input = inputRef.current
      const overlayRoot = input?.closest(".gdg-clip-region")

      if (!overlayRoot || overlayRoot.contains(event.target as Node | null)) {
        return
      }

      finishEditing(true)
    }

    document.addEventListener("pointerdown", handlePointerOutside, true)
    document.addEventListener("contextmenu", handlePointerOutside, true)

    return () => {
      document.removeEventListener("pointerdown", handlePointerOutside, true)
      document.removeEventListener("contextmenu", handlePointerOutside, true)
    }
  }, [finishEditing])

  return (
    <textarea
      ref={inputRef}
      className="gdg-input"
      defaultValue={initialValue}
      readOnly={readOnly}
      aria-readonly={readOnly}
      dir="auto"
      style={{ height: "100%", minHeight: 32, resize: "none", width: "100%" }}
    />
  )
}

function getFieldIcon(type: SchemaPropertyType) {
  if (type === "number" || type === "integer") return InputNumericIcon
  if (type === "boolean") return TextCheckIcon
  if (type === "array") return SecondBracketIcon
  if (type === "object") return SourceCodeSquareIcon
  return InputTextIcon
}

function HumanReviewValueInput({
  readOnly = false,
  schema,
  value,
  onChange,
}: {
  readOnly?: boolean
  schema: ReviewFieldSchema
  value: JsonPrimitive
  onChange: (value: JsonPrimitive) => void
}) {
  if (schema.enum?.length) {
    return (
      <span className="relative inline-flex w-full rounded-lg border border-input bg-background text-sm text-foreground shadow-xs/5 dark:bg-input/32">
        <select
          disabled={readOnly}
          value={value === null ? "" : String(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-8.5 w-full appearance-none rounded-[inherit] bg-transparent px-3 text-sm outline-none sm:h-7.5"
        >
          {schema.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </span>
    )
  }

  if (schema.type === "number" || schema.type === "integer") {
    return (
      <Input
        nativeInput
        readOnly={readOnly}
        type="number"
        value={value === null ? "" : String(value)}
        onChange={(event) => {
          const nextValue = event.currentTarget.value
          onChange(nextValue === "" ? null : Number(nextValue))
        }}
      />
    )
  }

  if (schema.type === "boolean") {
    return (
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-0.5">
        {[true, false].map((option) => (
          <Button
            key={String(option)}
            type="button"
            size="sm"
            variant={value === option ? "outline" : "ghost"}
            className={cn(
              "h-7 shadow-none",
              value === option && "bg-background dark:bg-input"
            )}
            disabled={readOnly}
            onClick={() => onChange(option)}
          >
            {option ? "True" : "False"}
          </Button>
        ))}
      </div>
    )
  }

  return (
    <Input
      nativeInput
      readOnly={readOnly}
      value={value === null ? "" : String(value)}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  )
}

function getArrayItemSchema(schema: ReviewFieldSchema): ReviewFieldSchema {
  return schema.items ?? { type: "string" }
}

function isComplexSchema(schema: ReviewFieldSchema) {
  return schema.type === "object" || schema.type === "array"
}

function summarizeComplexValue(value: JsonValue) {
  if (isJsonArray(value)) return `${value.length} items`
  if (isJsonObject(value)) return `${Object.keys(value).length} fields`
  return formatValue(value)
}

function getCellValueForArrayColumn(
  rowValue: JsonValue,
  itemSchema: ReviewFieldSchema,
  columnId: string
) {
  if (itemSchema.type === "object") {
    return getObjectValue(rowValue, columnId)
  }

  return rowValue
}

function getCellSchemaForArrayColumn(
  itemSchema: ReviewFieldSchema,
  columnId: string
) {
  if (itemSchema.type === "object") {
    return itemSchema.properties?.[columnId] ?? { type: "string" }
  }

  return itemSchema
}

function applyPrimitiveEdit(
  schema: ReviewFieldSchema,
  value: EditableGridCell
): JsonValue | undefined {
  if (schema.type === "boolean" && value.kind === GridCellKind.Boolean) {
    return value.data
  }

  if (
    (schema.type === "number" || schema.type === "integer") &&
    value.kind === GridCellKind.Number
  ) {
    return value.data ?? null
  }

  if (value.kind === GridCellKind.Text) {
    if (schema.type === "number" || schema.type === "integer") {
      return value.data.trim() === "" ? null : Number(value.data)
    }

    return value.data
  }

  return undefined
}

type ArrayNestedView = {
  rowIndex: number
  columnId: string
  title: string
  schema: ReviewFieldSchema
  value: JsonValue
}

type ArrayReviewSide = "actual" | "expected"

type SyncedArrayNestedView = {
  activeSide: ArrayReviewSide | null
  stack: ArrayNestedView[]
}

type SyncedArraySelection = {
  activeSide: ArrayReviewSide | null
  depth: number
  gridSelection: GridSelection
}

type HumanReviewTheme = "light" | "dark"

const EMPTY_SYNCED_ARRAY_NESTED_VIEW: SyncedArrayNestedView = {
  activeSide: null,
  stack: [],
}

const EMPTY_SYNCED_ARRAY_SELECTION: SyncedArraySelection = {
  activeSide: null,
  depth: 0,
  gridSelection: emptyGridSelection,
}

function setNestedArrayValue({
  value,
  schema,
  nestedStack,
  nextNestedValue,
}: {
  value: JsonValue
  schema: ReviewFieldSchema
  nestedStack: ArrayNestedView[]
  nextNestedValue: JsonValue
}): JsonValue {
  const [currentView, ...remainingViews] = nestedStack

  if (!currentView) return nextNestedValue

  const itemSchema = getArrayItemSchema(schema)
  const rowValue = getArrayValue(value)[currentView.rowIndex] ?? null
  const cellSchema = getCellSchemaForArrayColumn(
    itemSchema,
    currentView.columnId
  )
  const currentCellValue = getCellValueForArrayColumn(
    rowValue,
    itemSchema,
    currentView.columnId
  )
  const nextCellValue: JsonValue = remainingViews.length
    ? setNestedArrayValue({
        value: currentCellValue,
        schema: cellSchema,
        nestedStack: remainingViews,
        nextNestedValue,
      })
    : nextNestedValue
  const nextRowValue: JsonValue =
    itemSchema.type === "object"
      ? setObjectValue(rowValue, currentView.columnId, nextCellValue)
      : nextCellValue

  return setArrayItemValue(value, currentView.rowIndex, nextRowValue)
}

function getNestedArrayValue({
  value,
  schema,
  nestedStack,
}: {
  value: JsonValue
  schema: ReviewFieldSchema
  nestedStack: ArrayNestedView[]
}): JsonValue {
  const [currentView, ...remainingViews] = nestedStack

  if (!currentView) return value

  const itemSchema = getArrayItemSchema(schema)
  const rowValue = getArrayValue(value)[currentView.rowIndex] ?? null
  const cellSchema = getCellSchemaForArrayColumn(
    itemSchema,
    currentView.columnId
  )
  const cellValue = getCellValueForArrayColumn(
    rowValue,
    itemSchema,
    currentView.columnId
  )

  if (!remainingViews.length) return cellValue

  return getNestedArrayValue({
    value: cellValue,
    schema: cellSchema,
    nestedStack: remainingViews,
  })
}

function HumanReviewArrayValueGrid({
  activeNestedSide = null,
  activeSelectionSide = null,
  label,
  nestedStackBaseDepth = 0,
  readOnly = false,
  schema,
  selectionDepth = 0,
  sharedGridSelection,
  sharedNestedStack,
  value,
  viewSide = "expected",
  onChange,
  onGridSelectionChange,
  onNestedStackChange,
}: {
  activeNestedSide?: ArrayReviewSide | null
  activeSelectionSide?: ArrayReviewSide | null
  label: string
  nestedStackBaseDepth?: number
  readOnly?: boolean
  schema: ReviewFieldSchema
  selectionDepth?: number
  sharedGridSelection?: GridSelection
  sharedNestedStack?: ArrayNestedView[]
  value: JsonValue
  viewSide?: ArrayReviewSide
  onChange?: (value: JsonValue) => void
  onGridSelectionChange?: (
    selection: GridSelection,
    side: ArrayReviewSide,
    depth: number
  ) => void
  onNestedStackChange?: (
    stack: ArrayNestedView[],
    side: ArrayReviewSide
  ) => void
}) {
  const rows = getArrayValue(value)
  const itemSchema = getArrayItemSchema(schema)
  const gridTheme = useHumanReviewGridTheme()
  const isMounted = useMounted()
  const isDark = useIsDarkTheme()
  const [localNestedStack, setLocalNestedStack] = React.useState<
    ArrayNestedView[]
  >([])
  const [localGridSelection, setLocalGridSelection] =
    React.useState<GridSelection>(emptyGridSelection)
  const fastTextOverlayOpenRef = React.useRef(false)
  const nestedStack = sharedNestedStack ?? localNestedStack
  const visibleNestedStack = nestedStack.slice(nestedStackBaseDepth)
  const activeNestedView = visibleNestedStack[0] ?? null
  const activeNestedValue = activeNestedView
    ? getNestedArrayValue({
        value,
        schema,
        nestedStack: [activeNestedView],
      })
    : null
  const isActiveNestedSource =
    Boolean(activeNestedView) && activeNestedSide === viewSide
  const isMirroredNestedTarget =
    Boolean(activeNestedView) &&
    activeNestedSide !== null &&
    activeNestedSide !== viewSide
  const blueCellText = isDark ? "rgb(147, 197, 253)" : "rgb(37, 99, 235)"
  const selectedCellBackground = isDark
    ? "rgba(37, 99, 235, 0.2)"
    : "rgba(219, 234, 254, 0.85)"
  const mirroredCellBackground = isDark
    ? "rgba(167, 139, 250, 0.18)"
    : "rgba(237, 233, 254, 0.9)"
  const mirroredHighlightRegions = React.useMemo<
    React.ComponentProps<typeof DataEditor>["highlightRegions"]
  >(() => {
    if (
      !activeSelectionSide ||
      activeSelectionSide === viewSide ||
      selectionDepth !== nestedStackBaseDepth
    ) {
      return undefined
    }

    const ranges = getGridSelectionRanges(sharedGridSelection)
    if (!ranges.length) return undefined

    return ranges.map((range) => ({
      color: mirroredCellBackground,
      range,
      style: "dashed" as const,
    }))
  }, [
    activeSelectionSide,
    mirroredCellBackground,
    nestedStackBaseDepth,
    selectionDepth,
    sharedGridSelection,
    viewSide,
  ])

  const setNestedStack = React.useCallback(
    (
      updater:
        | ArrayNestedView[]
        | ((current: ArrayNestedView[]) => ArrayNestedView[])
    ) => {
      if (onNestedStackChange) {
        const nextStack =
          typeof updater === "function" ? updater(nestedStack) : updater

        onNestedStackChange(nextStack, viewSide)
        return
      }

      setLocalNestedStack(updater)
    },
    [nestedStack, onNestedStackChange, viewSide]
  )

  const handleGridSelectionChange = React.useCallback(
    (selection: GridSelection) => {
      flushSync(() => {
        setLocalGridSelection((current) =>
          areGridSelectionsEqual(current, selection) ? current : selection
        )
      })

      if (onGridSelectionChange) {
        if (
          activeSelectionSide === viewSide &&
          sharedGridSelection &&
          areGridSelectionsEqual(sharedGridSelection, selection)
        ) {
          return
        }

        React.startTransition(() => {
          onGridSelectionChange(selection, viewSide, nestedStackBaseDepth)
        })
        return
      }
    },
    [
      activeSelectionSide,
      nestedStackBaseDepth,
      onGridSelectionChange,
      sharedGridSelection,
      viewSide,
    ]
  )

  const columns = React.useMemo<GridColumn[]>(() => {
    if (itemSchema.type === "object") {
      const propertyEntries = Object.entries(itemSchema.properties ?? {})

      if (propertyEntries.length) {
        return propertyEntries.map(([key, propertySchema]) => ({
          id: key,
          title: propertySchema.title ?? key,
          width: isComplexSchema(propertySchema) ? 148 : 132,
        }))
      }
    }

    return [
      {
        id: "value",
        title: itemSchema.title ?? "Value",
        width: isComplexSchema(itemSchema) ? 148 : 180,
      },
    ]
  }, [itemSchema])

  const getCellContent = React.useCallback(
    ([col, row]: Item): GridCell => {
      const column = columns[col]
      const columnId = String(column?.id ?? "value")
      const rowValue = rows[row] ?? null
      const cellSchema = getCellSchemaForArrayColumn(itemSchema, columnId)
      const cellValue = getCellValueForArrayColumn(
        rowValue,
        itemSchema,
        columnId
      )
      const matchedNestedCell =
        activeNestedView?.rowIndex === row &&
        activeNestedView.columnId === columnId
      const nestedCellTheme: Partial<Theme> | undefined = matchedNestedCell
        ? {
            bgCell: isMirroredNestedTarget
              ? mirroredCellBackground
              : selectedCellBackground,
            textDark: blueCellText,
          }
        : undefined

      if (isComplexSchema(cellSchema)) {
        return {
          kind: GridCellKind.Text,
          data: summarizeComplexValue(cellValue),
          displayData: summarizeComplexValue(cellValue),
          allowOverlay: false,
          readonly: true,
          cursor: "pointer",
          activationBehaviorOverride: "second-click",
          themeOverride: {
            textDark: blueCellText,
            ...(nestedCellTheme ?? {}),
          },
        }
      }

      if (cellSchema.type === "boolean") {
        return {
          kind: GridCellKind.Boolean,
          data: typeof cellValue === "boolean" ? cellValue : false,
          allowOverlay: false,
          readonly: readOnly,
        }
      }

      if (cellSchema.type === "number" || cellSchema.type === "integer") {
        return {
          kind: GridCellKind.Number,
          data: typeof cellValue === "number" ? cellValue : undefined,
          displayData: typeof cellValue === "number" ? String(cellValue) : "",
          allowOverlay: true,
          readonly: false,
          activationBehaviorOverride: readOnly ? "single-click" : undefined,
        }
      }

      return {
        kind: GridCellKind.Text,
        data:
          cellValue === null ||
          isJsonObject(cellValue) ||
          isJsonArray(cellValue)
            ? ""
            : String(cellValue),
        displayData:
          cellValue === null ||
          isJsonObject(cellValue) ||
          isJsonArray(cellValue)
            ? ""
            : String(cellValue),
        allowOverlay: true,
        readonly: false,
        activationBehaviorOverride: readOnly ? "single-click" : undefined,
      }
    },
    [
      activeNestedView,
      blueCellText,
      columns,
      isMirroredNestedTarget,
      itemSchema,
      mirroredCellBackground,
      readOnly,
      rows,
      selectedCellBackground,
    ]
  )

  const updateCellValue = React.useCallback(
    ([col, row]: Item, nextCell: EditableGridCell) => {
      if (readOnly || !onChange) return

      const column = columns[col]
      const columnId = String(column?.id ?? "value")
      const rowValue = rows[row] ?? null
      const cellSchema = getCellSchemaForArrayColumn(itemSchema, columnId)
      const nextValue = applyPrimitiveEdit(cellSchema, nextCell)

      if (nextValue === undefined) return

      const nextRowValue =
        itemSchema.type === "object"
          ? setObjectValue(rowValue, columnId, nextValue)
          : nextValue

      onChange(setArrayItemValue(value, row, nextRowValue))
    },
    [columns, itemSchema, onChange, readOnly, rows, value]
  )
  const provideEditor = React.useCallback<
    NonNullable<React.ComponentProps<typeof DataEditor>["provideEditor"]>
  >(
    (cell) => {
      if (
        cell.kind !== GridCellKind.Text &&
        cell.kind !== GridCellKind.Number
      ) {
        return undefined
      }

      return {
        editor: (props) => {
          if (
            props.value.kind !== GridCellKind.Text &&
            props.value.kind !== GridCellKind.Number
          ) {
            return null
          }

          return (
            <HumanReviewTextOverlayEditor
              {...(props as React.ComponentProps<
                ProvideEditorComponent<HumanReviewOverlayCell>
              >)}
              overlayOpenRef={fastTextOverlayOpenRef}
              readOnly={readOnly}
            />
          )
        },
      }
    },
    [readOnly]
  )
  const handleOutsideClick = React.useCallback(
    () => !fastTextOverlayOpenRef.current,
    []
  )

  const openNestedCell = React.useCallback(
    ([col, row]: Item) => {
      const column = columns[col]
      const columnId = String(column?.id ?? "value")
      const rowValue = rows[row] ?? null
      const cellSchema = getCellSchemaForArrayColumn(itemSchema, columnId)

      if (!isComplexSchema(cellSchema)) return

      setNestedStack((current) => {
        const nextView = {
          rowIndex: row,
          columnId,
          title: `${column?.title ?? columnId} / row ${row + 1}`,
          schema: cellSchema,
          value: getCellValueForArrayColumn(rowValue, itemSchema, columnId),
        }
        const currentView = current[nestedStackBaseDepth]

        if (
          currentView?.rowIndex === nextView.rowIndex &&
          currentView.columnId === nextView.columnId
        ) {
          return current
        }

        return [...current.slice(0, nestedStackBaseDepth), nextView]
      })
    },
    [columns, itemSchema, nestedStackBaseDepth, rows, setNestedStack]
  )

  const updateNestedValue = React.useCallback(
    (nextNestedValue: JsonValue) => {
      if (!activeNestedView || readOnly || !onChange) return

      onChange(
        setNestedArrayValue({
          value,
          schema,
          nestedStack: visibleNestedStack.slice(0, 1),
          nextNestedValue,
        })
      )
      setNestedStack((current) =>
        current.map((view, index) =>
          index === nestedStackBaseDepth
            ? { ...view, value: nextNestedValue }
            : view
        )
      )
    },
    [
      activeNestedView,
      nestedStackBaseDepth,
      onChange,
      readOnly,
      schema,
      setNestedStack,
      value,
      visibleNestedStack,
    ]
  )

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border bg-background transition-[border-color,background-color,box-shadow] focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_1px_rgb(59_130_246_/_8%)] hover:border-blue-500/50",
        isActiveNestedSource &&
          "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_10%)]"
      )}
    >
      <div>
        <div className="flex h-8 items-center justify-between gap-2 border-b px-2 text-[11px] font-medium text-muted-foreground">
          <span>{label}</span>
          <span>{rows.length} rows</span>
        </div>
        <div className="h-[220px]">
          {isMounted ? (
            <DataEditor
              columns={columns}
              rows={rows.length}
              getCellContent={getCellContent}
              cellActivationBehavior={
                readOnly ? "single-click" : "second-click"
              }
              gridSelection={localGridSelection}
              highlightRegions={mirroredHighlightRegions}
              onCellEdited={updateCellValue}
              onCellActivated={openNestedCell}
              onGridSelectionChange={handleGridSelectionChange}
              provideEditor={provideEditor}
              isOutsideClick={handleOutsideClick}
              rowMarkers="number"
              smoothScrollX
              smoothScrollY
              theme={gridTheme}
              width="100%"
              height="100%"
              rowHeight={32}
              headerHeight={34}
            />
          ) : (
            <div className="h-full bg-muted/20" />
          )}
        </div>
      </div>
      {activeNestedView ? (
        <div className="absolute inset-0 z-10 flex flex-col bg-background">
          <div className="flex h-8 items-center gap-2 border-b px-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-6 text-muted-foreground"
              onClick={() =>
                setNestedStack((current) =>
                  current.slice(
                    0,
                    Math.max(nestedStackBaseDepth, current.length - 1)
                  )
                )
              }
              aria-label="Back to parent array"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />
            </Button>
            <div className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {activeNestedView.title}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {activeNestedView.schema.type === "array" ? (
              <HumanReviewArrayValueGrid
                label={
                  activeNestedView.schema.title ?? activeNestedView.columnId
                }
                nestedStackBaseDepth={nestedStackBaseDepth + 1}
                readOnly={readOnly}
                schema={activeNestedView.schema}
                sharedGridSelection={sharedGridSelection}
                sharedNestedStack={sharedNestedStack}
                value={activeNestedValue}
                viewSide={viewSide}
                activeNestedSide={activeNestedSide}
                activeSelectionSide={activeSelectionSide}
                selectionDepth={selectionDepth}
                onChange={updateNestedValue}
                onGridSelectionChange={onGridSelectionChange}
                onNestedStackChange={onNestedStackChange}
              />
            ) : (
              <HumanReviewObjectValueEditor
                schema={activeNestedView.schema}
                value={activeNestedValue}
                originalValue={activeNestedValue}
                readOnly={readOnly}
                onChange={updateNestedValue}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function HumanReviewObjectValueEditor({
  schema,
  value,
  originalValue,
  readOnly = false,
  onChange,
}: {
  schema: ReviewFieldSchema
  value: JsonValue
  originalValue: JsonValue
  readOnly?: boolean
  onChange: (value: JsonValue) => void
}) {
  const propertyEntries = Object.entries(schema.properties ?? {})

  if (!propertyEntries.length) {
    return (
      <div className="rounded-md bg-background px-2 py-1.5 text-sm text-muted-foreground">
        No properties
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {propertyEntries.map(([propertyKey, propertySchema]) => (
        <HumanReviewFieldCard
          key={propertyKey}
          field={{
            key: propertyKey,
            schema: propertySchema,
            actual: getObjectValue(originalValue, propertyKey),
            expected: getObjectValue(originalValue, propertyKey),
          }}
          value={getObjectValue(value, propertyKey)}
          originalValue={getObjectValue(originalValue, propertyKey)}
          readOnly={readOnly}
          onChange={(childValue) =>
            !readOnly &&
            onChange(setObjectValue(value, propertyKey, childValue))
          }
          onUndo={() =>
            !readOnly &&
            onChange(
              setObjectValue(
                value,
                propertyKey,
                getObjectValue(originalValue, propertyKey)
              )
            )
          }
          onSetNull={() =>
            !readOnly && onChange(setObjectValue(value, propertyKey, null))
          }
        />
      ))}
    </div>
  )
}

type HumanReviewFieldCardProps = {
  field: ReviewFieldDefinition
  value: JsonValue
  originalValue: JsonValue
  active?: boolean
  activeFieldKey?: string
  readOnly?: boolean
  onChange: (value: JsonValue) => void
  onFieldFocus?: (field: ReviewFieldDefinition) => void
  onUndo: () => void
  onSetNull: () => void
}

function areHumanReviewFieldCardPropsEqual(
  previous: HumanReviewFieldCardProps,
  next: HumanReviewFieldCardProps
) {
  return (
    previous.field === next.field &&
    Object.is(previous.value, next.value) &&
    Object.is(previous.originalValue, next.originalValue) &&
    previous.active === next.active &&
    previous.activeFieldKey === next.activeFieldKey &&
    previous.readOnly === next.readOnly &&
    previous.onFieldFocus === next.onFieldFocus
  )
}

const HumanReviewFieldCard = React.memo(
  HumanReviewFieldCardBase,
  areHumanReviewFieldCardPropsEqual
)

function HumanReviewFieldCardBase({
  field,
  value,
  originalValue,
  active,
  activeFieldKey,
  readOnly = false,
  onChange,
  onFieldFocus,
  onUndo,
  onSetNull,
}: HumanReviewFieldCardProps) {
  const modified = !jsonValuesEqual(value, originalValue)
  const Icon = getFieldIcon(field.schema.type)
  const propertyEntries = Object.entries(field.schema.properties ?? {})
  const [syncedArrayNestedView, setSyncedArrayNestedView] =
    React.useState<SyncedArrayNestedView>(EMPTY_SYNCED_ARRAY_NESTED_VIEW)
  const [syncedArraySelection, setSyncedArraySelection] =
    React.useState<SyncedArraySelection>(EMPTY_SYNCED_ARRAY_SELECTION)
  const updateSyncedArrayNestedView = React.useCallback(
    (stack: ArrayNestedView[], side: ArrayReviewSide) => {
      const activeSide = stack.length ? side : null

      setSyncedArrayNestedView((current) =>
        current.activeSide === activeSide &&
        areArrayNestedViewsEqual(current.stack, stack)
          ? current
          : {
              activeSide,
              stack,
            }
      )
    },
    []
  )
  const updateSyncedArraySelection = React.useCallback(
    (gridSelection: GridSelection, side: ArrayReviewSide, depth: number) => {
      const activeSide = gridSelection.current ? side : null

      setSyncedArraySelection((current) =>
        current.activeSide === activeSide &&
        current.depth === depth &&
        areGridSelectionsEqual(current.gridSelection, gridSelection)
          ? current
          : {
              activeSide,
              depth,
              gridSelection,
            }
      )
    },
    []
  )

  return (
    <div
      tabIndex={0}
      onFocusCapture={() => onFieldFocus?.(field)}
      onMouseEnter={() => onFieldFocus?.(field)}
      className={cn(
        "rounded-lg border bg-background p-3 transition-[border-color,background-color,box-shadow] focus-within:border-blue-500/50 focus-within:bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/5 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none",
        active &&
          "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_8%)]"
      )}
    >
      <div className="mb-3 flex min-h-8 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">
                {field.schema.title ?? field.key}
              </div>
            </div>
            <span
              className={cn(
                "size-2 shrink-0 rounded-full bg-amber-400 transition-opacity",
                !modified && "opacity-0"
              )}
            />
          </div>
          {field.schema.description ? (
            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {field.schema.description}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!readOnly && modified ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  onClick={onUndo}
                  aria-label={`Undo ${field.key}`}
                >
                  <HugeiconsIcon icon={Undo02Icon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Revert changes</TooltipContent>
            </Tooltip>
          ) : null}
          {!readOnly ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  onClick={onSetNull}
                  aria-label={`Set ${field.key} to null`}
                >
                  <HugeiconsIcon icon={CancelCircleIcon} className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Set to NULL</TooltipContent>
            </Tooltip>
          ) : null}
          <div className="flex h-6 items-center gap-1 rounded-md border bg-muted/50 px-1.5 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Icon} className="size-3.5" />
            {field.schema.type}
          </div>
        </div>
      </div>
      {field.schema.type === "object" ? (
        <div className="rounded-md border bg-muted/25 p-2">
          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">
            <span>Properties</span>
            <span>{propertyEntries.length} fields</span>
          </div>
          <div className="space-y-2">
            {propertyEntries.length ? (
              propertyEntries.map(([propertyKey, schema]) => {
                const childField: ReviewFieldDefinition = {
                  key: `${field.key}.${propertyKey}`,
                  schema,
                  actual: getObjectValue(field.actual, propertyKey),
                  expected: getObjectValue(originalValue, propertyKey),
                }

                return (
                  <HumanReviewFieldCard
                    key={childField.key}
                    field={childField}
                    value={getObjectValue(value, propertyKey)}
                    originalValue={childField.expected}
                    active={childField.key === activeFieldKey}
                    activeFieldKey={activeFieldKey}
                    readOnly={readOnly}
                    onChange={(childValue) =>
                      onChange(setObjectValue(value, propertyKey, childValue))
                    }
                    onFieldFocus={onFieldFocus}
                    onUndo={() =>
                      onChange(
                        setObjectValue(value, propertyKey, childField.expected)
                      )
                    }
                    onSetNull={() =>
                      onChange(setObjectValue(value, propertyKey, null))
                    }
                  />
                )
              })
            ) : (
              <div className="rounded-md bg-background px-2 py-1.5 text-sm text-muted-foreground">
                No properties
              </div>
            )}
          </div>
        </div>
      ) : field.schema.type === "array" ? (
        <div className="grid gap-2">
          <HumanReviewArrayValueGrid
            activeNestedSide={syncedArrayNestedView.activeSide}
            activeSelectionSide={syncedArraySelection.activeSide}
            label="Actual"
            readOnly
            schema={field.schema}
            selectionDepth={syncedArraySelection.depth}
            sharedGridSelection={syncedArraySelection.gridSelection}
            sharedNestedStack={syncedArrayNestedView.stack}
            value={field.actual}
            viewSide="actual"
            onGridSelectionChange={updateSyncedArraySelection}
            onNestedStackChange={updateSyncedArrayNestedView}
          />
          <HumanReviewArrayValueGrid
            activeNestedSide={syncedArrayNestedView.activeSide}
            activeSelectionSide={syncedArraySelection.activeSide}
            label="Expected"
            readOnly={readOnly}
            schema={field.schema}
            selectionDepth={syncedArraySelection.depth}
            sharedGridSelection={syncedArraySelection.gridSelection}
            sharedNestedStack={syncedArrayNestedView.stack}
            value={value}
            viewSide="expected"
            onChange={onChange}
            onGridSelectionChange={updateSyncedArraySelection}
            onNestedStackChange={updateSyncedArrayNestedView}
          />
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border bg-muted/30 p-2">
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">
              Actual
            </div>
            <div className="min-h-7 rounded-md bg-background px-2 py-1.5 text-sm">
              {formatValue(field.actual)}
            </div>
          </div>
          <div className="rounded-md border bg-muted/30 p-2">
            <div className="mb-1 text-[11px] font-medium text-muted-foreground">
              Expected
            </div>
            <HumanReviewValueInput
              readOnly={readOnly}
              schema={field.schema}
              value={getPrimitiveValue(value)}
              onChange={onChange}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function HumanReviewHighlight({ field }: { field: ReviewFieldDefinition }) {
  const area = field.location?.area

  if (!area) return null

  return (
    <div
      className={cn(
        "pointer-events-none absolute z-10 rounded-[3px] border",
        REVIEW_HIGHLIGHT_STYLE
      )}
      style={{
        left: `${area.left}%`,
        top: `${area.top}%`,
        width: `${area.width}%`,
        height: `${area.height}%`,
      }}
    />
  )
}

function JsonDiffView({
  actual,
  expected,
  theme,
}: {
  actual: JsonObject
  expected: JsonObject
  theme: HumanReviewTheme
}) {
  const oldFile = React.useMemo(
    () => ({
      name: "actual.json",
      contents: formatJson(actual),
      lang: "json",
    }),
    [actual]
  )
  const newFile = React.useMemo(
    () => ({
      name: "expected.json",
      contents: formatJson(expected),
      lang: "json",
    }),
    [expected]
  )

  return (
    <Virtualizer
      className="h-full overflow-auto rounded-b-xl bg-surface/60"
      contentClassName="min-w-full"
    >
      <div className="human-review-diff h-full text-xs">
        <MultiFileDiff
          className="block min-w-full"
          style={DIFF_VIEWER_THEME}
          oldFile={oldFile}
          newFile={newFile}
          options={{
            diffStyle: "split",
            diffIndicators: "bars",
            hunkSeparators: "line-info-basic",
            overflow: "wrap",
            themeType: theme,
            theme: {
              light: "pierre-light",
              dark: "pierre-dark",
            },
          }}
        />
      </div>
    </Virtualizer>
  )
}

function HumanReviewPanel({
  activeFieldKey,
  className,
  onFieldFocus,
  theme = "light",
}: {
  activeFieldKey?: string
  className?: string
  onFieldFocus?: (field: ReviewFieldDefinition) => void
  theme?: HumanReviewTheme
} = {}) {
  const [activeTab, setActiveTab] = React.useState("form")
  const [expected, setExpected] = React.useState<JsonObject>(
    INITIAL_EXPECTED_VALUES
  )

  const updateValue = React.useCallback((key: string, value: JsonValue) => {
    setExpected((current) =>
      Object.is(current[key], value) ? current : { ...current, [key]: value }
    )
  }, [])
  const fieldCount = React.useMemo(() => countReviewFields(REVIEW_SCHEMA), [])

  return (
    <TooltipProvider delay={200}>
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className={cn("flex h-[560px] flex-col gap-0 bg-background", className)}
      >
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">
          <TabsList className="h-8 sm:h-7">
            <TabsTrigger value="form" className="h-7 sm:h-6">
              <HugeiconsIcon icon={TextCheckIcon} className="size-4" />
              Form
            </TabsTrigger>
            <TabsTrigger value="json" className="h-7 sm:h-6">
              <HugeiconsIcon icon={SourceCodeSquareIcon} className="size-4" />
              JSON
            </TabsTrigger>
          </TabsList>
          <div className="flex h-8 items-center gap-1 rounded-md border bg-muted/40 px-2 text-xs text-muted-foreground sm:h-7">
            <HugeiconsIcon icon={FileDiffIcon} className="size-3.5" />
            {fieldCount} fields
          </div>
        </div>
        <TabsContent value="form" keepMounted className="min-h-0 flex-1">
          <ScrollArea className="h-full" scrollFade>
            <div className="space-y-3 p-3">
              {REVIEW_SCHEMA.map((field) => (
                <HumanReviewFieldCard
                  key={field.key}
                  field={field}
                  value={expected[field.key] ?? null}
                  originalValue={field.expected}
                  active={
                    field.key === activeFieldKey ||
                    activeFieldKey?.startsWith(`${field.key}.`)
                  }
                  activeFieldKey={activeFieldKey}
                  onChange={(value) => updateValue(field.key, value)}
                  onFieldFocus={onFieldFocus}
                  onUndo={() => updateValue(field.key, field.expected)}
                  onSetNull={() => updateValue(field.key, null)}
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
        <TabsContent value="json" keepMounted className="min-h-0 flex-1">
          <JsonDiffView
            actual={ACTUAL_VALUES}
            expected={expected}
            theme={theme}
          />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  )
}

export function HumanReviewBlock() {
  const { resolvedTheme } = useTheme()
  const [activeFieldKey, setActiveFieldKey] = React.useState(
    REVIEW_SCHEMA[0].key
  )
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const activeField =
    findReviewField(REVIEW_SCHEMA, activeFieldKey) ?? REVIEW_SCHEMA[0]
  const reviewTheme: HumanReviewTheme =
    resolvedTheme === "dark" ? "dark" : "light"

  const focusField = React.useCallback(
    (field: ReviewFieldDefinition) => {
      if (field.key === activeFieldKey) return

      setActiveFieldKey(field.key)

      if (field.location) {
        viewerRef.current?.scrollToPageArea(
          field.location.page,
          field.location.area
        )
      }
    },
    [activeFieldKey]
  )

  return (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-human-review"
      left={
        <PDFViewer
          ref={viewerRef}
          file={PDF_URL}
          defaultZoom={DEFAULT_ZOOM}
          renderPageOverlay={({ pageNumber }) =>
            activeField.location?.page === pageNumber ? (
              <HumanReviewHighlight field={activeField} />
            ) : null
          }
        />
      }
      right={
        <HumanReviewPanel
          activeFieldKey={activeField.key}
          className="h-full min-h-0"
          theme={reviewTheme}
          onFieldFocus={focusField}
        />
      }
    />
  )
}

export function HumanReviewDemo() {
  const { resolvedTheme } = useTheme()
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)
  const reviewTheme: HumanReviewTheme =
    resolvedTheme === "dark" ? "dark" : "light"

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <HumanReviewPanel theme={reviewTheme} />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={humanReviewUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={humanReviewUsageCode}
              className="rounded-none border-x-0 border-b-0"
              maxHeightClassName="max-h-56"
              previewLines={10}
              showCopy={false}
            />
            <div className="absolute inset-0 flex items-center justify-center pb-4">
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, var(--color-code), color-mix(in oklab, var(--color-code) 60%, transparent), transparent)",
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="docs-view-code-button relative z-10 rounded-lg"
                onClick={() => setIsCodeVisible(true)}
              >
                View Code
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const humanReviewUsageCode = `"use client";

import * as React from "react";

import { HumanReviewPanel, type ReviewField } from "@/components/ui/human-review";

const fields: ReviewField[] = [
  {
    key: "vendor_name",
    schema: {
      type: "string",
      title: "Vendor name",
      description: "Supplier shown on the invoice header.",
    },
    actual: "Acme Supplies LLC",
    expected: "Acme Supply LLC",
  },
  {
    key: "total_amount",
    schema: {
      type: "number",
      title: "Total amount",
      description: "Final amount due including tax.",
    },
    actual: 12480,
    expected: 12480.75,
  },
  {
    key: "payment_terms",
    schema: {
      type: "string",
      title: "Payment terms",
      enum: ["Due on receipt", "Net 15", "Net 30"],
    },
    actual: "Net 15",
    expected: "Net 30",
  },
  {
    key: "line_items",
    schema: {
      type: "array",
      title: "Line items",
      items: {
        type: "object",
        properties: {
          description: { type: "string", title: "Description" },
          quantity: { type: "number", title: "Qty" },
          unit_price: { type: "number", title: "Unit price" },
          tax_detail: {
            type: "object",
            title: "Tax detail",
            properties: {
              code: { type: "string", title: "Code" },
              jurisdiction: { type: "string", title: "Jurisdiction" },
            },
          },
          allocations: {
            type: "array",
            title: "Allocations",
            items: {
              type: "object",
              properties: {
                department: { type: "string", title: "Department" },
                percent: { type: "number", title: "Percent" },
              },
            },
          },
        },
      },
    },
    actual: [
      {
        description: "Transformer implementation support",
        quantity: 2,
        unit_price: 4200,
        tax_detail: { code: "TX-CA", jurisdiction: "CA" },
        allocations: [{ department: "Platform", percent: 20 }],
      },
    ],
    expected: [
      {
        description: "Transformer implementation support",
        quantity: 2,
        unit_price: 4200,
        tax_detail: { code: "TX-CA", jurisdiction: "CA" },
        allocations: [{ department: "Platform", percent: 30 }],
      },
    ],
  },
  {
    key: "requires_review",
    schema: {
      type: "boolean",
      title: "Requires review",
      description: "Whether a human should verify this document before export.",
    },
    actual: false,
    expected: true,
  },
  {
    key: "remittance",
    schema: {
      type: "object",
      title: "Remittance details",
      description: "Payment destination used for invoice reconciliation.",
      properties: {
        account_holder: {
          type: "string",
          title: "Account holder",
        },
        routing_number: {
          type: "string",
          title: "Routing number",
        },
        verified: {
          type: "boolean",
          title: "Verified",
        },
      },
    },
    actual: {
      account_holder: "Acme Supplies LLC",
      routing_number: "021000021",
      verified: false,
    },
    expected: {
      account_holder: "Acme Supply LLC",
      routing_number: "021000021",
      verified: true,
    },
  },
];

export function HumanReviewExample() {
  const [values, setValues] = React.useState(() =>
    Object.fromEntries(fields.map((field) => [field.key, field.expected])),
  );

  return (
    <HumanReviewPanel
      fields={fields}
      values={values}
      onValuesChange={setValues}
      className="h-[560px]"
    />
  );
}`

const humanReviewSourceCode =
  '"use client"\n\nimport * as React from "react"\nimport {\n  DataEditor,\n  emptyGridSelection,\n  GridCellKind,\n  type EditableGridCell,\n  type GridCell,\n  type GridColumn,\n  type GridSelection,\n  type Item,\n  type NumberCell,\n  type ProvideEditorComponent,\n  type Rectangle,\n  type TextCell,\n  type Theme,\n} from "@glideapps/glide-data-grid"\nimport {\n  ArrowLeft01Icon,\n  CancelCircleIcon,\n  FileDiffIcon,\n  InputNumericIcon,\n  InputTextIcon,\n  SecondBracketIcon,\n  SourceCodeSquareIcon,\n  TextCheckIcon,\n  Undo02Icon,\n} from "@hugeicons/core-free-icons"\nimport { HugeiconsIcon } from "@hugeicons/react"\nimport { MultiFileDiff, Virtualizer } from "@pierre/diffs/react"\nimport { flushSync } from "react-dom"\n\nimport { cn } from "@/lib/utils"\nimport { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"\nimport { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"\nimport { Button } from "@/registry/new-york-v4/ui/button"\nimport { Input } from "@/registry/new-york-v4/ui/input"\nimport { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"\nimport {\n  Tabs,\n  TabsContent,\n  TabsList,\n  TabsTrigger,\n} from "@/registry/new-york-v4/ui/tabs"\nimport {\n  Tooltip,\n  TooltipContent,\n  TooltipProvider,\n  TooltipTrigger,\n} from "@/registry/new-york-v4/ui/tooltip"\n\nimport "@glideapps/glide-data-grid/dist/index.css"\n\nexport type JsonPrimitive = string | number | boolean | null\nexport type JsonValue = JsonPrimitive | JsonObject | JsonArray\nexport type JsonObject = { [key: string]: JsonValue }\nexport type JsonArray = JsonValue[]\nexport type SchemaPropertyType =\n  | "string"\n  | "number"\n  | "integer"\n  | "boolean"\n  | "object"\n  | "array"\n\nexport type ReviewFieldSchema = {\n  type: SchemaPropertyType\n  title?: string\n  description?: string\n  enum?: Array<string | number>\n  properties?: Record<string, ReviewFieldSchema>\n  items?: ReviewFieldSchema\n}\n\nexport type HighlightArea = {\n  left: number\n  top: number\n  width: number\n  height: number\n}\n\nexport type ReviewField = {\n  key: string\n  schema: ReviewFieldSchema\n  actual: JsonValue\n  expected: JsonValue\n  location?: {\n    page: number\n    area: HighlightArea\n  }\n}\n\nconst DEFAULT_ZOOM = 0.75\nconst REVIEW_HIGHLIGHT_STYLE =\n  "border-blue-500/70 bg-blue-500/12 shadow-[0_4px_16px_rgb(59_130_246_/_10%)]"\nconst DIFF_VIEWER_THEME = {\n  "--diffs-light-bg": "oklch(0.985 0.002 247)",\n  "--diffs-dark-bg": "oklch(0.18 0.003 247)",\n  "--diffs-light": "oklch(0.22 0.01 247)",\n  "--diffs-dark": "oklch(0.92 0.006 247)",\n  "--diffs-bg-context-override":\n    "light-dark(oklch(0.967 0.003 247), oklch(0.235 0.004 247))",\n  "--diffs-bg-context-gutter-override":\n    "light-dark(oklch(0.948 0.004 247), oklch(0.205 0.004 247))",\n  "--diffs-bg-separator-override":\n    "light-dark(oklch(0.94 0.004 247), oklch(0.255 0.005 247))",\n  "--diffs-bg-buffer-override":\n    "light-dark(oklch(0.955 0.004 247), oklch(0.225 0.004 247))",\n  "--diffs-light-addition-color": "oklch(0.54 0.13 158)",\n  "--diffs-dark-addition-color": "oklch(0.72 0.13 158)",\n  "--diffs-light-deletion-color": "oklch(0.55 0.16 28)",\n  "--diffs-dark-deletion-color": "oklch(0.72 0.14 28)",\n  "--diffs-bg-addition-override":\n    "light-dark(oklch(0.957 0.032 158), oklch(0.255 0.052 158))",\n  "--diffs-bg-addition-emphasis-override":\n    "light-dark(oklch(0.88 0.06 158), oklch(0.36 0.08 158))",\n  "--diffs-bg-deletion-override":\n    "light-dark(oklch(0.958 0.03 28), oklch(0.255 0.047 28))",\n  "--diffs-bg-deletion-emphasis-override":\n    "light-dark(oklch(0.9 0.052 28), oklch(0.36 0.075 28))",\n  "--diffs-fg-number-override":\n    "light-dark(oklch(0.56 0.018 247), oklch(0.66 0.012 247))",\n  "--diffs-font-size": "12px",\n  "--diffs-line-height": "20px",\n} as React.CSSProperties\n\nfunction readIsDarkTheme() {\n  return (\n    typeof document !== "undefined" &&\n    document.documentElement.classList.contains("dark")\n  )\n}\n\n// A single shared MutationObserver backs every consumer. Each grid previously\n// created its own observer (two, via useHumanReviewGridTheme), so opening a\n// nested array view spun up and tore down several observers at once.\nconst darkThemeListeners = new Set<(isDark: boolean) => void>()\nlet darkThemeObserver: MutationObserver | null = null\nlet sharedIsDarkTheme = false\n\nfunction ensureDarkThemeObserver() {\n  if (\n    darkThemeObserver ||\n    typeof document === "undefined" ||\n    typeof MutationObserver === "undefined"\n  ) {\n    return\n  }\n\n  sharedIsDarkTheme = readIsDarkTheme()\n  darkThemeObserver = new MutationObserver(() => {\n    const nextIsDark = readIsDarkTheme()\n    if (nextIsDark === sharedIsDarkTheme) return\n\n    sharedIsDarkTheme = nextIsDark\n    darkThemeListeners.forEach((listener) => listener(nextIsDark))\n  })\n  darkThemeObserver.observe(document.documentElement, {\n    attributes: true,\n    attributeFilter: ["class"],\n  })\n}\n\nfunction useIsDarkTheme() {\n  const [isDark, setIsDark] = React.useState(readIsDarkTheme)\n\n  React.useEffect(() => {\n    ensureDarkThemeObserver()\n    setIsDark(sharedIsDarkTheme)\n    darkThemeListeners.add(setIsDark)\n\n    return () => {\n      darkThemeListeners.delete(setIsDark)\n      if (darkThemeListeners.size === 0 && darkThemeObserver) {\n        darkThemeObserver.disconnect()\n        darkThemeObserver = null\n      }\n    }\n  }, [])\n\n  return isDark\n}\n\nfunction useHumanReviewGridTheme() {\n  const isDark = useIsDarkTheme()\n\n  return React.useMemo<Partial<Theme>>(\n    () => ({\n      accentColor: isDark ? "rgb(96, 165, 250)" : "rgb(37, 99, 235)",\n      accentLight: isDark ? "rgba(29, 78, 216, 0.15)" : "rgb(219, 234, 254)",\n      accentFg: "rgb(255, 255, 255)",\n      textDark: isDark ? "rgb(229, 229, 229)" : "rgb(23, 23, 23)",\n      textMedium: isDark ? "rgb(163, 163, 163)" : "rgb(82, 82, 82)",\n      textLight: isDark ? "rgb(115, 115, 115)" : "rgb(163, 163, 163)",\n      textBubble: isDark ? "rgb(245, 245, 245)" : "rgb(23, 23, 23)",\n      textHeader: isDark ? "rgb(245, 245, 245)" : "rgb(23, 23, 23)",\n      textGroupHeader: isDark ? "rgb(163, 163, 163)" : "rgb(82, 82, 82)",\n      bgCell: isDark ? "rgb(10, 10, 10)" : "rgb(255, 255, 255)",\n      bgCellMedium: isDark ? "rgb(23, 23, 23)" : "rgb(250, 250, 250)",\n      bgHeader: isDark ? "rgb(23, 23, 23)" : "rgb(250, 250, 250)",\n      bgHeaderHasFocus: isDark ? "rgb(38, 38, 38)" : "rgb(245, 245, 245)",\n      bgHeaderHovered: isDark ? "rgb(38, 38, 38)" : "rgb(245, 245, 245)",\n      borderColor: isDark ? "rgb(38, 38, 38)" : "rgb(229, 229, 229)",\n      horizontalBorderColor: isDark ? "rgb(38, 38, 38)" : "rgb(229, 229, 229)",\n      cellHorizontalPadding: 8,\n      cellVerticalPadding: 3,\n      headerIconSize: 18,\n      baseFontStyle: "13px",\n      headerFontStyle: "600 13px",\n      markerFontStyle: "11px",\n      fontFamily: \'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif\',\n      editorFontSize: "13px",\n    }),\n    [isDark]\n  )\n}\n\nconst REVIEW_FIELDS: ReviewField[] = [\n  {\n    key: "vendor_name",\n    schema: {\n      type: "string",\n      title: "Vendor name",\n      description: "Supplier shown on the invoice header.",\n    },\n    actual: "Acme Supplies LLC",\n    expected: "Acme Supply LLC",\n    location: {\n      page: 1,\n      area: { left: 31, top: 30, width: 40, height: 5.8 },\n    },\n  },\n  {\n    key: "line_items",\n    schema: {\n      type: "array",\n      title: "Line items",\n      description: "Invoice rows with nested allocation details.",\n      items: {\n        type: "object",\n        properties: {\n          description: {\n            type: "string",\n            title: "Description",\n          },\n          quantity: {\n            type: "number",\n            title: "Qty",\n          },\n          unit_price: {\n            type: "number",\n            title: "Unit price",\n          },\n          tax_detail: {\n            type: "object",\n            title: "Tax detail",\n            properties: {\n              code: {\n                type: "string",\n                title: "Code",\n              },\n              jurisdiction: {\n                type: "string",\n                title: "Jurisdiction",\n              },\n            },\n          },\n          allocations: {\n            type: "array",\n            title: "Allocations",\n            items: {\n              type: "object",\n              properties: {\n                department: {\n                  type: "string",\n                  title: "Department",\n                },\n                percent: {\n                  type: "number",\n                  title: "Percent",\n                },\n              },\n            },\n          },\n        },\n      },\n    },\n    actual: [\n      {\n        description: "Transformer implementation support",\n        quantity: 2,\n        unit_price: 4200,\n        tax_detail: { code: "TX-CA", jurisdiction: "CA" },\n        allocations: [\n          { department: "Research", percent: 70 },\n          { department: "Platform", percent: 20 },\n        ],\n      },\n      {\n        description: "Attention model review",\n        quantity: 1,\n        unit_price: 4080,\n        tax_detail: { code: "TX-NY", jurisdiction: "NY" },\n        allocations: [{ department: "Research", percent: 100 }],\n      },\n    ],\n    expected: [\n      {\n        description: "Transformer implementation support",\n        quantity: 2,\n        unit_price: 4200,\n        tax_detail: { code: "TX-CA", jurisdiction: "CA" },\n        allocations: [\n          { department: "Research", percent: 70 },\n          { department: "Platform", percent: 30 },\n        ],\n      },\n      {\n        description: "Attention model review",\n        quantity: 1,\n        unit_price: 4080.75,\n        tax_detail: { code: "TX-NY", jurisdiction: "NY" },\n        allocations: [{ department: "Research", percent: 100 }],\n      },\n    ],\n    location: {\n      page: 1,\n      area: { left: 13.5, top: 66, width: 73.5, height: 7.5 },\n    },\n  },\n  {\n    key: "total_amount",\n    schema: {\n      type: "number",\n      title: "Total amount",\n      description: "Final amount due including tax.",\n    },\n    actual: 12480,\n    expected: 12480.75,\n    location: {\n      page: 1,\n      area: { left: 13.5, top: 66, width: 73.5, height: 7.5 },\n    },\n  },\n  {\n    key: "payment_terms",\n    schema: {\n      type: "string",\n      title: "Payment terms",\n      enum: ["Due on receipt", "Net 15", "Net 30"],\n    },\n    actual: "Net 15",\n    expected: "Net 30",\n    location: {\n      page: 1,\n      area: { left: 13.5, top: 55.5, width: 73.5, height: 7.5 },\n    },\n  },\n  {\n    key: "requires_review",\n    schema: {\n      type: "boolean",\n      title: "Requires review",\n      description: "Whether a human should verify this document before export.",\n    },\n    actual: false,\n    expected: true,\n    location: {\n      page: 2,\n      area: { left: 9.5, top: 12, width: 81, height: 11.5 },\n    },\n  },\n  {\n    key: "remittance",\n    schema: {\n      type: "object",\n      title: "Remittance details",\n      description: "Payment destination used for invoice reconciliation.",\n      properties: {\n        account_holder: {\n          type: "string",\n          title: "Account holder",\n        },\n        routing_number: {\n          type: "string",\n          title: "Routing number",\n        },\n        verified: {\n          type: "boolean",\n          title: "Verified",\n        },\n      },\n    },\n    actual: {\n      account_holder: "Acme Supplies LLC",\n      routing_number: "021000021",\n      verified: false,\n    },\n    expected: {\n      account_holder: "Acme Supply LLC",\n      routing_number: "021000021",\n      verified: true,\n    },\n  },\n]\n\nfunction valuesFromFields(\n  fields: ReviewField[],\n  valueKey: "actual" | "expected"\n) {\n  return fields.reduce<JsonObject>((values, field) => {\n    values[field.key] = field[valueKey]\n    return values\n  }, {})\n}\n\nfunction formatJson(value: unknown) {\n  return JSON.stringify(value, null, 2)\n}\n\nfunction isJsonObject(value: JsonValue): value is JsonObject {\n  return typeof value === "object" && value !== null && !Array.isArray(value)\n}\n\nfunction isJsonArray(value: JsonValue): value is JsonArray {\n  return Array.isArray(value)\n}\n\nfunction getObjectValue(value: JsonValue, key: string): JsonValue {\n  if (!isJsonObject(value)) return null\n  return value[key] ?? null\n}\n\nfunction setObjectValue(\n  value: JsonValue,\n  key: string,\n  childValue: JsonValue\n): JsonObject {\n  return {\n    ...(isJsonObject(value) ? value : {}),\n    [key]: childValue,\n  }\n}\n\nfunction getArrayValue(value: JsonValue): JsonArray {\n  return isJsonArray(value) ? value : []\n}\n\nfunction setArrayItemValue(\n  value: JsonValue,\n  index: number,\n  childValue: JsonValue\n): JsonArray {\n  const nextValue = getArrayValue(value).slice()\n  nextValue[index] = childValue\n  return nextValue\n}\n\nfunction getPrimitiveValue(value: JsonValue): JsonPrimitive {\n  return isJsonObject(value) || isJsonArray(value) ? null : value\n}\n\nfunction jsonValuesEqual(left: JsonValue, right: JsonValue) {\n  return formatJson(left) === formatJson(right)\n}\n\nfunction countReviewFields(fields: ReviewField[]): number {\n  return fields.reduce((count, field) => {\n    if (field.schema.type !== "object") return count + 1\n\n    const properties = field.schema.properties ?? {}\n    const childFields = Object.entries(properties).map(\n      ([key, schema]): ReviewField => ({\n        key: `${field.key}.${key}`,\n        schema,\n        actual: getObjectValue(field.actual, key),\n        expected: getObjectValue(field.expected, key),\n      })\n    )\n\n    return count + Math.max(countReviewFields(childFields), 1)\n  }, 0)\n}\n\nfunction findReviewField(\n  fields: ReviewField[],\n  fieldKey: string | undefined\n): ReviewField | undefined {\n  if (!fieldKey) return undefined\n\n  for (const field of fields) {\n    if (field.key === fieldKey) return field\n\n    if (field.schema.type === "object") {\n      const childFields = Object.entries(field.schema.properties ?? {}).map(\n        ([key, schema]): ReviewField => ({\n          key: `${field.key}.${key}`,\n          schema,\n          actual: getObjectValue(field.actual, key),\n          expected: getObjectValue(field.expected, key),\n        })\n      )\n      const childField = findReviewField(childFields, fieldKey)\n      if (childField) return childField\n    }\n  }\n\n  return undefined\n}\n\nfunction formatValue(value: JsonValue) {\n  if (value === null) return "NULL"\n  if (isJsonObject(value) || isJsonArray(value)) return formatJson(value)\n  if (typeof value === "boolean") return value ? "true" : "false"\n  return String(value)\n}\n\nfunction areGridRangesEqual(\n  left: Readonly<Rectangle> | undefined,\n  right: Readonly<Rectangle> | undefined\n) {\n  return (\n    left === right ||\n    (left !== undefined &&\n      right !== undefined &&\n      left.x === right.x &&\n      left.y === right.y &&\n      left.width === right.width &&\n      left.height === right.height)\n  )\n}\n\nfunction areGridRangeStacksEqual(\n  left: readonly Readonly<Rectangle>[] | undefined,\n  right: readonly Readonly<Rectangle>[] | undefined\n) {\n  if (left === right) return true\n  if (!left || !right || left.length !== right.length) return false\n\n  return left.every((range, index) => areGridRangesEqual(range, right[index]))\n}\n\nfunction areGridSelectionsEqual(left: GridSelection, right: GridSelection) {\n  const leftCurrent = left.current\n  const rightCurrent = right.current\n\n  return (\n    leftCurrent?.cell[0] === rightCurrent?.cell[0] &&\n    leftCurrent?.cell[1] === rightCurrent?.cell[1] &&\n    areGridRangesEqual(leftCurrent?.range, rightCurrent?.range) &&\n    areGridRangeStacksEqual(\n      leftCurrent?.rangeStack,\n      rightCurrent?.rangeStack\n    ) &&\n    left.columns.equals(right.columns) &&\n    left.rows.equals(right.rows)\n  )\n}\n\nfunction getGridSelectionRanges(selection: GridSelection | undefined) {\n  const current = selection?.current\n  if (!current) return []\n\n  return [...(current.rangeStack ?? []), current.range]\n}\n\nfunction areArrayNestedViewsEqual(\n  left: ArrayNestedView[],\n  right: ArrayNestedView[]\n) {\n  if (left === right) return true\n  if (left.length !== right.length) return false\n\n  return left.every((view, index) => {\n    const other = right[index]\n\n    return (\n      view.rowIndex === other?.rowIndex &&\n      view.columnId === other.columnId &&\n      view.title === other.title &&\n      view.schema === other.schema &&\n      Object.is(view.value, other.value)\n    )\n  })\n}\n\ntype HumanReviewOverlayCell = TextCell | NumberCell\n\ntype HumanReviewTextOverlayEditorProps = React.ComponentProps<\n  ProvideEditorComponent<HumanReviewOverlayCell>\n> & {\n  overlayOpenRef: React.RefObject<boolean>\n  readOnly?: boolean\n}\n\nfunction HumanReviewTextOverlayEditor({\n  isHighlighted,\n  onFinishedEditing,\n  overlayOpenRef,\n  readOnly = false,\n  validatedSelection,\n  value,\n}: HumanReviewTextOverlayEditorProps) {\n  const inputRef = React.useRef<HTMLTextAreaElement | null>(null)\n  const initialValue =\n    value.kind === GridCellKind.Number ? value.displayData : value.data\n  const latestValueRef = React.useRef(initialValue)\n  const finishedRef = React.useRef(false)\n\n  const finishEditing = React.useCallback(\n    (\n      shouldSave: boolean,\n      movement: readonly [-1 | 0 | 1, -1 | 0 | 1] = [0, 0]\n    ) => {\n      if (finishedRef.current) return\n\n      finishedRef.current = true\n      overlayOpenRef.current = false\n\n      if (!shouldSave || readOnly) {\n        onFinishedEditing(undefined, movement)\n        return\n      }\n\n      if (value.kind === GridCellKind.Number) {\n        const numericValue = Number(latestValueRef.current)\n\n        onFinishedEditing(\n          {\n            ...value,\n            data: Number.isFinite(numericValue) ? numericValue : value.data,\n            displayData: latestValueRef.current,\n          },\n          movement\n        )\n        return\n      }\n\n      onFinishedEditing(\n        {\n          ...value,\n          data: latestValueRef.current,\n          displayData: latestValueRef.current,\n        },\n        movement\n      )\n    },\n    [onFinishedEditing, overlayOpenRef, readOnly, value]\n  )\n\n  React.useEffect(() => {\n    overlayOpenRef.current = true\n\n    const input = inputRef.current\n    if (!input) {\n      return () => {\n        overlayOpenRef.current = false\n      }\n    }\n\n    const handleInput = (event: Event) => {\n      event.stopPropagation()\n      latestValueRef.current = input.value\n    }\n    const stopTextInputPropagation = (event: Event) => {\n      event.stopPropagation()\n    }\n    const handleKeyDown = (event: KeyboardEvent) => {\n      event.stopPropagation()\n\n      if (event.key === "Escape") {\n        event.preventDefault()\n        finishEditing(false)\n        return\n      }\n\n      if (event.key === "Tab") {\n        event.preventDefault()\n        finishEditing(true, [event.shiftKey ? -1 : 1, 0])\n        return\n      }\n\n      if (event.key === "Enter" && !event.shiftKey) {\n        event.preventDefault()\n        finishEditing(true, [0, 1])\n      }\n    }\n\n    input.addEventListener("input", handleInput)\n    input.addEventListener("beforeinput", stopTextInputPropagation, true)\n    input.addEventListener("keydown", handleKeyDown, true)\n\n    input.focus()\n\n    if (validatedSelection !== undefined) {\n      const selectionRange =\n        typeof validatedSelection === "number"\n          ? [validatedSelection, validatedSelection]\n          : validatedSelection\n      input.setSelectionRange(selectionRange[0], selectionRange[1])\n    } else if (isHighlighted) {\n      input.setSelectionRange(0, input.value.length)\n    } else {\n      input.setSelectionRange(input.value.length, input.value.length)\n    }\n\n    return () => {\n      input.removeEventListener("input", handleInput)\n      input.removeEventListener("beforeinput", stopTextInputPropagation, true)\n      input.removeEventListener("keydown", handleKeyDown, true)\n      overlayOpenRef.current = false\n    }\n  }, [\n    finishEditing,\n    isHighlighted,\n    overlayOpenRef,\n    validatedSelection,\n    readOnly,\n  ])\n\n  React.useEffect(() => {\n    const handlePointerOutside = (event: PointerEvent | MouseEvent) => {\n      const input = inputRef.current\n      const overlayRoot = input?.closest(".gdg-clip-region")\n\n      if (!overlayRoot || overlayRoot.contains(event.target as Node | null)) {\n        return\n      }\n\n      finishEditing(true)\n    }\n\n    document.addEventListener("pointerdown", handlePointerOutside, true)\n    document.addEventListener("contextmenu", handlePointerOutside, true)\n\n    return () => {\n      document.removeEventListener("pointerdown", handlePointerOutside, true)\n      document.removeEventListener("contextmenu", handlePointerOutside, true)\n    }\n  }, [finishEditing])\n\n  return (\n    <textarea\n      ref={inputRef}\n      className="gdg-input"\n      defaultValue={initialValue}\n      readOnly={readOnly}\n      aria-readonly={readOnly}\n      dir="auto"\n      style={{ height: "100%", minHeight: 32, resize: "none", width: "100%" }}\n    />\n  )\n}\n\nfunction getFieldIcon(type: SchemaPropertyType) {\n  if (type === "number" || type === "integer") return InputNumericIcon\n  if (type === "boolean") return TextCheckIcon\n  if (type === "array") return SecondBracketIcon\n  if (type === "object") return SourceCodeSquareIcon\n  return InputTextIcon\n}\n\nfunction HumanReviewValueInput({\n  readOnly = false,\n  schema,\n  value,\n  onChange,\n}: {\n  readOnly?: boolean\n  schema: ReviewFieldSchema\n  value: JsonPrimitive\n  onChange: (value: JsonPrimitive) => void\n}) {\n  if (schema.enum?.length) {\n    return (\n      <span className="relative inline-flex w-full rounded-lg border border-input bg-background text-sm text-foreground shadow-xs/5 dark:bg-input/32">\n        <select\n          disabled={readOnly}\n          value={value === null ? "" : String(value)}\n          onChange={(event) => onChange(event.target.value)}\n          className="h-8.5 w-full appearance-none rounded-[inherit] bg-transparent px-3 text-sm outline-none sm:h-7.5"\n        >\n          {schema.enum.map((option) => (\n            <option key={String(option)} value={String(option)}>\n              {String(option)}\n            </option>\n          ))}\n        </select>\n      </span>\n    )\n  }\n\n  if (schema.type === "number" || schema.type === "integer") {\n    return (\n      <Input\n        nativeInput\n        readOnly={readOnly}\n        type="number"\n        value={value === null ? "" : String(value)}\n        onChange={(event) => {\n          const nextValue = event.currentTarget.value\n          onChange(nextValue === "" ? null : Number(nextValue))\n        }}\n      />\n    )\n  }\n\n  if (schema.type === "boolean") {\n    return (\n      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-0.5">\n        {[true, false].map((option) => (\n          <Button\n            key={String(option)}\n            type="button"\n            size="sm"\n            variant={value === option ? "outline" : "ghost"}\n            className={cn(\n              "h-7 shadow-none",\n              value === option && "bg-background dark:bg-input"\n            )}\n            disabled={readOnly}\n            onClick={() => onChange(option)}\n          >\n            {option ? "True" : "False"}\n          </Button>\n        ))}\n      </div>\n    )\n  }\n\n  return (\n    <Input\n      nativeInput\n      readOnly={readOnly}\n      value={value === null ? "" : String(value)}\n      onChange={(event) => onChange(event.currentTarget.value)}\n    />\n  )\n}\n\nfunction getArrayItemSchema(schema: ReviewFieldSchema): ReviewFieldSchema {\n  return schema.items ?? { type: "string" }\n}\n\nfunction isComplexSchema(schema: ReviewFieldSchema) {\n  return schema.type === "object" || schema.type === "array"\n}\n\nfunction summarizeComplexValue(value: JsonValue) {\n  if (isJsonArray(value)) return `${value.length} items`\n  if (isJsonObject(value)) return `${Object.keys(value).length} fields`\n  return formatValue(value)\n}\n\nfunction getCellValueForArrayColumn(\n  rowValue: JsonValue,\n  itemSchema: ReviewFieldSchema,\n  columnId: string\n) {\n  if (itemSchema.type === "object") {\n    return getObjectValue(rowValue, columnId)\n  }\n\n  return rowValue\n}\n\nfunction getCellSchemaForArrayColumn(\n  itemSchema: ReviewFieldSchema,\n  columnId: string\n) {\n  if (itemSchema.type === "object") {\n    return itemSchema.properties?.[columnId] ?? { type: "string" }\n  }\n\n  return itemSchema\n}\n\nfunction applyPrimitiveEdit(\n  schema: ReviewFieldSchema,\n  value: EditableGridCell\n): JsonValue | undefined {\n  if (schema.type === "boolean" && value.kind === GridCellKind.Boolean) {\n    return value.data\n  }\n\n  if (\n    (schema.type === "number" || schema.type === "integer") &&\n    value.kind === GridCellKind.Number\n  ) {\n    return value.data ?? null\n  }\n\n  if (value.kind === GridCellKind.Text) {\n    if (schema.type === "number" || schema.type === "integer") {\n      return value.data.trim() === "" ? null : Number(value.data)\n    }\n\n    return value.data\n  }\n\n  return undefined\n}\n\ntype ArrayNestedView = {\n  rowIndex: number\n  columnId: string\n  title: string\n  schema: ReviewFieldSchema\n  value: JsonValue\n}\n\ntype ArrayReviewSide = "actual" | "expected"\n\ntype SyncedArrayNestedView = {\n  activeSide: ArrayReviewSide | null\n  stack: ArrayNestedView[]\n}\n\ntype SyncedArraySelection = {\n  activeSide: ArrayReviewSide | null\n  depth: number\n  gridSelection: GridSelection\n}\n\nexport type HumanReviewTheme = "light" | "dark"\n\nconst EMPTY_SYNCED_ARRAY_NESTED_VIEW: SyncedArrayNestedView = {\n  activeSide: null,\n  stack: [],\n}\n\nconst EMPTY_SYNCED_ARRAY_SELECTION: SyncedArraySelection = {\n  activeSide: null,\n  depth: 0,\n  gridSelection: emptyGridSelection,\n}\n\nfunction setNestedArrayValue({\n  value,\n  schema,\n  nestedStack,\n  nextNestedValue,\n}: {\n  value: JsonValue\n  schema: ReviewFieldSchema\n  nestedStack: ArrayNestedView[]\n  nextNestedValue: JsonValue\n}): JsonValue {\n  const [currentView, ...remainingViews] = nestedStack\n\n  if (!currentView) return nextNestedValue\n\n  const itemSchema = getArrayItemSchema(schema)\n  const rowValue = getArrayValue(value)[currentView.rowIndex] ?? null\n  const cellSchema = getCellSchemaForArrayColumn(\n    itemSchema,\n    currentView.columnId\n  )\n  const currentCellValue = getCellValueForArrayColumn(\n    rowValue,\n    itemSchema,\n    currentView.columnId\n  )\n  const nextCellValue: JsonValue = remainingViews.length\n    ? setNestedArrayValue({\n        value: currentCellValue,\n        schema: cellSchema,\n        nestedStack: remainingViews,\n        nextNestedValue,\n      })\n    : nextNestedValue\n  const nextRowValue: JsonValue =\n    itemSchema.type === "object"\n      ? setObjectValue(rowValue, currentView.columnId, nextCellValue)\n      : nextCellValue\n\n  return setArrayItemValue(value, currentView.rowIndex, nextRowValue)\n}\n\nfunction getNestedArrayValue({\n  value,\n  schema,\n  nestedStack,\n}: {\n  value: JsonValue\n  schema: ReviewFieldSchema\n  nestedStack: ArrayNestedView[]\n}): JsonValue {\n  const [currentView, ...remainingViews] = nestedStack\n\n  if (!currentView) return value\n\n  const itemSchema = getArrayItemSchema(schema)\n  const rowValue = getArrayValue(value)[currentView.rowIndex] ?? null\n  const cellSchema = getCellSchemaForArrayColumn(\n    itemSchema,\n    currentView.columnId\n  )\n  const cellValue = getCellValueForArrayColumn(\n    rowValue,\n    itemSchema,\n    currentView.columnId\n  )\n\n  if (!remainingViews.length) return cellValue\n\n  return getNestedArrayValue({\n    value: cellValue,\n    schema: cellSchema,\n    nestedStack: remainingViews,\n  })\n}\n\nfunction HumanReviewArrayValueGrid({\n  activeNestedSide = null,\n  activeSelectionSide = null,\n  label,\n  nestedStackBaseDepth = 0,\n  readOnly = false,\n  schema,\n  selectionDepth = 0,\n  sharedGridSelection,\n  sharedNestedStack,\n  value,\n  viewSide = "expected",\n  onChange,\n  onGridSelectionChange,\n  onNestedStackChange,\n}: {\n  activeNestedSide?: ArrayReviewSide | null\n  activeSelectionSide?: ArrayReviewSide | null\n  label: string\n  nestedStackBaseDepth?: number\n  readOnly?: boolean\n  schema: ReviewFieldSchema\n  selectionDepth?: number\n  sharedGridSelection?: GridSelection\n  sharedNestedStack?: ArrayNestedView[]\n  value: JsonValue\n  viewSide?: ArrayReviewSide\n  onChange?: (value: JsonValue) => void\n  onGridSelectionChange?: (\n    selection: GridSelection,\n    side: ArrayReviewSide,\n    depth: number\n  ) => void\n  onNestedStackChange?: (\n    stack: ArrayNestedView[],\n    side: ArrayReviewSide\n  ) => void\n}) {\n  const rows = getArrayValue(value)\n  const itemSchema = getArrayItemSchema(schema)\n  const gridTheme = useHumanReviewGridTheme()\n  const isDark = useIsDarkTheme()\n  const [localNestedStack, setLocalNestedStack] = React.useState<\n    ArrayNestedView[]\n  >([])\n  const [localGridSelection, setLocalGridSelection] =\n    React.useState<GridSelection>(emptyGridSelection)\n  const fastTextOverlayOpenRef = React.useRef(false)\n  const nestedStack = sharedNestedStack ?? localNestedStack\n  const visibleNestedStack = nestedStack.slice(nestedStackBaseDepth)\n  const activeNestedView = visibleNestedStack[0] ?? null\n  const activeNestedValue = activeNestedView\n    ? getNestedArrayValue({\n        value,\n        schema,\n        nestedStack: [activeNestedView],\n      })\n    : null\n  const isActiveNestedSource =\n    Boolean(activeNestedView) && activeNestedSide === viewSide\n  const isMirroredNestedTarget =\n    Boolean(activeNestedView) &&\n    activeNestedSide !== null &&\n    activeNestedSide !== viewSide\n  const blueCellText = isDark ? "rgb(147, 197, 253)" : "rgb(37, 99, 235)"\n  const selectedCellBackground = isDark\n    ? "rgba(37, 99, 235, 0.2)"\n    : "rgba(219, 234, 254, 0.85)"\n  const mirroredCellBackground = isDark\n    ? "rgba(167, 139, 250, 0.18)"\n    : "rgba(237, 233, 254, 0.9)"\n  const mirroredHighlightRegions = React.useMemo<\n    React.ComponentProps<typeof DataEditor>["highlightRegions"]\n  >(() => {\n    if (\n      !activeSelectionSide ||\n      activeSelectionSide === viewSide ||\n      selectionDepth !== nestedStackBaseDepth\n    ) {\n      return undefined\n    }\n\n    const ranges = getGridSelectionRanges(sharedGridSelection)\n    if (!ranges.length) return undefined\n\n    return ranges.map((range) => ({\n      color: mirroredCellBackground,\n      range,\n      style: "dashed" as const,\n    }))\n  }, [\n    activeSelectionSide,\n    mirroredCellBackground,\n    nestedStackBaseDepth,\n    selectionDepth,\n    sharedGridSelection,\n    viewSide,\n  ])\n\n  const setNestedStack = React.useCallback(\n    (\n      updater:\n        | ArrayNestedView[]\n        | ((current: ArrayNestedView[]) => ArrayNestedView[])\n    ) => {\n      if (onNestedStackChange) {\n        const nextStack =\n          typeof updater === "function" ? updater(nestedStack) : updater\n\n        onNestedStackChange(nextStack, viewSide)\n        return\n      }\n\n      setLocalNestedStack(updater)\n    },\n    [nestedStack, onNestedStackChange, viewSide]\n  )\n\n  const handleGridSelectionChange = React.useCallback(\n    (selection: GridSelection) => {\n      flushSync(() => {\n        setLocalGridSelection((current) =>\n          areGridSelectionsEqual(current, selection) ? current : selection\n        )\n      })\n\n      if (onGridSelectionChange) {\n        if (\n          activeSelectionSide === viewSide &&\n          sharedGridSelection &&\n          areGridSelectionsEqual(sharedGridSelection, selection)\n        ) {\n          return\n        }\n\n        React.startTransition(() => {\n          onGridSelectionChange(selection, viewSide, nestedStackBaseDepth)\n        })\n        return\n      }\n    },\n    [\n      activeSelectionSide,\n      nestedStackBaseDepth,\n      onGridSelectionChange,\n      sharedGridSelection,\n      viewSide,\n    ]\n  )\n\n  const columns = React.useMemo<GridColumn[]>(() => {\n    if (itemSchema.type === "object") {\n      const propertyEntries = Object.entries(itemSchema.properties ?? {})\n\n      if (propertyEntries.length) {\n        return propertyEntries.map(([key, propertySchema]) => ({\n          id: key,\n          title: propertySchema.title ?? key,\n          width: isComplexSchema(propertySchema) ? 148 : 132,\n        }))\n      }\n    }\n\n    return [\n      {\n        id: "value",\n        title: itemSchema.title ?? "Value",\n        width: isComplexSchema(itemSchema) ? 148 : 180,\n      },\n    ]\n  }, [itemSchema])\n\n  const getCellContent = React.useCallback(\n    ([col, row]: Item): GridCell => {\n      const column = columns[col]\n      const columnId = String(column?.id ?? "value")\n      const rowValue = rows[row] ?? null\n      const cellSchema = getCellSchemaForArrayColumn(itemSchema, columnId)\n      const cellValue = getCellValueForArrayColumn(\n        rowValue,\n        itemSchema,\n        columnId\n      )\n      const matchedNestedCell =\n        activeNestedView?.rowIndex === row &&\n        activeNestedView.columnId === columnId\n      const nestedCellTheme: Partial<Theme> | undefined = matchedNestedCell\n        ? {\n            bgCell: isMirroredNestedTarget\n              ? mirroredCellBackground\n              : selectedCellBackground,\n            textDark: blueCellText,\n          }\n        : undefined\n\n      if (isComplexSchema(cellSchema)) {\n        return {\n          kind: GridCellKind.Text,\n          data: summarizeComplexValue(cellValue),\n          displayData: summarizeComplexValue(cellValue),\n          allowOverlay: false,\n          readonly: true,\n          cursor: "pointer",\n          activationBehaviorOverride: "second-click",\n          themeOverride: {\n            textDark: blueCellText,\n            ...(nestedCellTheme ?? {}),\n          },\n        }\n      }\n\n      if (cellSchema.type === "boolean") {\n        return {\n          kind: GridCellKind.Boolean,\n          data: typeof cellValue === "boolean" ? cellValue : false,\n          allowOverlay: false,\n          readonly: readOnly,\n        }\n      }\n\n      if (cellSchema.type === "number" || cellSchema.type === "integer") {\n        return {\n          kind: GridCellKind.Number,\n          data: typeof cellValue === "number" ? cellValue : undefined,\n          displayData: typeof cellValue === "number" ? String(cellValue) : "",\n          allowOverlay: true,\n          readonly: false,\n          activationBehaviorOverride: readOnly ? "single-click" : undefined,\n        }\n      }\n\n      return {\n        kind: GridCellKind.Text,\n        data:\n          cellValue === null ||\n          isJsonObject(cellValue) ||\n          isJsonArray(cellValue)\n            ? ""\n            : String(cellValue),\n        displayData:\n          cellValue === null ||\n          isJsonObject(cellValue) ||\n          isJsonArray(cellValue)\n            ? ""\n            : String(cellValue),\n        allowOverlay: true,\n        readonly: false,\n        activationBehaviorOverride: readOnly ? "single-click" : undefined,\n      }\n    },\n    [\n      activeNestedView,\n      blueCellText,\n      columns,\n      isMirroredNestedTarget,\n      itemSchema,\n      mirroredCellBackground,\n      readOnly,\n      rows,\n      selectedCellBackground,\n    ]\n  )\n\n  const updateCellValue = React.useCallback(\n    ([col, row]: Item, nextCell: EditableGridCell) => {\n      if (readOnly || !onChange) return\n\n      const column = columns[col]\n      const columnId = String(column?.id ?? "value")\n      const rowValue = rows[row] ?? null\n      const cellSchema = getCellSchemaForArrayColumn(itemSchema, columnId)\n      const nextValue = applyPrimitiveEdit(cellSchema, nextCell)\n\n      if (nextValue === undefined) return\n\n      const nextRowValue =\n        itemSchema.type === "object"\n          ? setObjectValue(rowValue, columnId, nextValue)\n          : nextValue\n\n      onChange(setArrayItemValue(value, row, nextRowValue))\n    },\n    [columns, itemSchema, onChange, readOnly, rows, value]\n  )\n  const provideEditor = React.useCallback<\n    NonNullable<React.ComponentProps<typeof DataEditor>["provideEditor"]>\n  >(\n    (cell) => {\n      if (\n        cell.kind !== GridCellKind.Text &&\n        cell.kind !== GridCellKind.Number\n      ) {\n        return undefined\n      }\n\n      return {\n        editor: (props) => {\n          if (\n            props.value.kind !== GridCellKind.Text &&\n            props.value.kind !== GridCellKind.Number\n          ) {\n            return null\n          }\n\n          return (\n            <HumanReviewTextOverlayEditor\n              {...(props as React.ComponentProps<\n                ProvideEditorComponent<HumanReviewOverlayCell>\n              >)}\n              overlayOpenRef={fastTextOverlayOpenRef}\n              readOnly={readOnly}\n            />\n          )\n        },\n      }\n    },\n    [readOnly]\n  )\n  const handleOutsideClick = React.useCallback(\n    () => !fastTextOverlayOpenRef.current,\n    []\n  )\n\n  const openNestedCell = React.useCallback(\n    ([col, row]: Item) => {\n      const column = columns[col]\n      const columnId = String(column?.id ?? "value")\n      const rowValue = rows[row] ?? null\n      const cellSchema = getCellSchemaForArrayColumn(itemSchema, columnId)\n\n      if (!isComplexSchema(cellSchema)) return\n\n      setNestedStack((current) => {\n        const nextView = {\n          rowIndex: row,\n          columnId,\n          title: `${column?.title ?? columnId} / row ${row + 1}`,\n          schema: cellSchema,\n          value: getCellValueForArrayColumn(rowValue, itemSchema, columnId),\n        }\n        const currentView = current[nestedStackBaseDepth]\n\n        if (\n          currentView?.rowIndex === nextView.rowIndex &&\n          currentView.columnId === nextView.columnId\n        ) {\n          return current\n        }\n\n        return [...current.slice(0, nestedStackBaseDepth), nextView]\n      })\n    },\n    [columns, itemSchema, nestedStackBaseDepth, rows, setNestedStack]\n  )\n\n  const updateNestedValue = React.useCallback(\n    (nextNestedValue: JsonValue) => {\n      if (!activeNestedView || readOnly || !onChange) return\n\n      onChange(\n        setNestedArrayValue({\n          value,\n          schema,\n          nestedStack: visibleNestedStack.slice(0, 1),\n          nextNestedValue,\n        })\n      )\n      setNestedStack((current) =>\n        current.map((view, index) =>\n          index === nestedStackBaseDepth\n            ? { ...view, value: nextNestedValue }\n            : view\n        )\n      )\n    },\n    [\n      activeNestedView,\n      nestedStackBaseDepth,\n      onChange,\n      readOnly,\n      schema,\n      setNestedStack,\n      value,\n      visibleNestedStack,\n    ]\n  )\n\n  return (\n    <div\n      className={cn(\n        "relative overflow-hidden rounded-md border bg-background transition-[border-color,background-color,box-shadow] focus-within:border-blue-500/50 focus-within:shadow-[0_0_0_1px_rgb(59_130_246_/_8%)] hover:border-blue-500/50",\n        isActiveNestedSource &&\n          "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_10%)]"\n      )}\n    >\n      <div>\n        <div className="flex h-8 items-center justify-between gap-2 border-b px-2 text-[11px] font-medium text-muted-foreground">\n          <span>{label}</span>\n          <span>{rows.length} rows</span>\n        </div>\n        <div className="h-[220px]">\n          <DataEditor\n            columns={columns}\n            rows={rows.length}\n            getCellContent={getCellContent}\n            cellActivationBehavior={readOnly ? "single-click" : "second-click"}\n            gridSelection={localGridSelection}\n            highlightRegions={mirroredHighlightRegions}\n            onCellEdited={updateCellValue}\n            onCellActivated={openNestedCell}\n            onGridSelectionChange={handleGridSelectionChange}\n            provideEditor={provideEditor}\n            isOutsideClick={handleOutsideClick}\n            rowMarkers="number"\n            smoothScrollX\n            smoothScrollY\n            theme={gridTheme}\n            width="100%"\n            height="100%"\n            rowHeight={32}\n            headerHeight={34}\n          />\n        </div>\n      </div>\n      {activeNestedView ? (\n        <div className="absolute inset-0 z-10 flex flex-col bg-background">\n          <div className="flex h-8 items-center gap-2 border-b px-2">\n            <Button\n              type="button"\n              variant="ghost"\n              size="icon-sm"\n              className="size-6 text-muted-foreground"\n              onClick={() =>\n                setNestedStack((current) =>\n                  current.slice(\n                    0,\n                    Math.max(nestedStackBaseDepth, current.length - 1)\n                  )\n                )\n              }\n              aria-label="Back to parent array"\n            >\n              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5" />\n            </Button>\n            <div className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">\n              {activeNestedView.title}\n            </div>\n          </div>\n          <div className="min-h-0 flex-1 overflow-auto p-2">\n            {activeNestedView.schema.type === "array" ? (\n              <HumanReviewArrayValueGrid\n                label={\n                  activeNestedView.schema.title ?? activeNestedView.columnId\n                }\n                nestedStackBaseDepth={nestedStackBaseDepth + 1}\n                readOnly={readOnly}\n                schema={activeNestedView.schema}\n                sharedGridSelection={sharedGridSelection}\n                sharedNestedStack={sharedNestedStack}\n                value={activeNestedValue}\n                viewSide={viewSide}\n                activeNestedSide={activeNestedSide}\n                activeSelectionSide={activeSelectionSide}\n                selectionDepth={selectionDepth}\n                onChange={updateNestedValue}\n                onGridSelectionChange={onGridSelectionChange}\n                onNestedStackChange={onNestedStackChange}\n              />\n            ) : (\n              <HumanReviewObjectValueEditor\n                schema={activeNestedView.schema}\n                value={activeNestedValue}\n                originalValue={activeNestedValue}\n                readOnly={readOnly}\n                onChange={updateNestedValue}\n              />\n            )}\n          </div>\n        </div>\n      ) : null}\n    </div>\n  )\n}\n\nfunction HumanReviewObjectValueEditor({\n  schema,\n  value,\n  originalValue,\n  readOnly = false,\n  onChange,\n}: {\n  schema: ReviewFieldSchema\n  value: JsonValue\n  originalValue: JsonValue\n  readOnly?: boolean\n  onChange: (value: JsonValue) => void\n}) {\n  const propertyEntries = Object.entries(schema.properties ?? {})\n\n  if (!propertyEntries.length) {\n    return (\n      <div className="rounded-md bg-background px-2 py-1.5 text-sm text-muted-foreground">\n        No properties\n      </div>\n    )\n  }\n\n  return (\n    <div className="space-y-2">\n      {propertyEntries.map(([propertyKey, propertySchema]) => (\n        <HumanReviewFieldCard\n          key={propertyKey}\n          field={{\n            key: propertyKey,\n            schema: propertySchema,\n            actual: getObjectValue(originalValue, propertyKey),\n            expected: getObjectValue(originalValue, propertyKey),\n          }}\n          value={getObjectValue(value, propertyKey)}\n          originalValue={getObjectValue(originalValue, propertyKey)}\n          readOnly={readOnly}\n          onChange={(childValue) =>\n            !readOnly &&\n            onChange(setObjectValue(value, propertyKey, childValue))\n          }\n          onUndo={() =>\n            !readOnly &&\n            onChange(\n              setObjectValue(\n                value,\n                propertyKey,\n                getObjectValue(originalValue, propertyKey)\n              )\n            )\n          }\n          onSetNull={() =>\n            !readOnly && onChange(setObjectValue(value, propertyKey, null))\n          }\n        />\n      ))}\n    </div>\n  )\n}\n\ntype HumanReviewFieldCardProps = {\n  field: ReviewField\n  value: JsonValue\n  originalValue: JsonValue\n  active?: boolean\n  activeFieldKey?: string\n  readOnly?: boolean\n  onChange: (value: JsonValue) => void\n  onFieldFocus?: (field: ReviewField) => void\n  onUndo: () => void\n  onSetNull: () => void\n}\n\nfunction areHumanReviewFieldCardPropsEqual(\n  previous: HumanReviewFieldCardProps,\n  next: HumanReviewFieldCardProps\n) {\n  return (\n    previous.field === next.field &&\n    Object.is(previous.value, next.value) &&\n    Object.is(previous.originalValue, next.originalValue) &&\n    previous.active === next.active &&\n    previous.activeFieldKey === next.activeFieldKey &&\n    previous.readOnly === next.readOnly &&\n    previous.onFieldFocus === next.onFieldFocus\n  )\n}\n\nconst HumanReviewFieldCard = React.memo(\n  HumanReviewFieldCardBase,\n  areHumanReviewFieldCardPropsEqual\n)\n\nfunction HumanReviewFieldCardBase({\n  field,\n  value,\n  originalValue,\n  active,\n  activeFieldKey,\n  readOnly = false,\n  onChange,\n  onFieldFocus,\n  onUndo,\n  onSetNull,\n}: HumanReviewFieldCardProps) {\n  const modified = !jsonValuesEqual(value, originalValue)\n  const Icon = getFieldIcon(field.schema.type)\n  const propertyEntries = Object.entries(field.schema.properties ?? {})\n  const [syncedArrayNestedView, setSyncedArrayNestedView] =\n    React.useState<SyncedArrayNestedView>(EMPTY_SYNCED_ARRAY_NESTED_VIEW)\n  const [syncedArraySelection, setSyncedArraySelection] =\n    React.useState<SyncedArraySelection>(EMPTY_SYNCED_ARRAY_SELECTION)\n  const updateSyncedArrayNestedView = React.useCallback(\n    (stack: ArrayNestedView[], side: ArrayReviewSide) => {\n      const activeSide = stack.length ? side : null\n\n      setSyncedArrayNestedView((current) =>\n        current.activeSide === activeSide &&\n        areArrayNestedViewsEqual(current.stack, stack)\n          ? current\n          : {\n              activeSide,\n              stack,\n            }\n      )\n    },\n    []\n  )\n  const updateSyncedArraySelection = React.useCallback(\n    (gridSelection: GridSelection, side: ArrayReviewSide, depth: number) => {\n      const activeSide = gridSelection.current ? side : null\n\n      setSyncedArraySelection((current) =>\n        current.activeSide === activeSide &&\n        current.depth === depth &&\n        areGridSelectionsEqual(current.gridSelection, gridSelection)\n          ? current\n          : {\n              activeSide,\n              depth,\n              gridSelection,\n            }\n      )\n    },\n    []\n  )\n\n  return (\n    <div\n      tabIndex={0}\n      onFocusCapture={() => onFieldFocus?.(field)}\n      onMouseEnter={() => onFieldFocus?.(field)}\n      className={cn(\n        "rounded-lg border bg-background p-3 transition-[border-color,background-color,box-shadow] focus-within:border-blue-500/50 focus-within:bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/5 focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:outline-none",\n        active &&\n          "border-blue-500/60 bg-blue-500/5 shadow-[0_0_0_1px_rgb(59_130_246_/_8%)]"\n      )}\n    >\n      <div className="mb-3 flex min-h-8 items-start justify-between gap-3">\n        <div className="min-w-0">\n          <div className="flex min-w-0 items-center gap-2">\n            <div className="min-w-0">\n              <div className="truncate text-sm font-medium">\n                {field.schema.title ?? field.key}\n              </div>\n            </div>\n            <span\n              className={cn(\n                "size-2 shrink-0 rounded-full bg-amber-400 transition-opacity",\n                !modified && "opacity-0"\n              )}\n            />\n          </div>\n          <div className="truncate text-xs text-muted-foreground">\n            {field.key}\n          </div>\n        </div>\n        <div className="flex shrink-0 items-center gap-1">\n          {!readOnly && modified ? (\n            <Tooltip>\n              <TooltipTrigger asChild>\n                <Button\n                  type="button"\n                  variant="ghost"\n                  size="icon-sm"\n                  className="text-muted-foreground"\n                  onClick={onUndo}\n                  aria-label={`Undo ${field.key}`}\n                >\n                  <HugeiconsIcon icon={Undo02Icon} className="size-4" />\n                </Button>\n              </TooltipTrigger>\n              <TooltipContent>Revert changes</TooltipContent>\n            </Tooltip>\n          ) : null}\n          {!readOnly ? (\n            <Tooltip>\n              <TooltipTrigger asChild>\n                <Button\n                  type="button"\n                  variant="ghost"\n                  size="icon-sm"\n                  className="text-muted-foreground"\n                  onClick={onSetNull}\n                  aria-label={`Set ${field.key} to null`}\n                >\n                  <HugeiconsIcon icon={CancelCircleIcon} className="size-4" />\n                </Button>\n              </TooltipTrigger>\n              <TooltipContent>Set to NULL</TooltipContent>\n            </Tooltip>\n          ) : null}\n          <div className="flex h-6 items-center gap-1 rounded-md border bg-muted/50 px-1.5 text-xs text-muted-foreground">\n            <HugeiconsIcon icon={Icon} className="size-3.5" />\n            {field.schema.type}\n          </div>\n        </div>\n      </div>\n      {field.schema.type === "object" ? (\n        <div className="rounded-md border bg-muted/25 p-2">\n          <div className="mb-2 flex items-center justify-between gap-3 text-[11px] font-medium text-muted-foreground">\n            <span>Properties</span>\n            <span>{propertyEntries.length} fields</span>\n          </div>\n          <div className="space-y-2">\n            {propertyEntries.length ? (\n              propertyEntries.map(([propertyKey, schema]) => {\n                const childField: ReviewField = {\n                  key: `${field.key}.${propertyKey}`,\n                  schema,\n                  actual: getObjectValue(field.actual, propertyKey),\n                  expected: getObjectValue(originalValue, propertyKey),\n                }\n\n                return (\n                  <HumanReviewFieldCard\n                    key={childField.key}\n                    field={childField}\n                    value={getObjectValue(value, propertyKey)}\n                    originalValue={childField.expected}\n                    active={childField.key === activeFieldKey}\n                    activeFieldKey={activeFieldKey}\n                    readOnly={readOnly}\n                    onChange={(childValue) =>\n                      onChange(setObjectValue(value, propertyKey, childValue))\n                    }\n                    onFieldFocus={onFieldFocus}\n                    onUndo={() =>\n                      onChange(\n                        setObjectValue(value, propertyKey, childField.expected)\n                      )\n                    }\n                    onSetNull={() =>\n                      onChange(setObjectValue(value, propertyKey, null))\n                    }\n                  />\n                )\n              })\n            ) : (\n              <div className="rounded-md bg-background px-2 py-1.5 text-sm text-muted-foreground">\n                No properties\n              </div>\n            )}\n          </div>\n        </div>\n      ) : field.schema.type === "array" ? (\n        <div className="grid gap-2">\n          <HumanReviewArrayValueGrid\n            activeNestedSide={syncedArrayNestedView.activeSide}\n            activeSelectionSide={syncedArraySelection.activeSide}\n            label="Actual"\n            readOnly\n            schema={field.schema}\n            selectionDepth={syncedArraySelection.depth}\n            sharedGridSelection={syncedArraySelection.gridSelection}\n            sharedNestedStack={syncedArrayNestedView.stack}\n            value={field.actual}\n            viewSide="actual"\n            onGridSelectionChange={updateSyncedArraySelection}\n            onNestedStackChange={updateSyncedArrayNestedView}\n          />\n          <HumanReviewArrayValueGrid\n            activeNestedSide={syncedArrayNestedView.activeSide}\n            activeSelectionSide={syncedArraySelection.activeSide}\n            label="Expected"\n            readOnly={readOnly}\n            schema={field.schema}\n            selectionDepth={syncedArraySelection.depth}\n            sharedGridSelection={syncedArraySelection.gridSelection}\n            sharedNestedStack={syncedArrayNestedView.stack}\n            value={value}\n            viewSide="expected"\n            onChange={onChange}\n            onGridSelectionChange={updateSyncedArraySelection}\n            onNestedStackChange={updateSyncedArrayNestedView}\n          />\n        </div>\n      ) : (\n        <div className="grid gap-2 sm:grid-cols-2">\n          <div className="rounded-md border bg-muted/30 p-2">\n            {field.schema.description ? (\n              <p className="mb-2 text-xs text-muted-foreground">\n                {field.schema.description}\n              </p>\n            ) : null}\n            <div className="mb-1 text-[11px] font-medium text-muted-foreground">\n              Actual\n            </div>\n            <div className="min-h-7 rounded-md bg-background px-2 py-1.5 text-sm">\n              {formatValue(field.actual)}\n            </div>\n          </div>\n          <div className="rounded-md border bg-muted/30 p-2">\n            <div className="mb-1 text-[11px] font-medium text-muted-foreground">\n              Expected\n            </div>\n            <HumanReviewValueInput\n              readOnly={readOnly}\n              schema={field.schema}\n              value={getPrimitiveValue(value)}\n              onChange={onChange}\n            />\n          </div>\n        </div>\n      )}\n    </div>\n  )\n}\n\nfunction HumanReviewHighlight({ field }: { field: ReviewField }) {\n  const area = field.location?.area\n\n  if (!area) return null\n\n  return (\n    <div\n      className={cn(\n        "pointer-events-none absolute z-10 rounded-[3px] border",\n        REVIEW_HIGHLIGHT_STYLE\n      )}\n      style={{\n        left: `${area.left}%`,\n        top: `${area.top}%`,\n        width: `${area.width}%`,\n        height: `${area.height}%`,\n      }}\n    />\n  )\n}\n\nexport function JsonDiffView({\n  actual,\n  expected,\n  theme = "light",\n}: {\n  actual: JsonObject\n  expected: JsonObject\n  theme?: HumanReviewTheme\n}) {\n  const oldFile = React.useMemo(\n    () => ({\n      name: "actual.json",\n      contents: formatJson(actual),\n      lang: "json",\n    }),\n    [actual]\n  )\n  const newFile = React.useMemo(\n    () => ({\n      name: "expected.json",\n      contents: formatJson(expected),\n      lang: "json",\n    }),\n    [expected]\n  )\n\n  return (\n    <Virtualizer\n      className="h-full overflow-auto rounded-b-xl bg-surface/60"\n      contentClassName="min-w-full"\n    >\n      <div className="human-review-diff h-full text-xs">\n        <MultiFileDiff\n          className="block min-w-full"\n          style={DIFF_VIEWER_THEME}\n          oldFile={oldFile}\n          newFile={newFile}\n          options={{\n            diffStyle: "split",\n            diffIndicators: "bars",\n            hunkSeparators: "line-info-basic",\n            overflow: "wrap",\n            themeType: theme,\n            theme: {\n              light: "pierre-light",\n              dark: "pierre-dark",\n            },\n          }}\n        />\n      </div>\n    </Virtualizer>\n  )\n}\n\nexport function HumanReviewPanel({\n  fields = REVIEW_FIELDS,\n  activeFieldKey,\n  className,\n  onFieldFocus,\n  theme = "light",\n}: {\n  fields?: ReviewField[]\n  activeFieldKey?: string\n  className?: string\n  onFieldFocus?: (field: ReviewField) => void\n  theme?: HumanReviewTheme\n} = {}) {\n  const [activeTab, setActiveTab] = React.useState("form")\n  const actualValues = React.useMemo(\n    () => valuesFromFields(fields, "actual"),\n    [fields]\n  )\n  const initialExpectedValues = React.useMemo(\n    () => valuesFromFields(fields, "expected"),\n    [fields]\n  )\n  const [expected, setExpected] = React.useState<JsonObject>(\n    initialExpectedValues\n  )\n\n  React.useEffect(() => {\n    setExpected(initialExpectedValues)\n  }, [initialExpectedValues])\n\n  const updateValue = React.useCallback((key: string, value: JsonValue) => {\n    setExpected((current) =>\n      Object.is(current[key], value) ? current : { ...current, [key]: value }\n    )\n  }, [])\n  const fieldCount = React.useMemo(() => countReviewFields(fields), [fields])\n\n  return (\n    <TooltipProvider delay={200}>\n      <Tabs\n        value={activeTab}\n        onValueChange={setActiveTab}\n        className={cn("flex h-[560px] flex-col gap-0 bg-background", className)}\n      >\n        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-3">\n          <TabsList className="h-8 sm:h-7">\n            <TabsTrigger value="form" className="h-7 sm:h-6">\n              <HugeiconsIcon icon={TextCheckIcon} className="size-4" />\n              Form\n            </TabsTrigger>\n            <TabsTrigger value="json" className="h-7 sm:h-6">\n              <HugeiconsIcon icon={SourceCodeSquareIcon} className="size-4" />\n              JSON\n            </TabsTrigger>\n          </TabsList>\n          <div className="flex h-8 items-center gap-1 rounded-md border bg-muted/40 px-2 text-xs text-muted-foreground sm:h-7">\n            <HugeiconsIcon icon={FileDiffIcon} className="size-3.5" />\n            {fieldCount} fields\n          </div>\n        </div>\n        <TabsContent value="form" keepMounted className="min-h-0 flex-1">\n          <ScrollArea className="h-full" scrollFade>\n            <div className="space-y-3 p-3">\n              {fields.map((field) => (\n                <HumanReviewFieldCard\n                  key={field.key}\n                  field={field}\n                  value={expected[field.key] ?? null}\n                  originalValue={field.expected}\n                  active={\n                    field.key === activeFieldKey ||\n                    activeFieldKey?.startsWith(`${field.key}.`)\n                  }\n                  activeFieldKey={activeFieldKey}\n                  onChange={(value) => updateValue(field.key, value)}\n                  onFieldFocus={onFieldFocus}\n                  onUndo={() => updateValue(field.key, field.expected)}\n                  onSetNull={() => updateValue(field.key, null)}\n                />\n              ))}\n            </div>\n          </ScrollArea>\n        </TabsContent>\n        <TabsContent value="json" keepMounted className="min-h-0 flex-1">\n          <JsonDiffView\n            actual={actualValues}\n            expected={expected}\n            theme={theme}\n          />\n        </TabsContent>\n      </Tabs>\n    </TooltipProvider>\n  )\n}\n\nexport function HumanReviewBlock({\n  file,\n  fields = REVIEW_FIELDS,\n  className,\n  theme,\n}: {\n  file?: string\n  fields?: ReviewField[]\n  className?: string\n  theme?: HumanReviewTheme\n}) {\n  const [activeFieldKey, setActiveFieldKey] = React.useState(fields[0]?.key)\n  const viewerRef = React.useRef<PDFViewerHandle>(null)\n  const activeField = findReviewField(fields, activeFieldKey) ?? fields[0]\n\n  React.useEffect(() => {\n    if (activeFieldKey || !fields[0]) return\n    setActiveFieldKey(fields[0].key)\n  }, [activeFieldKey, fields])\n\n  const focusField = React.useCallback(\n    (field: ReviewField) => {\n      if (field.key === activeFieldKey) return\n\n      setActiveFieldKey(field.key)\n\n      if (field.location) {\n        viewerRef.current?.scrollToPageArea(\n          field.location.page,\n          field.location.area\n        )\n      }\n    },\n    [activeFieldKey]\n  )\n\n  return (\n    <PdfBlockResizableShell\n      autoSaveId="pdf-block-human-review"\n      className={className}\n      rightDefaultSize={42}\n      rightMaxSize={60}\n      rightMinSize={30}\n      left={\n        <PDFViewer\n          ref={viewerRef}\n          file={file}\n          defaultZoom={DEFAULT_ZOOM}\n          renderPageOverlay={({ pageNumber }) =>\n            activeField?.location?.page === pageNumber ? (\n              <HumanReviewHighlight field={activeField} />\n            ) : null\n          }\n        />\n      }\n      right={\n        <aside className="min-h-0 bg-background">\n          <HumanReviewPanel\n            fields={fields}\n            activeFieldKey={activeField?.key}\n            className="h-full min-h-0"\n            theme={theme}\n            onFieldFocus={focusField}\n          />\n        </aside>\n      }\n    />\n  )\n}\n'
export function HumanReviewSource() {
  return <HighlightedCodeBlock code={humanReviewSourceCode} />
}
