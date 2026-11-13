"use client"

import * as React from "react"
import type {
  XlsxContextMenuRenderProps,
  XlsxFormControlRenderProps,
  XlsxImageSelectionRenderProps,
} from "@extend-ai/react-xlsx"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  WorkbookSelect,
  WorkbookSelectContent,
  WorkbookSelectItem,
  WorkbookSelectTrigger,
  WorkbookSelectValue,
} from "@/components/extend/workbook-select"

export const WorkbookPopupContainer = React.createContext<HTMLElement | null>(
  null
)
const WorkbookControlsDisabled = React.createContext(false)
export const WorkbookDisabledControls = WorkbookControlsDisabled.Provider

export function WorkbookControlButton({
  primary,
  style,
  ...props
}: React.ComponentProps<typeof Button> & { primary?: boolean }) {
  return (
    <Button
      type="button"
      variant={primary ? "default" : "outline"}
      size="sm"
      {...props}
      style={style}
    />
  )
}
export function WorkbookControlInput({
  label,
  value,
  onChange,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange"> & {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = React.useId()
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <Input
        id={id}
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
export function WorkbookControlSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
  disabled,
}: {
  label: string
  value: string
  options: ReadonlyArray<readonly [string, string]>
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  const container = React.useContext(WorkbookPopupContainer)
  const inheritedDisabled = React.useContext(WorkbookControlsDisabled)
  const id = React.useId()
  return (
    <div className="grid min-w-0 gap-1.5">
      <label id={id} className="text-sm">
        {label}
      </label>
      <WorkbookSelect
        value={value}
        disabled={disabled || inheritedDisabled}
        onValueChange={(next) => {
          if (next !== null) onChange(next)
        }}
        items={options.map(([value, label]) => ({ value, label }))}
      >
        <WorkbookSelectTrigger
          aria-labelledby={id}
          size="sm"
          className="min-w-0"
        >
          <WorkbookSelectValue placeholder={placeholder} />
        </WorkbookSelectTrigger>
        <WorkbookSelectContent
          portalProps={container ? { container } : undefined}
        >
          {options.map(([key, text]) => (
            <WorkbookSelectItem key={key} value={key}>
              {text}
            </WorkbookSelectItem>
          ))}
        </WorkbookSelectContent>
      </WorkbookSelect>
    </div>
  )
}
export function WorkbookControlCheck({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}) {
  return (
    <label className="flex min-w-0 items-start gap-2 py-1 text-sm">
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary focus-visible:outline-ring disabled:opacity-64"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="break-words">{label}</span>
    </label>
  )
}

function WorkbookMenuItems({
  actions,
  busy,
  runAction,
  container,
}: Pick<XlsxContextMenuRenderProps, "actions" | "busy" | "runAction"> & {
  container: HTMLElement
}) {
  return actions.map((action, index) => {
    const content = (
      <>
        {action.label}
        {action.shortcut ? (
          <ContextMenuShortcut>{action.shortcut}</ContextMenuShortcut>
        ) : null}
      </>
    )
    return (
      <React.Fragment key={action.id}>
        {action.separatorBefore && index > 0 ? <ContextMenuSeparator /> : null}
        {action.children?.length ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={busy || action.disabled}>
              {content}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent
              portalProps={{ container }}
              positionMethod="fixed"
              className="w-56"
              onKeyDown={(event) => event.stopPropagation()}
            >
              <WorkbookMenuItems
                actions={action.children}
                busy={busy}
                runAction={runAction}
                container={container}
              />
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : typeof action.checked === "boolean" ? (
          <ContextMenuCheckboxItem
            closeOnClick={false}
            checked={action.checked}
            disabled={busy || action.disabled}
            onClick={() => void runAction(action.id)}
          >
            {content}
          </ContextMenuCheckboxItem>
        ) : (
          <ContextMenuItem
            closeOnClick={false}
            disabled={busy || action.disabled}
            variant={action.destructive ? "destructive" : "default"}
            onClick={() => void runAction(action.id)}
          >
            {content}
          </ContextMenuItem>
        )}
      </React.Fragment>
    )
  })
}
export function WorkbookContextMenu(props: XlsxContextMenuRenderProps) {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null)
  return (
    <div
      ref={setContainer}
      className={props.isDark ? "dark" : undefined}
      style={{ width: 1, height: 1 }}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {container ? (
        <ContextMenu
          open
          onOpenChange={(open) => {
            if (!open) props.closeMenu()
          }}
        >
          <ContextMenuContent
            anchor={container}
            positionMethod="fixed"
            portalProps={{ container }}
            finalFocus={false}
            side="bottom"
            sideOffset={0}
            align="start"
            className="w-56"
            onKeyDown={(event) => event.stopPropagation()}
          >
            <WorkbookMenuItems {...props} container={container} />
            {props.error ? (
              <p role="alert" className="max-w-72 p-2 text-sm text-destructive">
                {props.error}
              </p>
            ) : null}
          </ContextMenuContent>
        </ContextMenu>
      ) : null}
    </div>
  )
}
export function renderWorkbookContextMenu(props: XlsxContextMenuRenderProps) {
  return <WorkbookContextMenu {...props} />
}

export function renderWorkbookChartLoading() {
  return (
    <div
      role="status"
      className="flex size-full items-center justify-center gap-2 rounded-md border bg-muted/30 text-sm text-muted-foreground"
    >
      <Spinner className="size-4" />
      <span>Loading chart…</span>
    </div>
  )
}
export function renderWorkbookImageSelection({
  getHandleProps,
}: XlsxImageSelectionRenderProps) {
  return (
    <>
      <div
        className="pointer-events-none absolute"
        style={{
          inset: 0,
          border: getHandleProps("nw").style.border,
        }}
      />
      {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map(
        (position) => {
          const props = getHandleProps(position)
          return (
            <div
              key={position}
              {...props}
              className="rounded-sm bg-background shadow-xs"
              style={{
                ...props.style,
                background: "var(--background)",
              }}
            />
          )
        }
      )}
    </>
  )
}
function WorkbookFormControl({
  control,
  checked,
  disabled,
  items,
  label,
  mixed,
  setSelected,
  setState,
  setValue,
  activate,
  style,
  stopPropagation,
}: XlsxFormControlRenderProps) {
  const caption = label || control.title || control.name || "Worksheet control"
  return (
    <div
      style={style}
      className="text-sm text-foreground"
      onPointerDown={stopPropagation}
      onClick={stopPropagation}
      onKeyDown={stopPropagation}
    >
      {control.kind === "button" ? (
        <Button
          variant="outline"
          className="size-full min-h-0"
          disabled={disabled}
          onClick={activate}
        >
          {caption}
        </Button>
      ) : control.kind === "checkbox" || control.kind === "radio" ? (
        <label className="flex size-full items-center gap-2">
          <input
            type={control.kind}
            aria-label={caption}
            disabled={disabled}
            checked={checked}
            ref={(node) => {
              if (node) node.indeterminate = mixed
            }}
            className="size-4 accent-primary"
            onChange={(event) =>
              setState(event.target.checked ? "checked" : "unchecked")
            }
          />
          <span className="truncate">{label}</span>
        </label>
      ) : control.kind === "dropdown" ? (
        <WorkbookSelect
          disabled={disabled}
          value={
            typeof control.selected === "number"
              ? String(control.selected)
              : null
          }
          onValueChange={(value) =>
            setSelected(value == null ? undefined : Number(value))
          }
          items={items.map((label, index) => ({ value: String(index), label }))}
        >
          <WorkbookSelectTrigger
            aria-label={caption}
            className="size-full min-h-0 min-w-0"
          >
            <WorkbookSelectValue
              placeholder={label || "WorkbookSelect an item"}
            />
          </WorkbookSelectTrigger>
          <WorkbookSelectContent>
            {items.map((item, index) => (
              <WorkbookSelectItem key={index} value={String(index)}>
                {item || "(blank)"}
              </WorkbookSelectItem>
            ))}
          </WorkbookSelectContent>
        </WorkbookSelect>
      ) : control.kind === "listbox" ? (
        <select
          aria-label={caption}
          disabled={disabled}
          multiple={(control.selection ?? "single") !== "single"}
          value={
            (control.selection ?? "single") === "single"
              ? String(
                  typeof control.selected === "number" ? control.selected : -1
                )
              : (Array.isArray(control.selected)
                  ? control.selected
                  : typeof control.selected === "number"
                    ? [control.selected]
                    : []
                ).map(String)
          }
          className="size-full rounded-md border border-input bg-background p-1 text-sm outline-ring"
          onChange={(event) =>
            setSelected(
              (control.selection ?? "single") === "single"
                ? Number(event.target.value)
                : Array.from(event.target.selectedOptions, (item) =>
                    Number(item.value)
                  )
            )
          }
        >
          {items.map((item, index) => (
            <option key={index} value={index}>
              {item || "(blank)"}
            </option>
          ))}
        </select>
      ) : control.kind === "scrollbar" ? (
        <input
          aria-label={caption}
          type="range"
          disabled={disabled}
          min={control.min ?? 0}
          max={control.max ?? 100}
          step={control.increment ?? 1}
          value={control.value ?? control.min ?? 0}
          onChange={(event) => setValue(Number(event.target.value))}
          className="size-full accent-primary"
          style={
            control.horizontal === false
              ? { writingMode: "vertical-lr", direction: "rtl" }
              : undefined
          }
        />
      ) : control.kind === "spinner" ? (
        <Input
          aria-label={caption}
          type="number"
          disabled={disabled}
          min={control.min}
          max={control.max}
          step={control.increment ?? 1}
          value={control.value ?? 0}
          onChange={(event) => {
            if (
              event.target.value !== "" &&
              Number.isFinite(event.target.valueAsNumber)
            )
              setValue(event.target.valueAsNumber)
          }}
          className="size-full min-h-0"
        />
      ) : (
        <div
          className={cn(
            "size-full p-1",
            control.kind === "group-box" && "rounded-md border border-border"
          )}
        >
          {label}
        </div>
      )}
    </div>
  )
}
export function renderWorkbookFormControl(props: XlsxFormControlRenderProps) {
  return <WorkbookFormControl {...props} />
}
