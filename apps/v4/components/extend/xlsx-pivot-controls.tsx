"use client"

import * as React from "react"
import type {
  XlsxPivotAggregation,
  XlsxPivotAxisField,
  XlsxPivotChartType,
  XlsxPivotFieldArea,
  XlsxPivotFilter,
  XlsxPivotGrouping,
  XlsxPivotMember,
  XlsxPivotTable,
  XlsxPivotTableEditor,
  XlsxPivotValueField,
} from "@extend-ai/react-xlsx"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  WorkbookControlButton as Action,
  WorkbookControlCheck as Check,
  WorkbookControlSelect as Choice,
  WorkbookControlInput as Text,
  WorkbookDisabledControls,
} from "@/components/extend/xlsx-controls"

type Options = ReadonlyArray<readonly [string, string]>

type Selection = { area: XlsxPivotFieldArea; index: number }
type DragField = { field: number } | { area: XlsxPivotFieldArea; index: number }

const AREAS: XlsxPivotFieldArea[] = [
  "reportFilters",
  "columns",
  "rows",
  "values",
]
const AREA_NAMES: Record<XlsxPivotFieldArea, string> = {
  reportFilters: "Filters",
  columns: "Columns",
  rows: "Rows",
  values: "Values",
}
const AGGREGATIONS: Options = [
  ["sum", "Sum"],
  ["count", "Count"],
  ["average", "Average"],
  ["max", "Max"],
  ["min", "Min"],
  ["product", "Product"],
  ["countNums", "Count Numbers"],
  ["stdDev", "StdDev"],
  ["stdDevp", "StdDevp"],
  ["var", "Var"],
  ["varp", "Varp"],
]
const SHOW_AS: Options = [
  ["normal", "No calculation"],
  ["percentOfGrandTotal", "% of grand total"],
  ["percentOfRowTotal", "% of row total"],
  ["percentOfColumnTotal", "% of column total"],
  ["percentOfParentRowTotal", "% of parent row total"],
  ["percentOfParentColumnTotal", "% of parent column total"],
  ["percent", "% of"],
  ["difference", "Difference from"],
  ["percentDifference", "% difference from"],
  ["runningTotal", "Running total in"],
  ["percentRunningTotal", "% running total in"],
  ["rankAscending", "Rank smallest to largest"],
  ["rankDescending", "Rank largest to smallest"],
  ["index", "Index"],
]
const OPERATORS: Options = [
  ["equal", "Equals"],
  ["notEqual", "Does not equal"],
  ["contains", "Contains"],
  ["notContains", "Does not contain"],
  ["beginsWith", "Begins with"],
  ["notBeginsWith", "Does not begin with"],
  ["endsWith", "Ends with"],
  ["notEndsWith", "Does not end with"],
  ["greaterThan", "Greater than"],
  ["greaterThanOrEqual", "Greater than or equal to"],
  ["lessThan", "Less than"],
  ["lessThanOrEqual", "Less than or equal to"],
  ["between", "Between"],
  ["notBetween", "Not between"],
]
const DATE_UNITS: XlsxPivotGrouping["unit"][] = [
  "years",
  "quarters",
  "months",
  "days",
  "hours",
  "minutes",
  "seconds",
]
const CHART_TYPES: Options = [
  ["ColumnClustered", "Clustered column"],
  ["ColumnStacked", "Stacked column"],
  ["ColumnPercentStacked", "100% stacked column"],
  ["BarClustered", "Clustered bar"],
  ["BarStacked", "Stacked bar"],
  ["BarPercentStacked", "100% stacked bar"],
  ["Line", "Line"],
  ["LineStacked", "Stacked line"],
  ["Area", "Area"],
  ["AreaStacked", "Stacked area"],
  ["AreaPercentStacked", "100% stacked area"],
  ["Pie", "Pie"],
  ["Doughnut", "Doughnut"],
]
const DRAG_TYPE = "application/x-react-xlsx-pivot-field"
const FORMULA_HELP =
  "Supported functions: SUM, PRODUCT, AVERAGE, MIN, MAX, ABS, ROUND, SQRT. Use +, -, *, /, ^, %, and parentheses."
const stack: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minWidth: 0,
}
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  minWidth: 0,
}
const hint: React.CSSProperties = {
  color: "var(--xlsx-pivot-muted)",
  fontSize: 12,
  lineHeight: 1.5,
  margin: 0,
}

function fieldName(pivot: XlsxPivotTable, index: number) {
  return (
    pivot.fields.find((field) => field.index === index)?.name ??
    `Field ${index + 1}`
  )
}
function fieldIndex(
  pivot: XlsxPivotTable,
  area: XlsxPivotFieldArea,
  index: number
) {
  return area === "reportFilters"
    ? pivot.reportFilters[index]
    : pivot[area][index]?.field
}
function sourceFieldIndex(
  pivot: XlsxPivotTable,
  area: XlsxPivotFieldArea,
  index: number
) {
  return area === "values" && pivot.values[index]?.formula?.trim()
    ? undefined
    : fieldIndex(pivot, area, index)
}
function groupingUnit(axis?: XlsxPivotAxisField) {
  return axis?.grouping
    ? axis.grouping.kind === "date"
      ? axis.grouping.unit
      : axis.grouping.kind
    : null
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <details style={{ borderTop: "1px solid var(--xlsx-pivot-border)" }}>
      <summary
        style={{
          cursor: "pointer",
          fontWeight: 600,
          padding: "11px 12px",
          userSelect: "none",
        }}
      >
        {title}
      </summary>
      <div style={{ ...stack, padding: "0 12px 12px" }}>{children}</div>
    </details>
  )
}

function Members({
  items,
  selected,
  onChange,
  label = "Items",
}: {
  items: XlsxPivotMember[]
  selected: string[]
  onChange: (keys: string[]) => void
  label?: string
}) {
  const [search, setSearch] = React.useState("")
  const visible = items.filter((item) =>
    item.caption.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  )
  const keys = new Set(selected)
  return (
    <div style={{ ...stack, gap: 6 }}>
      <Text
        label={`Search ${label.toLowerCase()}`}
        type="search"
        value={search}
        onChange={setSearch}
      />
      <div style={{ ...row, flexWrap: "wrap" }}>
        <Action onClick={() => onChange(items.map((item) => item.key))}>
          Select all
        </Action>
        <Action onClick={() => onChange([])}>Clear</Action>
        <span style={hint}>{keys.size} selected</span>
      </div>
      <div
        role="group"
        aria-label={label}
        style={{
          maxHeight: 150,
          overflowY: "auto",
          padding: "4px 6px",
          border: "1px solid var(--xlsx-pivot-border)",
        }}
      >
        {visible.slice(0, 200).map((item) => (
          <Check
            key={item.key}
            label={item.caption || "(blank)"}
            checked={keys.has(item.key)}
            onChange={(checked) =>
              onChange(
                checked
                  ? [...keys, item.key]
                  : selected.filter((key) => key !== item.key)
              )
            }
          />
        ))}
        {!visible.length ? <p style={hint}>No matching items.</p> : null}
        {visible.length > 200 ? (
          <p style={hint}>
            Search to narrow {visible.length.toLocaleString()} items.
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ValueSettings({
  pivot,
  value,
  onChange,
}: {
  pivot: XlsxPivotTable
  value: XlsxPivotValueField
  onChange: (value: XlsxPivotValueField) => void
}) {
  const axes = [...pivot.rows, ...pivot.columns]
  const needsBase = [
    "percent",
    "difference",
    "percentDifference",
    "runningTotal",
    "percentRunningTotal",
    "rankAscending",
    "rankDescending",
  ].includes(value.showAs)
  const needsItem = ["percent", "difference", "percentDifference"].includes(
    value.showAs
  )
  const baseAxes = axes.filter((axis) => axis.field === value.baseField)
  const base =
    baseAxes.find(
      (axis) => groupingUnit(axis) === (value.baseGroupingUnit ?? null)
    ) ?? baseAxes[0]
  const source = pivot.fields.find((field) => field.index === value.baseField)
  return (
    <>
      <Text
        label="Custom name"
        value={value.name}
        onChange={(name) => onChange({ ...value, name })}
      />
      <Choice
        label="Summarize values by"
        value={value.aggregation}
        options={AGGREGATIONS}
        onChange={(aggregation) =>
          onChange({
            ...value,
            aggregation: aggregation as XlsxPivotAggregation,
          })
        }
      />
      <Choice
        label="Show values as"
        value={value.showAs}
        options={SHOW_AS}
        onChange={(showAs) =>
          onChange({
            ...value,
            showAs: showAs as XlsxPivotValueField["showAs"],
            baseField: value.baseField ?? axes[0]?.field,
          })
        }
      />
      {needsBase ? (
        <Choice
          label="Base field"
          value={value.baseField == null ? "" : String(value.baseField)}
          placeholder="Choose a field"
          options={pivot.fields
            .filter((field) => axes.some((axis) => axis.field === field.index))
            .map((field) => [String(field.index), field.name])}
          onChange={(field) =>
            onChange({
              ...value,
              baseField: Number(field),
              baseGroupingUnit: null,
              baseItem: null,
            })
          }
        />
      ) : null}
      {needsBase && baseAxes.length > 1 ? (
        <Choice
          label="Base grouping level"
          value={value.baseGroupingUnit ?? groupingUnit(base) ?? ""}
          options={baseAxes.map((axis) => [
            groupingUnit(axis) ?? "",
            axis.name || groupingUnit(axis) || "Source items",
          ])}
          onChange={(unit) =>
            onChange({
              ...value,
              baseGroupingUnit: unit || null,
              baseItem: null,
            })
          }
        />
      ) : null}
      {needsItem ? (
        <Choice
          label="Base item"
          value={value.baseItem ?? "previous"}
          options={[
            ["previous", "(previous)"],
            ["next", "(next)"],
            ...(base?.items?.length ? base.items : (source?.items ?? [])).map(
              (item) => [item.key, item.caption] as const
            ),
          ]}
          onChange={(baseItem) => onChange({ ...value, baseItem })}
        />
      ) : null}
      <Text
        label="Number format"
        value={value.numberFormat ?? ""}
        placeholder="General"
        onChange={(numberFormat) =>
          onChange({ ...value, numberFormat: numberFormat || null })
        }
      />
      <Text
        label="Calculated field formula"
        value={value.formula ?? ""}
        placeholder="Leave blank for a source field"
        onChange={(formula) => onChange({ ...value, formula: formula || null })}
      />
      <p style={hint}>
        Use field names in formulas. Enclose names containing spaces in single
        quotes or square brackets.
      </p>
      <p style={hint}>{FORMULA_HELP}</p>
    </>
  )
}

function AxisSettings({
  pivot,
  axis,
  onChange,
  onAddDateLevel,
}: {
  pivot: XlsxPivotTable
  axis: XlsxPivotAxisField
  onChange: (value: XlsxPivotAxisField) => void
  onAddDateLevel: (unit: XlsxPivotGrouping["unit"]) => void
}) {
  const source = pivot.fields.find((field) => field.index === axis.field)
  const grouping = axis.grouping
  const updateGrouping = (patch: Partial<XlsxPivotGrouping>) =>
    onChange({
      ...axis,
      grouping: { ...grouping!, ...patch },
      items: [],
      collapsed: [],
    })
  const availableUnits = DATE_UNITS.filter(
    (unit) =>
      ![...pivot.rows, ...pivot.columns].some(
        (field) =>
          field.field === axis.field &&
          field.grouping?.kind === "date" &&
          field.grouping.unit === unit
      )
  )
  return (
    <>
      <Text
        label="Custom name"
        value={axis.name ?? ""}
        placeholder={source?.name}
        onChange={(name) => onChange({ ...axis, name: name || null })}
      />
      <Choice
        label="Sort"
        value={axis.sort}
        options={[
          ["ascending", "Ascending (A to Z)"],
          ["descending", "Descending (Z to A)"],
          ["manual", "Source order"],
          ["valueAscending", "Smallest to largest by value"],
          ["valueDescending", "Largest to smallest by value"],
        ]}
        onChange={(sort) =>
          onChange({
            ...axis,
            sort: sort as XlsxPivotAxisField["sort"],
            sortMeasure: axis.sortMeasure ?? 0,
          })
        }
      />
      {axis.sort.startsWith("value") ? (
        <Choice
          label="Sort by value"
          value={String(axis.sortMeasure ?? 0)}
          options={pivot.values.map((value, index) => [
            String(index),
            value.name,
          ])}
          onChange={(sortMeasure) =>
            onChange({ ...axis, sortMeasure: Number(sortMeasure) })
          }
        />
      ) : null}
      <Check
        label="Show subtotals"
        checked={axis.subtotals}
        onChange={(subtotals) => onChange({ ...axis, subtotals })}
      />
      {axis.subtotals ? (
        <details>
          <summary style={{ cursor: "pointer" }}>
            Custom subtotal functions
          </summary>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 3,
              marginTop: 6,
            }}
          >
            {AGGREGATIONS.map(([value, label]) => (
              <Check
                key={value}
                label={label}
                checked={
                  axis.subtotalFunctions?.includes(
                    value as XlsxPivotAggregation
                  ) ?? false
                }
                onChange={(checked) =>
                  onChange({
                    ...axis,
                    subtotalFunctions: checked
                      ? [
                          ...(axis.subtotalFunctions ?? []),
                          value as XlsxPivotAggregation,
                        ]
                      : axis.subtotalFunctions?.filter(
                          (item) => item !== value
                        ),
                  })
                }
              />
            ))}
          </div>
          <p style={hint}>
            Leave unchecked to use the value field’s summary function.
          </p>
        </details>
      ) : null}
      <Check
        label="Show items with no data"
        checked={axis.showItemsWithNoData ?? false}
        onChange={(showItemsWithNoData) =>
          onChange({ ...axis, showItemsWithNoData })
        }
      />
      <Choice
        label="Grouping"
        value={grouping?.kind ?? "none"}
        options={[
          ["none", "None"],
          ["number", "Numeric intervals"],
          ["date", "Date intervals"],
          ["manual", "Named groups"],
        ]}
        onChange={(kind) =>
          onChange({
            ...axis,
            grouping:
              kind === "none"
                ? null
                : {
                    kind: kind as XlsxPivotGrouping["kind"],
                    unit: "months",
                    interval: 1,
                    groups: [],
                  },
            items: [],
            collapsed: [],
          })
        }
      />
      {grouping?.kind === "date" ? (
        <Choice
          label="Group dates by"
          value={grouping.unit}
          options={DATE_UNITS.map((unit) => [
            unit,
            unit[0].toUpperCase() + unit.slice(1),
          ])}
          onChange={(unit) =>
            updateGrouping({ unit: unit as XlsxPivotGrouping["unit"] })
          }
        />
      ) : null}
      {grouping && grouping.kind !== "manual" ? (
        <>
          <Text
            label="Interval"
            type="number"
            min={0.000001}
            step="any"
            value={String(grouping.interval)}
            onChange={(interval) =>
              updateGrouping({ interval: Number(interval) })
            }
          />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            <Text
              label="Starting at"
              type="number"
              step="any"
              placeholder="Automatic"
              value={grouping.start == null ? "" : String(grouping.start)}
              onChange={(start) =>
                updateGrouping({ start: start === "" ? null : Number(start) })
              }
            />
            <Text
              label="Ending at"
              type="number"
              step="any"
              placeholder="Automatic"
              value={grouping.end == null ? "" : String(grouping.end)}
              onChange={(end) =>
                updateGrouping({ end: end === "" ? null : Number(end) })
              }
            />
          </div>
          {grouping.kind === "date" ? (
            <p style={hint}>Optional bounds use Excel date serial values.</p>
          ) : null}
        </>
      ) : null}
      {grouping?.kind === "date" && availableUnits.length ? (
        <Choice
          label="Add date grouping level"
          value=""
          placeholder="Choose a level"
          options={availableUnits.map((unit) => [
            unit,
            unit[0].toUpperCase() + unit.slice(1),
          ])}
          onChange={(unit) => onAddDateLevel(unit as XlsxPivotGrouping["unit"])}
        />
      ) : null}
      {grouping?.kind === "manual" ? (
        <>
          {grouping.groups.map((group, index) => (
            <div
              key={index}
              style={{
                ...stack,
                borderTop: "1px solid var(--xlsx-pivot-border)",
                paddingTop: 8,
              }}
            >
              <Text
                label="Group name"
                value={group.name}
                onChange={(name) =>
                  updateGrouping({
                    groups: grouping.groups.map((item, position) =>
                      position === index ? { ...item, name } : item
                    ),
                  })
                }
              />
              <Members
                items={source?.items ?? []}
                selected={group.members}
                onChange={(members) =>
                  updateGrouping({
                    groups: grouping.groups.map((item, position) =>
                      position === index ? { ...item, members } : item
                    ),
                  })
                }
              />
              <Action
                onClick={() =>
                  updateGrouping({
                    groups: grouping.groups.filter(
                      (_, position) => position !== index
                    ),
                  })
                }
              >
                Remove group
              </Action>
            </div>
          ))}
          <Action
            onClick={() =>
              updateGrouping({
                groups: [
                  ...grouping.groups,
                  { name: `Group ${grouping.groups.length + 1}`, members: [] },
                ],
              })
            }
          >
            Add named group
          </Action>
        </>
      ) : null}
      <details>
        <summary style={{ cursor: "pointer" }}>Collapse members</summary>
        <div style={{ paddingTop: 8 }}>
          {grouping && !axis.items?.length ? (
            <p style={hint}>Apply grouping to load its members.</p>
          ) : (
            <Members
              label="Members to collapse"
              items={axis.items?.length ? axis.items : (source?.items ?? [])}
              selected={axis.collapsed}
              onChange={(collapsed) => onChange({ ...axis, collapsed })}
            />
          )}
        </div>
      </details>
    </>
  )
}

function FieldFilters({
  editor,
  pivot,
  field,
  axis,
}: {
  editor: XlsxPivotTableEditor
  pivot: XlsxPivotTable
  field: number
  axis?: XlsxPivotAxisField
}) {
  const source = pivot.fields.find((item) => item.index === field)
  const filterAxis =
    axis ??
    [...pivot.rows, ...pivot.columns].find(
      (item) => item.field === field && item.grouping
    )
  const unit = groupingUnit(filterAxis)
  const members = filterAxis?.items?.length
    ? filterAxis.items
    : (source?.items ?? [])
  const filters = pivot.filters
    .map((filter, index) => ({ filter, index }))
    .filter(
      ({ filter }) =>
        filter.field === field && (filter.groupingUnit ?? null) === unit
    )
  const kinds: Options = [
    ["members", "Select items"],
    ["label", "Label filter"],
    ["value", "Value filter"],
    ["top10", "Top / bottom filter"],
  ]
  const update = (index: number, next: XlsxPivotFilter | null) =>
    editor.edit((current) => ({
      ...current,
      filters: current.filters.flatMap((filter, position) =>
        position === index ? (next ? [next] : []) : [filter]
      ),
    }))
  return (
    <div
      style={{
        ...stack,
        paddingTop: 10,
        borderTop: "1px solid var(--xlsx-pivot-border)",
      }}
    >
      <strong>Field filters{unit ? ` · ${unit}` : ""}</strong>
      {filterAxis?.grouping && !filterAxis.items?.length ? (
        <p style={hint}>Apply grouping before selecting its members.</p>
      ) : null}
      {filters.map(({ filter, index }) => (
        <div
          key={index}
          style={{
            ...stack,
            paddingBlock: 8,
            borderTop: "1px solid var(--xlsx-pivot-border)",
          }}
        >
          <div style={{ ...row, justifyContent: "space-between" }}>
            <span>{kinds.find(([kind]) => kind === filter.kind)?.[1]}</span>
            <Action
              aria-label={`Remove ${filter.kind} filter`}
              onClick={() => update(index, null)}
            >
              ×
            </Action>
          </div>
          {filter.kind === "members" ? (
            <Members
              items={members}
              selected={filter.values}
              onChange={(values) => update(index, { ...filter, values })}
            />
          ) : null}
          {filter.kind === "label" || filter.kind === "value" ? (
            <>
              <Choice
                label="Condition"
                value={filter.operator}
                options={
                  filter.kind === "value"
                    ? OPERATORS.filter(
                        ([operator]) => !/contains|begins|ends/i.test(operator)
                      )
                    : OPERATORS
                }
                onChange={(operator) =>
                  update(index, {
                    ...filter,
                    operator: operator as XlsxPivotFilter["operator"],
                  })
                }
              />
              <Text
                label="Value"
                type={filter.kind === "value" ? "number" : "text"}
                value={filter.value}
                onChange={(value) => update(index, { ...filter, value })}
              />
              {filter.operator === "between" ||
              filter.operator === "notBetween" ? (
                <Text
                  label="And"
                  type={filter.kind === "value" ? "number" : "text"}
                  value={filter.value2}
                  onChange={(value2) => update(index, { ...filter, value2 })}
                />
              ) : null}
            </>
          ) : null}
          {filter.kind === "top10" ? (
            <>
              <Choice
                label="Show"
                value={filter.top ? "top" : "bottom"}
                options={[
                  ["top", "Top"],
                  ["bottom", "Bottom"],
                ]}
                onChange={(top) =>
                  update(index, { ...filter, top: top === "top" })
                }
              />
              <Text
                label="Amount"
                type="number"
                min={1}
                value={String(filter.count)}
                onChange={(count) =>
                  update(index, { ...filter, count: Number(count) })
                }
              />
              <Choice
                label="Unit"
                value={filter.percent ? "percent" : "items"}
                options={[
                  ["items", "Items"],
                  ["percent", "Percent"],
                ]}
                onChange={(percent) =>
                  update(index, { ...filter, percent: percent === "percent" })
                }
              />
            </>
          ) : null}
          {filter.kind === "value" || filter.kind === "top10" ? (
            <Choice
              label="By value"
              value={String(filter.measure)}
              options={pivot.values.map((value, position) => [
                String(position),
                value.name,
              ])}
              onChange={(measure) =>
                update(index, { ...filter, measure: Number(measure) })
              }
            />
          ) : null}
        </div>
      ))}
      <Choice
        label="Add filter"
        value=""
        placeholder="Choose a filter"
        options={kinds.filter(
          ([kind]) => !filters.some(({ filter }) => filter.kind === kind)
        )}
        onChange={(kind) =>
          editor.edit((current) => ({
            ...current,
            filters: [
              ...current.filters,
              {
                field,
                groupingUnit: unit,
                kind: kind as XlsxPivotFilter["kind"],
                values:
                  kind === "members" ? members.map((member) => member.key) : [],
                operator: "equal",
                value: "",
                value2: "",
                measure: 0,
                top: true,
                count: 10,
                percent: false,
              },
            ],
          }))
        }
      />
    </div>
  )
}

function Advanced({
  editor,
  pivot,
}: {
  editor: XlsxPivotTableEditor
  pivot: XlsxPivotTable
}) {
  const [chartType, setChartType] =
    React.useState<XlsxPivotChartType>("ColumnClustered")
  const [chartCell, setChartCell] = React.useState("I2")
  const [chartTitle, setChartTitle] = React.useState("")
  const [chartMeasure, setChartMeasure] = React.useState("")
  const [chartSheet, setChartSheet] = React.useState("")
  const [chartWidth, setChartWidth] = React.useState("560")
  const [chartHeight, setChartHeight] = React.useState("340")
  const update = (patch: Partial<XlsxPivotTable>) =>
    editor.edit((current) => ({ ...current, ...patch }))
  const sheets: Options = editor.viewer.sheets.map((sheet) => [
    sheet.name,
    sheet.name,
  ])
  return (
    <>
      <Section title="Source and location">
        <Text
          label="PivotTable name"
          value={pivot.name}
          onChange={(name) => update({ name })}
        />
        <Choice
          label="Source worksheet"
          value={pivot.source.sheet}
          options={sheets}
          onChange={(sheet) => update({ source: { ...pivot.source, sheet } })}
        />
        <Text
          label="Source range"
          value={pivot.source.range}
          onChange={(range) => update({ source: { ...pivot.source, range } })}
        />
        <Text
          label="Source table name (optional)"
          value={pivot.source.table ?? ""}
          onChange={(table) =>
            update({ source: { ...pivot.source, table: table || null } })
          }
        />
        <Action onClick={editor.readFields}>Load source fields</Action>
        <Choice
          label="Destination worksheet"
          value={pivot.target.sheet}
          options={sheets}
          onChange={(sheet) => update({ target: { ...pivot.target, sheet } })}
        />
        <Text
          label="Destination cell"
          value={pivot.target.cell}
          onChange={(cell) => update({ target: { ...pivot.target, cell } })}
        />
      </Section>
      <Section title="Layout and format">
        <Choice
          label="Report layout"
          value={pivot.layout}
          options={[
            ["compact", "Compact form"],
            ["outline", "Outline form"],
            ["tabular", "Tabular form"],
          ]}
          onChange={(layout) =>
            update({ layout: layout as XlsxPivotTable["layout"] })
          }
        />
        <Choice
          label="Multiple value fields"
          value={pivot.valuesOnRows ? "rows" : "columns"}
          options={[
            ["columns", "Show values in columns"],
            ["rows", "Show values in rows"],
          ]}
          onChange={(value) => update({ valuesOnRows: value === "rows" })}
        />
        <Check
          label="Repeat item labels"
          checked={pivot.repeatLabels}
          onChange={(repeatLabels) => update({ repeatLabels })}
        />
        <Choice
          label="Subtotals"
          value={pivot.subtotalsPosition}
          options={[
            ["top", "At top of group"],
            ["bottom", "At bottom of group"],
            ["none", "Do not show"],
          ]}
          onChange={(subtotalsPosition) =>
            update({
              subtotalsPosition:
                subtotalsPosition as XlsxPivotTable["subtotalsPosition"],
            })
          }
        />
        <Check
          label="Grand totals for rows"
          checked={pivot.rowGrandTotals}
          onChange={(rowGrandTotals) => update({ rowGrandTotals })}
        />
        <Check
          label="Grand totals for columns"
          checked={pivot.columnGrandTotals}
          onChange={(columnGrandTotals) => update({ columnGrandTotals })}
        />
        <Text
          label="PivotTable style"
          value={pivot.styleName}
          onChange={(styleName) => update({ styleName })}
        />
        <Check
          label="Preserve cell formatting"
          checked={pivot.preserveFormatting ?? true}
          onChange={(preserveFormatting) => update({ preserveFormatting })}
        />
        <Check
          label="Refresh when opened in Excel"
          checked={pivot.refreshOnLoad}
          onChange={(refreshOnLoad) => update({ refreshOnLoad })}
        />
      </Section>
      <Section title="Calculated fields and items">
        <Action
          disabled={!pivot.fields.length}
          onClick={() =>
            editor.edit((current) => ({
              ...current,
              values: [
                ...current.values,
                {
                  field: current.fields[0].index,
                  name: `Calculated ${current.values.length + 1}`,
                  aggregation: "sum",
                  showAs: "normal",
                  formula: "0",
                },
              ],
            }))
          }
        >
          Add calculated field
        </Action>
        <p style={hint}>Edit the new field’s formula in its Values settings.</p>
        <p style={hint}>{FORMULA_HELP}</p>
        {pivot.calculatedItems.map((item, index) => (
          <div
            key={index}
            style={{
              ...stack,
              paddingTop: 8,
              borderTop: "1px solid var(--xlsx-pivot-border)",
            }}
          >
            <Choice
              label="Field"
              value={String(item.field)}
              options={pivot.fields.map((field) => [
                String(field.index),
                field.name,
              ])}
              onChange={(field) =>
                update({
                  calculatedItems: pivot.calculatedItems.map(
                    (entry, position) =>
                      position === index
                        ? { ...entry, field: Number(field) }
                        : entry
                  ),
                })
              }
            />
            <Text
              label="Item name"
              value={item.name}
              onChange={(name) =>
                update({
                  calculatedItems: pivot.calculatedItems.map(
                    (entry, position) =>
                      position === index ? { ...entry, name } : entry
                  ),
                })
              }
            />
            <Text
              label="Formula"
              value={item.formula}
              onChange={(formula) =>
                update({
                  calculatedItems: pivot.calculatedItems.map(
                    (entry, position) =>
                      position === index ? { ...entry, formula } : entry
                  ),
                })
              }
            />
            <Action
              onClick={() =>
                update({
                  calculatedItems: pivot.calculatedItems.filter(
                    (_, position) => position !== index
                  ),
                })
              }
            >
              Remove calculated item
            </Action>
          </div>
        ))}
        <Action
          disabled={!pivot.fields.length}
          onClick={() =>
            update({
              calculatedItems: [
                ...pivot.calculatedItems,
                {
                  field: pivot.rows[0]?.field ?? pivot.fields[0].index,
                  name: `Calculated item ${pivot.calculatedItems.length + 1}`,
                  formula: "0",
                },
              ],
            })
          }
        >
          Add calculated item
        </Action>
      </Section>
      <Section title="PivotChart">
        {pivot.charts?.length ? (
          <p style={hint}>
            {pivot.charts.length} linked chart
            {pivot.charts.length === 1 ? "" : "s"}. Refreshing the PivotTable
            updates their values.
          </p>
        ) : null}
        <Choice
          label="Chart type"
          value={chartType}
          options={CHART_TYPES}
          onChange={(value) => setChartType(value as XlsxPivotChartType)}
        />
        <Text
          label="Title"
          value={chartTitle}
          placeholder={pivot.name}
          onChange={setChartTitle}
        />
        <Choice
          label="Chart worksheet"
          value={chartSheet || pivot.target.sheet}
          options={sheets}
          onChange={setChartSheet}
        />
        <Text label="Top-left cell" value={chartCell} onChange={setChartCell} />
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <Text
            label="Width (px)"
            type="number"
            min={80}
            max={10000}
            value={chartWidth}
            onChange={setChartWidth}
          />
          <Text
            label="Height (px)"
            type="number"
            min={80}
            max={10000}
            value={chartHeight}
            onChange={setChartHeight}
          />
        </div>
        <Choice
          label="Values"
          value={chartMeasure}
          options={[
            ["", "All value fields"],
            ...pivot.values.map(
              (value, index) => [String(index), value.name] as const
            ),
          ]}
          onChange={setChartMeasure}
        />
        {chartType === "Pie" || chartType === "Doughnut" ? (
          <p style={hint}>Pie and doughnut charts display the first series.</p>
        ) : null}
        <Action
          disabled={!pivot.id || editor.dirty || !pivot.values.length}
          onClick={() =>
            editor.run(() => {
              editor.viewer.createPivotChart(pivot.id, {
                chartType,
                sheet: chartSheet || pivot.target.sheet,
                cell: chartCell,
                title: chartTitle || pivot.name,
                width: Number(chartWidth),
                height: Number(chartHeight),
                measure: chartMeasure ? Number(chartMeasure) : null,
              })
            })
          }
        >
          Insert PivotChart
        </Action>
        {editor.dirty ? (
          <p style={hint}>Apply field changes before inserting a chart.</p>
        ) : null}
      </Section>
    </>
  )
}

export interface WorkbookPivotControlsProps {
  editor: XlsxPivotTableEditor
  className?: string
  style?: React.CSSProperties
}

export function WorkbookPivotControls({
  editor,
  className,
  style,
}: WorkbookPivotControlsProps) {
  const paneRef = React.useRef<HTMLElement>(null)
  const [placement, setPlacement] = React.useState({
    overlay: false,
    top: 0,
    width: 324,
  })
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState<Selection | null>(null)
  const [dragOver, setDragOver] = React.useState<XlsxPivotFieldArea | null>(
    null
  )
  const [announcement, setAnnouncement] = React.useState("")
  const titleId = React.useId()
  const settingsId = React.useId()
  const pivot = editor.draft
  const disabled =
    editor.readOnly ||
    Boolean(pivot?.unsupportedFeatures.length) ||
    editor.sourceNeedsLoad
  const [previousPivotId, setPreviousPivotId] = React.useState(pivot?.id)
  if (previousPivotId !== pivot?.id) {
    setPreviousPivotId(pivot?.id)
    setSelected(null)
    setSearch("")
  }
  React.useEffect(() => {
    const parent = paneRef.current?.parentElement
    if (!parent) return
    const viewer = parent.closest(".react-xlsx-viewer")
    const measure = () => {
      const bounds = (viewer ?? parent).getBoundingClientRect()
      const next = {
        overlay: Boolean(viewer && bounds.width < 640),
        top: 0,
        width: Math.min(324, bounds.width),
      }
      setPlacement((current) =>
        current.overlay === next.overlay &&
        current.top === next.top &&
        current.width === next.width
          ? current
          : next
      )
    }
    measure()
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    observer?.observe(parent)
    if (viewer) observer?.observe(viewer)
    window.addEventListener("resize", measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [])
  const selectedField =
    pivot && selected
      ? fieldIndex(pivot, selected.area, selected.index)
      : undefined
  const selectedCalculated = Boolean(
    pivot &&
      selected?.area === "values" &&
      pivot.values[selected.index]?.formula?.trim()
  )
  const theme = {
    "--xlsx-pivot-bg": "var(--background)",
    "--xlsx-pivot-input": "var(--background)",
    "--xlsx-pivot-border": "var(--border)",
    "--xlsx-pivot-muted": "var(--muted-foreground)",
    "--xlsx-pivot-accent": "var(--primary)",
    "--xlsx-pivot-hover": "var(--accent)",
  } as React.CSSProperties
  const move = (from: Selection, to: XlsxPivotFieldArea, index?: number) => {
    if (
      from.area === "values" &&
      to !== "values" &&
      pivot?.values[from.index]?.formula?.trim()
    ) {
      setAnnouncement("Calculated fields stay in the Values area.")
      return
    }
    editor.moveField(from.area, from.index, to, index)
    setSelected(null)
    setAnnouncement(`Field moved to ${AREA_NAMES[to]}.`)
  }
  const drop = (
    event: React.DragEvent,
    area: XlsxPivotFieldArea,
    index?: number
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setDragOver(null)
    if (disabled) return
    try {
      const data = JSON.parse(
        event.dataTransfer.getData(DRAG_TYPE)
      ) as DragField
      if (
        "field" in data &&
        Number.isInteger(data.field) &&
        pivot?.fields.some((field) => field.index === data.field)
      ) {
        editor.addField(area, data.field)
        setAnnouncement(`Field added to ${AREA_NAMES[area]}.`)
      } else if (
        "area" in data &&
        AREAS.includes(data.area) &&
        Number.isInteger(data.index) &&
        pivot &&
        data.index >= 0 &&
        data.index < pivot[data.area].length
      )
        move(data, area, index)
    } catch {
      setAnnouncement("The field could not be moved.")
    }
  }
  const drag = (event: React.DragEvent, data: DragField) => {
    event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(data))
    event.dataTransfer.effectAllowed = "move"
  }
  return (
    <aside
      ref={paneRef}
      aria-labelledby={titleId}
      className={cn(
        "bg-background text-sm text-foreground [&_fieldset:disabled]:opacity-64 [&_summary]:rounded-sm [&_summary]:focus-visible:outline-ring",
        className
      )}
      style={{
        ...theme,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        width: placement.width,
        minWidth: 0,
        maxWidth: "100%",
        height: "100%",
        minHeight: 0,
        flexShrink: 0,
        borderInlineStart: "1px solid var(--xlsx-pivot-border)",
        background: "var(--xlsx-pivot-bg)",
        ...(placement.overlay
          ? ({
              position: "absolute",
              insetInlineEnd: 0,
              top: placement.top,
              bottom: 0,
              height: "auto",
              zIndex: 1000,
              boxShadow: "var(--shadow-lg)",
            } as React.CSSProperties)
          : {}),
        ...style,
      }}
    >
      <header
        style={{
          ...row,
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid var(--xlsx-pivot-border)",
        }}
      >
        <h2 id={titleId} style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
          PivotTable Fields
        </h2>
        <Action
          aria-label="Close PivotTable field list"
          onClick={() => editor.setOpen(false)}
          style={{
            border: 0,
            background: "transparent",
            fontSize: 20,
            lineHeight: 1,
            padding: "2px 6px",
          }}
        >
          ×
        </Action>
      </header>
      <div style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        <div style={{ ...stack, padding: 12 }}>
          <div style={{ ...row, alignItems: "end" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Choice
                label="PivotTable"
                value={pivot?.id ?? ""}
                placeholder={
                  pivot && !pivot.id ? pivot.name : "Choose a PivotTable"
                }
                options={editor.viewer.pivotTables.map((item) => [
                  item.id,
                  item.name,
                ])}
                onChange={editor.select}
                disabled={editor.dirty}
              />
            </div>
            <Action
              disabled={editor.viewer.readOnly || editor.dirty}
              onClick={editor.create}
            >
              New
            </Action>
          </div>
          {editor.error ? (
            <p
              role="alert"
              style={{
                margin: 0,
                color: "var(--destructive)",
                overflowWrap: "anywhere",
              }}
            >
              {editor.error}
            </p>
          ) : null}
          {editor.status ? (
            <p role="status" style={hint}>
              {editor.status}
            </p>
          ) : null}
          {editor.stale ? (
            <p role="alert" style={hint}>
              The worksheet changed while you were editing. Discard these
              changes to load the current PivotTable.
            </p>
          ) : null}
          {editor.sourceNeedsLoad ? (
            <p role="status" style={hint}>
              The source changed. Load its fields under Source and location.
            </p>
          ) : null}
          {pivot?.unsupportedFeatures.length ? (
            <p style={hint}>
              This PivotTable is preserved for Excel. Editing is unavailable
              for: {pivot.unsupportedFeatures.join(", ")}.
            </p>
          ) : null}
          {editor.viewer.readOnly ? (
            <p style={hint}>
              Enable workbook editing to change this PivotTable.
            </p>
          ) : null}
        </div>
        {pivot ? (
          <>
            <WorkbookDisabledControls value={disabled}>
              <fieldset
                disabled={disabled}
                style={{
                  margin: 0,
                  padding: "0 12px 12px",
                  border: 0,
                  minWidth: 0,
                }}
              >
                <legend
                  style={{ padding: 0, fontWeight: 600, marginBottom: 8 }}
                >
                  Choose fields to add to report
                </legend>
                <Input
                  aria-label="Search PivotTable fields"
                  type="search"
                  placeholder="Search fields"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="mb-2"
                />
                <div
                  role="group"
                  aria-label="Source fields"
                  style={{
                    maxHeight: 190,
                    overflowY: "auto",
                    border: "1px solid var(--xlsx-pivot-border)",
                    padding: "5px 7px",
                    background: "var(--xlsx-pivot-input)",
                  }}
                >
                  {pivot.fields
                    .filter((field) =>
                      field.name
                        .toLocaleLowerCase()
                        .includes(search.toLocaleLowerCase())
                    )
                    .map((field) => {
                      const checked = AREAS.some((area) =>
                        pivot[area].some(
                          (_, index) =>
                            sourceFieldIndex(pivot, area, index) === field.index
                        )
                      )
                      return (
                        <div
                          key={field.index}
                          draggable={!disabled}
                          onDragStart={(event) =>
                            drag(event, { field: field.index })
                          }
                          style={{ padding: "2px 0" }}
                        >
                          <Check
                            label={field.name}
                            checked={checked}
                            onChange={(value) => {
                              if (value)
                                editor.addField(
                                  field.dataType === "number"
                                    ? "values"
                                    : "rows",
                                  field.index
                                )
                              else {
                                for (const area of AREAS)
                                  for (
                                    let index = pivot[area].length - 1;
                                    index >= 0;
                                    index--
                                  )
                                    if (
                                      sourceFieldIndex(pivot, area, index) ===
                                      field.index
                                    )
                                      editor.removeField(area, index)
                                editor.edit((current) => ({
                                  ...current,
                                  filters: current.filters.filter(
                                    (item) => item.field !== field.index
                                  ),
                                }))
                              }
                              setSelected(null)
                            }}
                          />
                        </div>
                      )
                    })}
                  {!pivot.fields.length ? (
                    <p style={hint}>Load source fields to begin.</p>
                  ) : !pivot.fields.some((field) =>
                      field.name
                        .toLocaleLowerCase()
                        .includes(search.toLocaleLowerCase())
                    ) ? (
                    <p style={hint}>No matching fields.</p>
                  ) : null}
                </div>
                <p style={{ ...hint, marginBlock: "10px 6px" }}>
                  Drag fields between the areas below.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
                    gap: 8,
                  }}
                >
                  {AREAS.map((area) => (
                    <section
                      key={area}
                      aria-label={`${AREA_NAMES[area]} fields`}
                      onDragOver={(event) => {
                        if (
                          !disabled &&
                          event.dataTransfer.types.includes(DRAG_TYPE)
                        ) {
                          event.preventDefault()
                          setDragOver(area)
                        }
                      }}
                      onDragLeave={(event) => {
                        if (
                          !event.currentTarget.contains(
                            event.relatedTarget as Node | null
                          )
                        )
                          setDragOver(null)
                      }}
                      onDrop={(event) => drop(event, area)}
                      style={{
                        minHeight: 94,
                        minWidth: 0,
                        border: `1px solid ${dragOver === area ? "var(--xlsx-pivot-accent)" : "var(--xlsx-pivot-border)"}`,
                        background:
                          dragOver === area
                            ? "var(--xlsx-pivot-hover)"
                            : "var(--xlsx-pivot-input)",
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          padding: "5px 6px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderBottom: "1px solid var(--xlsx-pivot-border)",
                          background: "var(--xlsx-pivot-bg)",
                        }}
                      >
                        {area === "values" ? "Σ " : ""}
                        {AREA_NAMES[area]}
                      </h3>
                      <div style={{ padding: 4 }}>
                        {pivot[area].map((_, index) => {
                          const field = fieldIndex(pivot, area, index)!
                          const name =
                            area === "values"
                              ? pivot.values[index].name
                              : area === "reportFilters"
                                ? fieldName(pivot, field)
                                : pivot[area][index].name ||
                                  fieldName(pivot, field)
                          const active =
                            selected?.area === area && selected.index === index
                          return (
                            <div
                              key={`${field}-${index}`}
                              draggable={!disabled}
                              onDragStart={(event) =>
                                drag(event, { area, index })
                              }
                              onDrop={(event) => drop(event, area, index)}
                              style={{ marginBottom: 3 }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full min-w-0"
                                aria-expanded={active}
                                aria-controls={settingsId}
                                title={`${name} settings. Alt+Up or Alt+Down reorders the field.`}
                                onClick={() =>
                                  setSelected(active ? null : { area, index })
                                }
                                onKeyDown={(event) => {
                                  if (
                                    !event.altKey ||
                                    !["ArrowUp", "ArrowDown"].includes(
                                      event.key
                                    )
                                  )
                                    return
                                  event.preventDefault()
                                  const position =
                                    index + (event.key === "ArrowUp" ? -1 : 1)
                                  if (
                                    position >= 0 &&
                                    position < pivot[area].length
                                  )
                                    move({ area, index }, area, position)
                                }}
                                style={{
                                  ...row,
                                  textAlign: "start",
                                  justifyContent: "space-between",
                                  background: active
                                    ? "var(--xlsx-pivot-hover)"
                                    : "var(--xlsx-pivot-bg)",
                                  padding: "4px 5px",
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {name}
                                </span>
                                <span aria-hidden="true">▾</span>
                              </Button>
                            </div>
                          )
                        })}
                        {!pivot[area].length ? (
                          <p
                            style={{
                              ...hint,
                              padding: "5px 3px",
                              fontSize: 12,
                            }}
                          >
                            Drop fields here
                          </p>
                        ) : null}
                      </div>
                    </section>
                  ))}
                </div>
                <p style={{ ...hint, marginTop: 6 }}>
                  Select a field for settings and keyboard move controls.
                </p>
                {selected && selectedField !== undefined ? (
                  <section
                    id={settingsId}
                    aria-label="Field settings"
                    style={{
                      ...stack,
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: "2px solid var(--xlsx-pivot-accent)",
                    }}
                  >
                    <div style={{ ...row, justifyContent: "space-between" }}>
                      <strong style={{ overflowWrap: "anywhere" }}>
                        {selected.area === "values"
                          ? pivot.values[selected.index].name
                          : fieldName(pivot, selectedField)}{" "}
                        settings
                      </strong>
                      <Action
                        aria-label="Close field settings"
                        onClick={() => setSelected(null)}
                      >
                        ×
                      </Action>
                    </div>
                    {selectedCalculated ? (
                      <p style={hint}>
                        Calculated fields stay in the Values area.
                      </p>
                    ) : (
                      <Choice
                        label="Move to"
                        value={selected.area}
                        options={AREAS.map((area) => [area, AREA_NAMES[area]])}
                        onChange={(area) =>
                          move(selected, area as XlsxPivotFieldArea)
                        }
                      />
                    )}
                    <div style={{ ...row, flexWrap: "wrap" }}>
                      <Action
                        disabled={selected.index === 0}
                        onClick={() =>
                          move(selected, selected.area, selected.index - 1)
                        }
                      >
                        Move up
                      </Action>
                      <Action
                        disabled={
                          selected.index === pivot[selected.area].length - 1
                        }
                        onClick={() =>
                          move(selected, selected.area, selected.index + 1)
                        }
                      >
                        Move down
                      </Action>
                      <Action
                        onClick={() => {
                          editor.removeField(selected.area, selected.index)
                          setSelected(null)
                        }}
                      >
                        Remove field
                      </Action>
                    </div>
                    {selected.area === "values" ? (
                      <ValueSettings
                        pivot={pivot}
                        value={pivot.values[selected.index]}
                        onChange={(value) =>
                          editor.edit((current) => ({
                            ...current,
                            values: current.values.map((item, index) =>
                              index === selected.index ? value : item
                            ),
                          }))
                        }
                      />
                    ) : selected.area === "rows" ||
                      selected.area === "columns" ? (
                      <AxisSettings
                        pivot={pivot}
                        axis={pivot[selected.area][selected.index]}
                        onChange={(axis) =>
                          editor.edit((current) => ({
                            ...current,
                            [selected.area]: current[selected.area].map(
                              (item, index) =>
                                index === selected.index ? axis : item
                            ),
                          }))
                        }
                        onAddDateLevel={(unit) =>
                          editor.edit((current) => {
                            const area = selected.area as "rows" | "columns"
                            const axis = current[area][selected.index]
                            return {
                              ...current,
                              [area]: [
                                ...current[area].slice(0, selected.index + 1),
                                {
                                  ...axis,
                                  name: unit[0].toUpperCase() + unit.slice(1),
                                  grouping: {
                                    ...axis.grouping!,
                                    kind: "date",
                                    unit,
                                  },
                                  items: [],
                                  collapsed: [],
                                },
                                ...current[area].slice(selected.index + 1),
                              ],
                            }
                          })
                        }
                      />
                    ) : null}
                    {selected.area !== "values" ? (
                      <FieldFilters
                        editor={editor}
                        pivot={pivot}
                        field={selectedField}
                        axis={
                          selected.area === "rows" ||
                          selected.area === "columns"
                            ? pivot[selected.area][selected.index]
                            : undefined
                        }
                      />
                    ) : null}
                  </section>
                ) : null}
              </fieldset>
            </WorkbookDisabledControls>
            <WorkbookDisabledControls value={editor.readOnly}>
              <fieldset
                disabled={
                  editor.readOnly || Boolean(pivot.unsupportedFeatures.length)
                }
                style={{ margin: 0, padding: 0, minWidth: 0, border: 0 }}
              >
                <Advanced editor={editor} pivot={pivot} />
              </fieldset>
            </WorkbookDisabledControls>
            <Section title="Refresh and details">
              <div style={{ ...row, flexWrap: "wrap" }}>
                <Action
                  disabled={disabled || editor.dirty || !pivot.id}
                  onClick={() => editor.refresh()}
                >
                  Refresh
                </Action>
                <Action
                  disabled={
                    editor.readOnly ||
                    editor.dirty ||
                    !editor.viewer.pivotTables.length
                  }
                  onClick={() => editor.refresh(true)}
                >
                  Refresh all
                </Action>
                <Action
                  disabled={disabled || editor.dirty || !pivot.id}
                  onClick={editor.showDetails}
                >
                  Show details
                </Action>
              </div>
              <p style={hint}>
                Select a value cell in the report to inspect its source records.
              </p>
              {editor.details ? (
                <>
                  <div style={{ ...row, justifyContent: "space-between" }}>
                    <span>
                      {editor.details.rows.length.toLocaleString()} records
                    </span>
                    <Action onClick={editor.clearDetails}>Close details</Action>
                  </div>
                  <div
                    style={{
                      maxHeight: 210,
                      overflow: "auto",
                      border: "1px solid var(--xlsx-pivot-border)",
                    }}
                  >
                    <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {editor.details.fields.map((field, index) => (
                            <th
                              key={index}
                              scope="col"
                              style={{
                                padding: "5px 7px",
                                textAlign: "start",
                                whiteSpace: "nowrap",
                                borderBottom:
                                  "1px solid var(--xlsx-pivot-border)",
                              }}
                            >
                              {field}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {editor.details.rows
                          .slice(0, 100)
                          .map((record, index) => (
                            <tr key={index}>
                              {record.map((value, column) => (
                                <td
                                  key={column}
                                  style={{
                                    padding: "4px 7px",
                                    whiteSpace: "nowrap",
                                    borderBottom:
                                      "1px solid var(--xlsx-pivot-border)",
                                  }}
                                >
                                  {value == null ? "" : String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {editor.details.rows.length > 100 ? (
                    <p style={hint}>
                      Showing the first 100 records. Create a detail worksheet
                      to see all records.
                    </p>
                  ) : null}
                  <Action
                    disabled={editor.readOnly || !editor.detailContext}
                    onClick={() =>
                      editor.run(() => {
                        const context = editor.detailContext
                        if (context)
                          editor.viewer.showPivotDetails(
                            context.id,
                            context.row,
                            context.col
                          )
                      })
                    }
                  >
                    Create detail worksheet
                  </Action>
                </>
              ) : null}
              <Action
                disabled={editor.readOnly || editor.dirty || !pivot.id}
                onClick={editor.remove}
              >
                Remove PivotTable
              </Action>
            </Section>
          </>
        ) : (
          <div style={{ ...stack, padding: "4px 12px 20px" }}>
            <p style={hint}>
              Select a PivotTable cell to arrange its fields, or create a
              PivotTable from the selected data.
            </p>
            <Action
              primary
              disabled={editor.readOnly || !editor.viewer.activeSheet}
              onClick={editor.create}
            >
              Create PivotTable
            </Action>
          </div>
        )}
      </div>
      {pivot ? (
        <footer
          style={{
            ...stack,
            gap: 7,
            padding: "10px 12px",
            borderTop: "1px solid var(--xlsx-pivot-border)",
          }}
        >
          <div style={{ ...row, justifyContent: "space-between" }}>
            <span style={hint}>
              {editor.dirty ? "Changes pending" : "Report is up to date"}
            </span>
            <div style={row}>
              <Action disabled={!editor.dirty} onClick={editor.reset}>
                Discard
              </Action>
              <Action
                primary
                disabled={disabled || !editor.dirty || editor.stale}
                onClick={editor.apply}
              >
                Apply
              </Action>
            </div>
          </div>
        </footer>
      ) : null}
      <span
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {announcement}
      </span>
    </aside>
  )
}
