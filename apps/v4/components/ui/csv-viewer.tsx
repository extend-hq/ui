"use client"

import * as React from "react"
import type * as GlideDataGrid from "@glideapps/glide-data-grid"
import type {
  GridCell,
  GridCellKind,
  GridColumn,
  Item,
  Theme,
} from "@glideapps/glide-data-grid"
import {
  MinusSignCircleIcon,
  PlusSignCircleIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import Papa from "papaparse"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

const ZOOM_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const
const GLIDE_DATA_GRID_CRITICAL_CSS = `
.gdg-wmyidgi{position:relative;min-width:10px;min-height:10px;max-width:100%;max-height:100%;width:var(--wmyidgi-0);height:var(--wmyidgi-1);overflow:hidden;overflow:clip;direction:ltr;}
.gdg-wmyidgi>:first-child{position:absolute;left:0;top:0;width:100%;height:100%;}
.gdg-s1dgczr6 .dvn-scroller{overflow:var(--s1dgczr6-0);transform:translate3d(0,0,0);}
.gdg-s1dgczr6 .dvn-hidden{visibility:hidden;}
.gdg-s1dgczr6 .dvn-scroll-inner{display:flex;pointer-events:none;}
.gdg-s1dgczr6 .dvn-scroll-inner>*{flex-shrink:0;}
.gdg-s1dgczr6 .dvn-scroll-inner .dvn-spacer{flex-grow:1;}
.gdg-s1dgczr6 .dvn-scroll-inner .dvn-stack{display:flex;flex-direction:column;}
.gdg-s1dgczr6 .dvn-underlay>*{position:absolute;left:0;top:0;}
.gdg-s1dgczr6 canvas{outline:none;}
`

type GlideDataGridModule = typeof GlideDataGrid
type CsvViewerProps = {
  className?: string
  data?: string
}

function GlideDataGridCriticalStyles() {
  return <style>{GLIDE_DATA_GRID_CRITICAL_CSS}</style>
}

function toDisplayString(value: unknown): string {
  return value === null || value === undefined ? "" : String(value)
}

function normalizeHeaderTitle(header: string, index: number): string {
  const trimmed = header.trim()
  return trimmed.length > 0 ? trimmed : `Column ${index + 1}`
}

function parseDelimitedText(text: string): {
  headers: string[]
  rows: string[][]
  error: string | null
} {
  const results = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  })

  const objectRows = Array.isArray(results.data)
    ? results.data.filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === "object" && !Array.isArray(row)
      )
    : []
  const metaFields = Array.isArray(results.meta.fields)
    ? results.meta.fields.map((field) => String(field))
    : []
  const fieldKeys =
    metaFields.length > 0
      ? metaFields
      : Object.keys(objectRows[0] ?? {}).filter(
          (key) => key !== "__parsed_extra"
        )
  const extraColumnCount = objectRows.reduce((maxCount, row) => {
    const extras = row.__parsed_extra
    return Array.isArray(extras) ? Math.max(maxCount, extras.length) : maxCount
  }, 0)
  const headers = [
    ...fieldKeys.map((field, index) => normalizeHeaderTitle(field, index)),
    ...Array.from(
      { length: extraColumnCount },
      (_, index) => `Extra ${index + 1}`
    ),
  ]

  const rows = objectRows.map((row) => {
    const baseValues = fieldKeys.map((fieldKey) =>
      toDisplayString(row[fieldKey])
    )
    const extras = Array.isArray(row.__parsed_extra)
      ? row.__parsed_extra.map((value) => toDisplayString(value))
      : []
    const paddedExtras =
      extras.length >= extraColumnCount
        ? extras.slice(0, extraColumnCount)
        : [
            ...extras,
            ...Array.from(
              { length: extraColumnCount - extras.length },
              () => ""
            ),
          ]

    return [...baseValues, ...paddedExtras]
  })

  const firstError =
    Array.isArray(results.errors) && results.errors.length > 0
      ? results.errors[0]
      : null

  return {
    headers,
    rows,
    error:
      rows.length === 0 && firstError
        ? String(firstError.message ?? "Could not parse CSV file.")
        : null,
  }
}

function useIsDarkTheme() {
  const [isDark, setIsDark] = React.useState(false)

  React.useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.classList.contains("dark"))
    update()

    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributeFilter: ["class"],
      attributes: true,
    })

    return () => observer.disconnect()
  }, [])

  return isDark
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

export function CsvViewer({ className, data }: CsvViewerProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const isDark = useIsDarkTheme()
  const [glide, setGlide] = React.useState<GlideDataGridModule | null>(null)
  const [zoom, setZoom] = React.useState<(typeof ZOOM_OPTIONS)[number]>(1)
  const [parsed, setParsed] = React.useState(() =>
    data ? parseDelimitedText(data) : { headers: [], rows: [], error: null }
  )
  const [isPending, setIsPending] = React.useState(false)

  React.useEffect(() => {
    if (data) {
      setParsed(parseDelimitedText(data))
    }
  }, [data])

  React.useEffect(() => {
    let mounted = true

    void import("@glideapps/glide-data-grid").then((module) => {
      if (mounted) {
        setGlide(module)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  const columnCount = Math.max(1, parsed.headers.length)
  const scale = React.useCallback(
    (value: number) => Math.round(value * zoom),
    [zoom]
  )

  const theme = React.useMemo<Partial<Theme>>(
    () => ({
      accentColor: isDark ? "#60a5fa" : "#2563eb",
      accentLight: isDark ? "#1d4ed826" : "#dbeafe",
      accentFg: "#ffffff",
      textDark: isDark ? "#e5e5e5" : "#171717",
      textMedium: isDark ? "#a3a3a3" : "#525252",
      textLight: isDark ? "#737373" : "#a3a3a3",
      textBubble: isDark ? "#f5f5f5" : "#171717",
      textHeader: isDark ? "#f5f5f5" : "#171717",
      textGroupHeader: isDark ? "#a3a3a3" : "#525252",
      bgCell: isDark ? "#0a0a0a" : "#ffffff",
      bgCellMedium: isDark ? "#171717" : "#fafafa",
      bgHeader: isDark ? "#171717" : "#fafafa",
      bgHeaderHasFocus: isDark ? "#262626" : "#f5f5f5",
      bgHeaderHovered: isDark ? "#262626" : "#f5f5f5",
      borderColor: isDark ? "#262626" : "#e5e5e5",
      horizontalBorderColor: isDark ? "#262626" : "#e5e5e5",
      cellHorizontalPadding: scale(8),
      cellVerticalPadding: Math.max(2, scale(3)),
      headerIconSize: scale(18),
      baseFontStyle: `${scale(13)}px`,
      headerFontStyle: `600 ${scale(13)}px`,
      markerFontStyle: `${scale(11)}px`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      editorFontSize: `${scale(13)}px`,
    }),
    [isDark, scale]
  )

  const columns = React.useMemo<GridColumn[]>(
    () =>
      Array.from({ length: columnCount }, (_, index) => ({
        id: `column-${index}`,
        title: parsed.headers[index] ?? `Column ${index + 1}`,
        width: scale(index === 0 ? 180 : 160),
      })),
    [columnCount, parsed.headers, scale]
  )

  const getCellContent = React.useCallback(
    ([col, row]: Item): GridCell => {
      const value = parsed.rows[row]?.[col] ?? ""
      const textKind = glide?.GridCellKind.Text as GridCellKind.Text

      return {
        kind: textKind,
        data: value,
        displayData: value,
        allowOverlay: true,
        readonly: true,
      }
    },
    [glide, parsed.rows]
  )

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setIsPending(true)
    try {
      const text = await file.text()
      setParsed(parseDelimitedText(text))
    } catch (error) {
      setParsed({
        headers: [],
        rows: [],
        error:
          error instanceof Error ? error.message : "Could not read CSV file.",
      })
    } finally {
      event.target.value = ""
      setIsPending(false)
    }
  }

  function stepZoom(direction: -1 | 1) {
    const index = ZOOM_OPTIONS.indexOf(zoom)
    const nextIndex = Math.min(
      ZOOM_OPTIONS.length - 1,
      Math.max(0, index + direction)
    )
    setZoom(ZOOM_OPTIONS[nextIndex])
  }

  return (
    <div
      className={cn(
        "flex h-[560px] w-full flex-col overflow-hidden bg-background",
        className
      )}
    >
      <GlideDataGridCriticalStyles />
      <div className="flex min-h-12 items-center justify-end gap-3 border-b px-3">
        <TooltipProvider>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <ToolbarTooltip label="Zoom out">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom out"
                disabled={zoom <= ZOOM_OPTIONS[0]}
                onClick={() => stepZoom(-1)}
              >
                <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Select
              value={zoom.toString()}
              onValueChange={(value) =>
                setZoom(Number(value) as (typeof ZOOM_OPTIONS)[number])
              }
            >
              <SelectTrigger
                size="sm"
                className="w-[84px] min-w-[84px]"
                aria-label="Zoom level"
              >
                <SelectValue>{Math.round(zoom * 100)}%</SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {ZOOM_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {Math.round(option * 100)}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ToolbarTooltip label="Zoom in">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Zoom in"
                disabled={zoom >= ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]}
                onClick={() => stepZoom(1)}
              >
                <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <Separator
              orientation="vertical"
              className="mx-1 h-4 self-center"
            />
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.tsv,text/csv,text/tab-separated-values"
              className="hidden"
              onChange={handleUpload}
            />
            <ToolbarTooltip label="Upload CSV">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Upload CSV"
                loading={isPending}
                onClick={() => inputRef.current?.click()}
              >
                <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
          </div>
        </TooltipProvider>
      </div>
      <div className="min-h-0 flex-1">
        {parsed.error ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-destructive">
            {parsed.error}
          </div>
        ) : parsed.rows.length === 0 ? (
          <div className="grid h-full place-items-center bg-muted/30 p-4">
            <div className="max-w-md rounded-lg border bg-background p-4 text-center text-sm shadow-xs">
              <p className="font-medium">Upload a CSV to preview</p>
              <p className="mt-1 text-muted-foreground">
                Pass delimited text with the <code>data</code> prop or upload a
                CSV file.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                loading={isPending}
                onClick={() => inputRef.current?.click()}
              >
                <HugeiconsIcon icon={Upload01Icon} className="size-4" />
                Upload CSV
              </Button>
            </div>
          </div>
        ) : !glide ? (
          <div className="grid h-full place-items-center bg-background">
            <Spinner className="size-4" />
          </div>
        ) : (
          <glide.DataEditor
            key={zoom}
            columns={columns}
            rows={parsed.rows.length}
            getCellContent={getCellContent}
            rowMarkers="number"
            rowSelectionMode="multi"
            keybindings={{ search: true }}
            smoothScrollX
            smoothScrollY
            getCellsForSelection
            width="100%"
            height="100%"
            theme={theme}
            rowHeight={scale(34)}
            headerHeight={scale(36)}
          />
        )}
      </div>
    </div>
  )
}
