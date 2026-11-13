"use client"

import * as React from "react"
import type {
  XlsxPivotFilter,
  XlsxPivotHeaderField,
  XlsxPivotTableHeaderMenuRenderProps,
} from "@extend-ai/react-xlsx"

import { Button as TriggerButton } from "@/components/ui/button"
import { Input as SearchInput } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  WorkbookControlButton as Button,
  WorkbookControlSelect as Choice,
  WorkbookControlInput as Input,
  WorkbookPopupContainer,
} from "@/components/extend/xlsx-controls"

type Options = ReadonlyArray<readonly [string, string]>
const stack: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
}
const row: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
}
const subdued: React.CSSProperties = {
  fontSize: 12,
  color: "var(--muted-foreground)",
  margin: 0,
}
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
function filterDefault(
  field: XlsxPivotHeaderField,
  kind: XlsxPivotFilter["kind"]
): XlsxPivotFilter {
  return {
    field: field.field,
    groupingUnit: field.groupingUnit,
    kind,
    values: [],
    operator: "equal",
    value: "",
    value2: "",
    measure: 0,
    count: 10,
    percent: false,
    top: true,
  }
}

function PivotFilter({ menu }: { menu: XlsxPivotTableHeaderMenuRenderProps }) {
  const [search, setSearch] = React.useState("")
  const [selected, setSelected] = React.useState(
    () =>
      new Set(
        menu.filters.find((filter) => filter.kind === "members")?.values ??
          menu.members.map((member) => member.key)
      )
  )
  const [mode, setMode] = React.useState<XlsxPivotFilter["kind"]>("members")
  const [draft, setDraft] = React.useState<XlsxPivotFilter>(() =>
    filterDefault(menu.field, "label")
  )
  const [sortMeasure, setSortMeasure] = React.useState("0")
  const titleId = React.useId()
  const visible = menu.members.filter((member) =>
    member.caption.toLocaleLowerCase().includes(search.toLocaleLowerCase())
  )
  const all =
    menu.members.length > 0 &&
    menu.members.every((member) => selected.has(member.key))
  const indeterminate =
    !all && menu.members.some((member) => selected.has(member.key))
  const setKind = (kind: XlsxPivotFilter["kind"]) => {
    setMode(kind)
    if (kind !== "members")
      setDraft(
        menu.filters.find((filter) => filter.kind === kind) ??
          filterDefault(menu.field, kind)
      )
  }
  const apply = () => {
    if (mode === "members") menu.setMembers(all ? null : [...selected])
    else menu.setFilter(draft)
  }
  return (
    <div className="text-sm" onKeyDown={(event) => event.stopPropagation()}>
      <div style={{ ...stack, gap: 10 }}>
        <div style={{ ...row, justifyContent: "space-between" }}>
          <h3
            id={titleId}
            style={{ fontSize: 13, margin: 0, overflowWrap: "anywhere" }}
          >
            {menu.field.name}
          </h3>
          <Button
            aria-label="Close PivotTable filter"
            onClick={menu.close}
            style={{ border: 0, fontSize: 17, padding: "1px 5px" }}
          >
            ×
          </Button>
        </div>
        {menu.header.fields.length > 1 ? (
          <Choice
            label="Select field"
            value={String(menu.field.depth)}
            options={menu.header.fields.map((field) => [
              String(field.depth),
              field.name,
            ])}
            onChange={(depth) => menu.setField(Number(depth))}
          />
        ) : null}
        {menu.error ? (
          <p
            role="alert"
            style={{
              margin: 0,
              borderInlineStart: "2px solid var(--destructive)",
              paddingInlineStart: 6,
            }}
          >
            {menu.error}
          </p>
        ) : null}
        {menu.readOnly ? (
          <p style={subdued}>
            {menu.pivot.unsupportedFeatures.length
              ? "This PivotTable contains features preserved for Excel. Sorting and filtering are unavailable."
              : "Enable workbook editing to change sorting or filters."}
          </p>
        ) : null}
        <fieldset
          disabled={menu.readOnly}
          style={{ ...stack, margin: 0, padding: 0, border: 0, minWidth: 0 }}
        >
          {menu.sort !== null ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                }}
              >
                <Button
                  aria-pressed={menu.sort === "ascending"}
                  onClick={() => menu.sortBy("ascending")}
                >
                  Sort A to Z
                </Button>
                <Button
                  aria-pressed={menu.sort === "descending"}
                  onClick={() => menu.sortBy("descending")}
                >
                  Sort Z to A
                </Button>
              </div>
              <details>
                <summary style={{ cursor: "pointer" }}>
                  More sort options
                </summary>
                <div style={{ ...stack, paddingTop: 8 }}>
                  <Button onClick={() => menu.sortBy("manual")}>
                    Use source order
                  </Button>
                  {menu.pivot.values.length ? (
                    <>
                      <Choice
                        label="Sort by value"
                        value={sortMeasure}
                        options={menu.pivot.values.map((value, index) => [
                          String(index),
                          value.name,
                        ])}
                        onChange={setSortMeasure}
                      />
                      <div style={row}>
                        <Button
                          onClick={() =>
                            menu.sortBy("valueAscending", Number(sortMeasure))
                          }
                        >
                          Smallest first
                        </Button>
                        <Button
                          onClick={() =>
                            menu.sortBy("valueDescending", Number(sortMeasure))
                          }
                        >
                          Largest first
                        </Button>
                      </div>
                    </>
                  ) : null}
                </div>
              </details>
            </>
          ) : null}
          <Button disabled={!menu.filters.length} onClick={menu.clearFilters}>
            Clear filters from “{menu.field.name}”
          </Button>
        </fieldset>
        <Choice
          label="Filter"
          value={mode}
          options={[
            ["members", "Select items"],
            ["label", "Label filter"],
            ...(menu.pivot.values.length
              ? ([
                  ["value", "Value filter"],
                  ["top10", "Top / bottom filter"],
                ] as Options)
              : []),
          ]}
          onChange={(kind) => setKind(kind as XlsxPivotFilter["kind"])}
        />
        {mode === "members" ? (
          <>
            <label style={{ ...stack, gap: 3 }}>
              <span>Search items</span>
              <SearchInput
                autoFocus
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full"
              />
            </label>
            <fieldset
              disabled={menu.readOnly}
              style={{ margin: 0, padding: 0, border: 0, minWidth: 0 }}
            >
              <label style={{ ...row, padding: "3px 0 6px" }}>
                <input
                  className="size-4 shrink-0 accent-primary focus-visible:outline-ring"
                  type="checkbox"
                  checked={all}
                  ref={(node) => {
                    if (node) node.indeterminate = indeterminate
                  }}
                  onChange={(event) =>
                    setSelected(
                      new Set(
                        event.target.checked
                          ? menu.members.map((member) => member.key)
                          : []
                      )
                    )
                  }
                />
                Select all
              </label>
              <div
                role="group"
                aria-label={`${menu.field.name} items`}
                style={{
                  border: `1px solid ${"var(--border)"}`,
                  maxHeight: 180,
                  overflowY: "auto",
                  padding: "4px 6px",
                }}
              >
                {visible.slice(0, 300).map((member) => (
                  <label
                    key={member.key}
                    style={{
                      ...row,
                      alignItems: "start",
                      padding: "3px 0",
                      overflowWrap: "anywhere",
                    }}
                  >
                    <input
                      className="size-4 shrink-0 accent-primary focus-visible:outline-ring"
                      type="checkbox"
                      style={{ marginTop: 2, flexShrink: 0 }}
                      checked={selected.has(member.key)}
                      onChange={(event) =>
                        setSelected((previous) => {
                          const next = new Set(previous)
                          if (event.target.checked) next.add(member.key)
                          else next.delete(member.key)
                          return next
                        })
                      }
                    />
                    {member.caption || "(blank)"}
                  </label>
                ))}
                {!visible.length ? (
                  <p style={subdued}>No matching items.</p>
                ) : null}
                {visible.length > 300 ? (
                  <p style={subdued}>
                    Search to narrow {visible.length.toLocaleString()} items.
                  </p>
                ) : null}
              </div>
            </fieldset>
            <p style={subdued}>{selected.size.toLocaleString()} selected</p>
          </>
        ) : (
          <fieldset
            disabled={menu.readOnly}
            style={{ ...stack, margin: 0, padding: 0, border: 0, minWidth: 0 }}
          >
            {mode === "label" || mode === "value" ? (
              <>
                <Choice
                  label="Condition"
                  value={draft.operator}
                  options={
                    mode === "value"
                      ? OPERATORS.filter(
                          ([operator]) =>
                            !/contains|begins|ends/i.test(operator)
                        )
                      : OPERATORS
                  }
                  onChange={(operator) =>
                    setDraft((current) => ({
                      ...current,
                      operator: operator as XlsxPivotFilter["operator"],
                    }))
                  }
                />
                <Input
                  label="Value"
                  type={mode === "value" ? "number" : "text"}
                  value={draft.value}
                  onChange={(value) =>
                    setDraft((current) => ({ ...current, value }))
                  }
                />
                {draft.operator === "between" ||
                draft.operator === "notBetween" ? (
                  <Input
                    label="And"
                    type={mode === "value" ? "number" : "text"}
                    value={draft.value2}
                    onChange={(value2) =>
                      setDraft((current) => ({ ...current, value2 }))
                    }
                  />
                ) : null}
              </>
            ) : null}
            {mode === "top10" ? (
              <>
                <Choice
                  label="Show"
                  value={draft.top ? "top" : "bottom"}
                  options={[
                    ["top", "Top"],
                    ["bottom", "Bottom"],
                  ]}
                  onChange={(top) =>
                    setDraft((current) => ({ ...current, top: top === "top" }))
                  }
                />
                <Input
                  label="Amount"
                  type="number"
                  min={1}
                  value={String(draft.count)}
                  onChange={(count) =>
                    setDraft((current) => ({
                      ...current,
                      count: Number(count),
                    }))
                  }
                />
                <Choice
                  label="Unit"
                  value={draft.percent ? "percent" : "items"}
                  options={[
                    ["items", "Items"],
                    ["percent", "Percent"],
                  ]}
                  onChange={(unit) =>
                    setDraft((current) => ({
                      ...current,
                      percent: unit === "percent",
                    }))
                  }
                />
              </>
            ) : null}
            {mode === "value" || mode === "top10" ? (
              <Choice
                label="By value"
                value={String(draft.measure)}
                options={menu.pivot.values.map((value, index) => [
                  String(index),
                  value.name,
                ])}
                onChange={(measure) =>
                  setDraft((current) => ({
                    ...current,
                    measure: Number(measure),
                  }))
                }
              />
            ) : null}
          </fieldset>
        )}
        <div
          style={{
            ...row,
            justifyContent: "flex-end",
            borderTop: `1px solid ${"var(--border)"}`,
            paddingTop: 9,
          }}
        >
          <Button onClick={menu.close}>Cancel</Button>
          <Button
            disabled={
              menu.readOnly || (mode === "members" && selected.size === 0)
            }
            onClick={apply}
            style={{ fontWeight: 600 }}
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}
function assignPopupRef(
  ref: React.Ref<HTMLDivElement> | undefined,
  node: HTMLDivElement | null
) {
  if (typeof ref === "function") ref(node)
  else if (ref) ref.current = node
}

export function WorkbookPivotHeaderMenu(
  menu: XlsxPivotTableHeaderMenuRenderProps
) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)
  return (
    <Popover open={menu.isOpen} onOpenChange={menu.setOpen}>
      <PopoverTrigger asChild>
        <TriggerButton
          {...menu.triggerProps}
          variant="ghost"
          size="icon-sm"
          aria-label={`Sort and filter ${menu.header.caption}`}
          className="size-6 rounded-sm"
        >
          {menu.filters.length ? "≡" : "▾"}
        </TriggerButton>
      </PopoverTrigger>
      {menu.isOpen ? (
        <PopoverContent
          {...menu.popupProps}
          ref={(node) => {
            setContainer(node)
            assignPopupRef(menu.popupProps.ref, node)
          }}
          align="end"
          className="w-80 max-w-[calc(100vw-1rem)]"
        >
          <WorkbookPopupContainer.Provider value={container}>
            <PivotFilter
              key={`${menu.pivot.id}:${menu.field.depth}`}
              menu={menu}
            />
          </WorkbookPopupContainer.Provider>
        </PopoverContent>
      ) : null}
    </Popover>
  )
}
