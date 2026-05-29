"use client"

import * as React from "react"
import {
  CancelCircleIcon,
  FileDiffIcon,
  InputNumericIcon,
  InputTextIcon,
  SourceCodeSquareIcon,
  TextCheckIcon,
  Undo02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { MultiFileDiff, Virtualizer } from "@pierre/diffs/react"

import { cn } from "@/lib/utils"
import { PDFViewer, type PDFViewerHandle } from "@/components/ui/pdf-viewer"
import { PdfBlockResizableShell } from "@/components/pdf-block-resizable-shell"
import { Button } from "@/registry/new-york-v4/ui/button"
import { Input } from "@/registry/new-york-v4/ui/input"
import { ScrollArea } from "@/registry/new-york-v4/ui/scroll-area"
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

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject
export type JsonObject = { [key: string]: JsonValue }
export type SchemaPropertyType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "object"

export type ReviewFieldSchema = {
  type: SchemaPropertyType
  title?: string
  description?: string
  enum?: Array<string | number>
  properties?: Record<string, ReviewFieldSchema>
}

export type HighlightArea = {
  left: number
  top: number
  width: number
  height: number
}

export type ReviewField = {
  key: string
  schema: ReviewFieldSchema
  actual: JsonValue
  expected: JsonValue
  location?: {
    page: number
    area: HighlightArea
  }
}

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

const REVIEW_FIELDS: ReviewField[] = [
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

function valuesFromFields(
  fields: ReviewField[],
  valueKey: "actual" | "expected"
) {
  return fields.reduce<JsonObject>((values, field) => {
    values[field.key] = field[valueKey]
    return values
  }, {})
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2)
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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

function getPrimitiveValue(value: JsonValue): JsonPrimitive {
  return isJsonObject(value) ? null : value
}

function jsonValuesEqual(left: JsonValue, right: JsonValue) {
  return formatJson(left) === formatJson(right)
}

function countReviewFields(fields: ReviewField[]): number {
  return fields.reduce((count, field) => {
    if (field.schema.type !== "object") return count + 1

    const properties = field.schema.properties ?? {}
    const childFields = Object.entries(properties).map(
      ([key, schema]): ReviewField => ({
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
  fields: ReviewField[],
  fieldKey: string | undefined
): ReviewField | undefined {
  if (!fieldKey) return undefined

  for (const field of fields) {
    if (field.key === fieldKey) return field

    if (field.schema.type === "object") {
      const childFields = Object.entries(field.schema.properties ?? {}).map(
        ([key, schema]): ReviewField => ({
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
  if (isJsonObject(value)) return formatJson(value)
  if (typeof value === "boolean") return value ? "true" : "false"
  return String(value)
}

function getFieldIcon(type: SchemaPropertyType) {
  if (type === "number" || type === "integer") return InputNumericIcon
  if (type === "boolean") return TextCheckIcon
  if (type === "object") return SourceCodeSquareIcon
  return InputTextIcon
}

function HumanReviewValueInput({
  schema,
  value,
  onChange,
}: {
  schema: ReviewFieldSchema
  value: JsonPrimitive
  onChange: (value: JsonPrimitive) => void
}) {
  if (schema.enum?.length) {
    return (
      <span className="relative inline-flex w-full rounded-lg border border-input bg-background text-sm text-foreground shadow-xs/5 dark:bg-input/32">
        <select
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
      value={value === null ? "" : String(value)}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  )
}

function HumanReviewFieldCard({
  field,
  value,
  originalValue,
  active,
  activeFieldKey,
  onChange,
  onFieldFocus,
  onUndo,
  onSetNull,
}: {
  field: ReviewField
  value: JsonValue
  originalValue: JsonValue
  active?: boolean
  activeFieldKey?: string
  onChange: (value: JsonValue) => void
  onFieldFocus?: (field: ReviewField) => void
  onUndo: () => void
  onSetNull: () => void
}) {
  const modified = !jsonValuesEqual(value, originalValue)
  const Icon = getFieldIcon(field.schema.type)
  const propertyEntries = Object.entries(field.schema.properties ?? {})

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
          <div className="truncate text-xs text-muted-foreground">
            {field.key}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {modified ? (
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
                const childField: ReviewField = {
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
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border bg-muted/30 p-2">
            {field.schema.description ? (
              <p className="mb-2 text-xs text-muted-foreground">
                {field.schema.description}
              </p>
            ) : null}
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

function HumanReviewHighlight({ field }: { field: ReviewField }) {
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

export function JsonDiffView({
  actual,
  expected,
}: {
  actual: JsonObject
  expected: JsonObject
}) {
  return (
    <Virtualizer
      className="h-full overflow-auto rounded-b-xl bg-surface/60"
      contentClassName="min-w-full"
    >
      <div className="human-review-diff h-full text-xs">
        <MultiFileDiff
          className="block min-w-full"
          style={DIFF_VIEWER_THEME}
          oldFile={{
            name: "actual.json",
            contents: formatJson(actual),
            lang: "json",
          }}
          newFile={{
            name: "expected.json",
            contents: formatJson(expected),
            lang: "json",
          }}
          disableWorkerPool
          options={{
            diffStyle: "split",
            diffIndicators: "bars",
            hunkSeparators: "line-info-basic",
            overflow: "wrap",
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

export function HumanReviewPanel({
  fields = REVIEW_FIELDS,
  activeFieldKey,
  className,
  onFieldFocus,
}: {
  fields?: ReviewField[]
  activeFieldKey?: string
  className?: string
  onFieldFocus?: (field: ReviewField) => void
} = {}) {
  const actualValues = React.useMemo(
    () => valuesFromFields(fields, "actual"),
    [fields]
  )
  const initialExpectedValues = React.useMemo(
    () => valuesFromFields(fields, "expected"),
    [fields]
  )
  const [expected, setExpected] = React.useState<JsonObject>(
    initialExpectedValues
  )

  React.useEffect(() => {
    setExpected(initialExpectedValues)
  }, [initialExpectedValues])

  const updateValue = React.useCallback((key: string, value: JsonValue) => {
    setExpected((current) => ({ ...current, [key]: value }))
  }, [])
  const fieldCount = React.useMemo(() => countReviewFields(fields), [fields])

  return (
    <TooltipProvider delay={200}>
      <Tabs
        defaultValue="form"
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
        <TabsContent value="form" className="min-h-0 flex-1">
          <ScrollArea className="h-full" scrollFade>
            <div className="space-y-3 p-3">
              {fields.map((field) => (
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
        <TabsContent value="json" className="min-h-0 flex-1">
          <JsonDiffView actual={actualValues} expected={expected} />
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  )
}

export function HumanReviewBlock({
  file,
  fields = REVIEW_FIELDS,
  className,
}: {
  file?: string
  fields?: ReviewField[]
  className?: string
}) {
  const [activeFieldKey, setActiveFieldKey] = React.useState(fields[0]?.key)
  const viewerRef = React.useRef<PDFViewerHandle>(null)
  const activeField = findReviewField(fields, activeFieldKey) ?? fields[0]

  React.useEffect(() => {
    if (activeFieldKey || !fields[0]) return
    setActiveFieldKey(fields[0].key)
  }, [activeFieldKey, fields])

  const focusField = React.useCallback((field: ReviewField) => {
    setActiveFieldKey(field.key)

    if (field.location) {
      viewerRef.current?.scrollToPageArea(
        field.location.page,
        field.location.area
      )
    }
  }, [])

  return (
    <PdfBlockResizableShell
      autoSaveId="pdf-block-human-review"
      className={className}
      rightDefaultSize={42}
      rightMaxSize={60}
      rightMinSize={30}
      left={
        <PDFViewer
          ref={viewerRef}
          file={file}
          defaultZoom={DEFAULT_ZOOM}
          renderPageOverlay={({ pageNumber }) =>
            activeField?.location?.page === pageNumber ? (
              <HumanReviewHighlight field={activeField} />
            ) : null
          }
        />
      }
      right={
        <aside className="min-h-0 bg-background">
          <HumanReviewPanel
            fields={fields}
            activeFieldKey={activeField?.key}
            className="h-full min-h-0"
            onFieldFocus={focusField}
          />
        </aside>
      }
    />
  )
}
