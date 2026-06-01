"use client"

import * as React from "react"
import dynamic from "next/dynamic"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"

const SAMPLE_CSV = `Invoice,Customer,Status,Amount,Submitted
INV-1001,Northstar Supply,Approved,4280.50,2026-04-28
INV-1002,Bluebird Medical,Needs review,1190.00,2026-04-29
INV-1003,Aster Logistics,Approved,845.75,2026-04-30
INV-1004,Juniper Foods,Exception,3499.99,2026-05-01
INV-1005,Keystone Labs,Approved,920.10,2026-05-02
INV-1006,Monarch Studio,Processing,1510.45,2026-05-03
INV-1007,Orchard Bank,Approved,7820.00,2026-05-04
INV-1008,Riverstone Energy,Needs review,632.25,2026-05-05
INV-1009,Summit Health,Approved,2730.00,2026-05-06
INV-1010,Westhaven Legal,Processing,410.80,2026-05-07`

function ViewerPreviewLoading() {
  return (
    <div className="grid h-[560px] place-items-center bg-background">
      <Spinner className="size-4" />
    </div>
  )
}

const CsvViewer = dynamic(
  () => import("@/components/ui/csv-viewer").then((mod) => mod.CsvViewer),
  {
    ssr: false,
    loading: () => <ViewerPreviewLoading />,
  }
)

export function CsvViewerPreviewClient() {
  return <CsvViewer data={SAMPLE_CSV} />
}

export function CsvViewerDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <CsvViewer data={SAMPLE_CSV} />
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={csvViewerUsageCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={csvViewerUsageCode}
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

const csvViewerUsageCode = `"use client";

import { CsvViewer } from "@/components/ui/csv-viewer";

const data = \`Invoice,Customer,Status,Amount
INV-1001,Northstar Supply,Approved,4280.50
INV-1002,Bluebird Medical,Needs review,1190.00\`;

export function CsvViewerExample() {
  return <CsvViewer data={data} />;
}`

const csvViewerSourceCode =
  '"use client"\n\nimport * as React from "react"\nimport type * as GlideDataGrid from "@glideapps/glide-data-grid"\nimport type {\n  GridCell,\n  GridCellKind,\n  GridColumn,\n  Item,\n  Theme,\n} from "@glideapps/glide-data-grid"\nimport {\n  MinusSignCircleIcon,\n  PlusSignCircleIcon,\n  Upload01Icon,\n} from "@hugeicons/core-free-icons"\nimport { HugeiconsIcon } from "@hugeicons/react"\nimport Papa from "papaparse"\n\nimport { cn } from "@/lib/utils"\nimport { Button } from "@/components/ui/button"\nimport {\n  Select,\n  SelectContent,\n  SelectItem,\n  SelectTrigger,\n  SelectValue,\n} from "@/components/ui/select"\nimport { Spinner } from "@/components/ui/spinner"\nimport { Separator } from "@/registry/new-york-v4/ui/separator"\nimport {\n  Tooltip,\n  TooltipContent,\n  TooltipProvider,\n  TooltipTrigger,\n} from "@/registry/new-york-v4/ui/tooltip"\n\nconst ZOOM_OPTIONS = [0.75, 1, 1.25, 1.5, 2] as const\n\ntype GlideDataGridModule = typeof GlideDataGrid\ntype CsvViewerProps = {\n  className?: string\n  data?: string\n}\n\nfunction toDisplayString(value: unknown): string {\n  return value === null || value === undefined ? "" : String(value)\n}\n\nfunction normalizeHeaderTitle(header: string, index: number): string {\n  const trimmed = header.trim()\n  return trimmed.length > 0 ? trimmed : `Column ${index + 1}`\n}\n\nfunction parseDelimitedText(text: string): {\n  headers: string[]\n  rows: string[][]\n  error: string | null\n} {\n  const results = Papa.parse<Record<string, unknown>>(text, {\n    header: true,\n    skipEmptyLines: "greedy",\n  })\n\n  const objectRows = Array.isArray(results.data)\n    ? results.data.filter(\n        (row): row is Record<string, unknown> =>\n          !!row && typeof row === "object" && !Array.isArray(row)\n      )\n    : []\n  const metaFields = Array.isArray(results.meta.fields)\n    ? results.meta.fields.map((field) => String(field))\n    : []\n  const fieldKeys =\n    metaFields.length > 0\n      ? metaFields\n      : Object.keys(objectRows[0] ?? {}).filter(\n          (key) => key !== "__parsed_extra"\n        )\n  const extraColumnCount = objectRows.reduce((maxCount, row) => {\n    const extras = row.__parsed_extra\n    return Array.isArray(extras) ? Math.max(maxCount, extras.length) : maxCount\n  }, 0)\n  const headers = [\n    ...fieldKeys.map((field, index) => normalizeHeaderTitle(field, index)),\n    ...Array.from(\n      { length: extraColumnCount },\n      (_, index) => `Extra ${index + 1}`\n    ),\n  ]\n\n  const rows = objectRows.map((row) => {\n    const baseValues = fieldKeys.map((fieldKey) =>\n      toDisplayString(row[fieldKey])\n    )\n    const extras = Array.isArray(row.__parsed_extra)\n      ? row.__parsed_extra.map((value) => toDisplayString(value))\n      : []\n    const paddedExtras =\n      extras.length >= extraColumnCount\n        ? extras.slice(0, extraColumnCount)\n        : [\n            ...extras,\n            ...Array.from(\n              { length: extraColumnCount - extras.length },\n              () => ""\n            ),\n          ]\n\n    return [...baseValues, ...paddedExtras]\n  })\n\n  const firstError =\n    Array.isArray(results.errors) && results.errors.length > 0\n      ? results.errors[0]\n      : null\n\n  return {\n    headers,\n    rows,\n    error:\n      rows.length === 0 && firstError\n        ? String(firstError.message ?? "Could not parse CSV file.")\n        : null,\n  }\n}\n\nfunction ToolbarTooltip({\n  label,\n  children,\n}: {\n  label: string\n  children: React.ReactNode\n}) {\n  return (\n    <Tooltip>\n      <TooltipTrigger asChild>\n        <span className="inline-flex">{children}</span>\n      </TooltipTrigger>\n      <TooltipContent side="bottom">{label}</TooltipContent>\n    </Tooltip>\n  )\n}\n\nfunction readIsDarkTheme() {\n  return (\n    typeof document !== "undefined" &&\n    document.documentElement.classList.contains("dark")\n  )\n}\n\nfunction useIsDarkTheme() {\n  const [isDark, setIsDark] = React.useState(readIsDarkTheme)\n\n  React.useEffect(() => {\n    if (typeof document === "undefined") return\n\n    const updateTheme = () => setIsDark(readIsDarkTheme())\n\n    updateTheme()\n\n    if (typeof MutationObserver === "undefined") return\n\n    const observer = new MutationObserver(updateTheme)\n    observer.observe(document.documentElement, {\n      attributes: true,\n      attributeFilter: ["class"],\n    })\n\n    return () => observer.disconnect()\n  }, [])\n\n  return isDark\n}\n\nexport function CsvViewer({ className, data }: CsvViewerProps) {\n  const inputRef = React.useRef<HTMLInputElement | null>(null)\n  const isDark = useIsDarkTheme()\n  const [glide, setGlide] = React.useState<GlideDataGridModule | null>(null)\n  const [zoom, setZoom] = React.useState<(typeof ZOOM_OPTIONS)[number]>(1)\n  const [parsed, setParsed] = React.useState(() =>\n    data ? parseDelimitedText(data) : { headers: [], rows: [], error: null }\n  )\n  const [isPending, setIsPending] = React.useState(false)\n\n  React.useEffect(() => {\n    if (data) {\n      setParsed(parseDelimitedText(data))\n    }\n  }, [data])\n\n  React.useEffect(() => {\n    let mounted = true\n\n    void import("@glideapps/glide-data-grid").then((module) => {\n      if (mounted) {\n        setGlide(module)\n      }\n    })\n\n    return () => {\n      mounted = false\n    }\n  }, [])\n\n  const columnCount = Math.max(1, parsed.headers.length)\n  const scale = React.useCallback(\n    (value: number) => Math.round(value * zoom),\n    [zoom]\n  )\n\n  const theme = React.useMemo<Partial<Theme>>(\n    () => ({\n      accentColor: isDark ? "#60a5fa" : "#2563eb",\n      accentLight: isDark ? "#1d4ed826" : "#dbeafe",\n      accentFg: "#ffffff",\n      textDark: isDark ? "#e5e5e5" : "#171717",\n      textMedium: isDark ? "#a3a3a3" : "#525252",\n      textLight: isDark ? "#737373" : "#a3a3a3",\n      textBubble: isDark ? "#f5f5f5" : "#171717",\n      textHeader: isDark ? "#f5f5f5" : "#171717",\n      textGroupHeader: isDark ? "#a3a3a3" : "#525252",\n      bgCell: isDark ? "#0a0a0a" : "#ffffff",\n      bgCellMedium: isDark ? "#171717" : "#fafafa",\n      bgHeader: isDark ? "#171717" : "#fafafa",\n      bgHeaderHasFocus: isDark ? "#262626" : "#f5f5f5",\n      bgHeaderHovered: isDark ? "#262626" : "#f5f5f5",\n      borderColor: isDark ? "#262626" : "#e5e5e5",\n      horizontalBorderColor: isDark ? "#262626" : "#e5e5e5",\n      cellHorizontalPadding: scale(8),\n      cellVerticalPadding: Math.max(2, scale(3)),\n      headerIconSize: scale(18),\n      baseFontStyle: `${scale(13)}px`,\n      headerFontStyle: `600 ${scale(13)}px`,\n      markerFontStyle: `${scale(11)}px`,\n      fontFamily: \'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif\',\n      editorFontSize: `${scale(13)}px`,\n    }),\n    [isDark, scale]\n  )\n\n  const columns = React.useMemo<GridColumn[]>(\n    () =>\n      Array.from({ length: columnCount }, (_, index) => ({\n        id: `column-${index}`,\n        title: parsed.headers[index] ?? `Column ${index + 1}`,\n        width: scale(index === 0 ? 180 : 160),\n      })),\n    [columnCount, parsed.headers, scale]\n  )\n\n  const getCellContent = React.useCallback(\n    ([col, row]: Item): GridCell => {\n      const value = parsed.rows[row]?.[col] ?? ""\n      const textKind = glide?.GridCellKind.Text as GridCellKind.Text\n\n      return {\n        kind: textKind,\n        data: value,\n        displayData: value,\n        allowOverlay: true,\n        readonly: true,\n      }\n    },\n    [glide, parsed.rows]\n  )\n\n  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {\n    const file = event.target.files?.[0]\n    if (!file) return\n\n    setIsPending(true)\n    try {\n      const text = await file.text()\n      setParsed(parseDelimitedText(text))\n    } catch (error) {\n      setParsed({\n        headers: [],\n        rows: [],\n        error:\n          error instanceof Error ? error.message : "Could not read CSV file.",\n      })\n    } finally {\n      event.target.value = ""\n      setIsPending(false)\n    }\n  }\n\n  function stepZoom(direction: -1 | 1) {\n    const index = ZOOM_OPTIONS.indexOf(zoom)\n    const nextIndex = Math.min(\n      ZOOM_OPTIONS.length - 1,\n      Math.max(0, index + direction)\n    )\n    setZoom(ZOOM_OPTIONS[nextIndex])\n  }\n\n  return (\n    <div\n      className={cn(\n        "flex h-[560px] w-full flex-col overflow-hidden bg-background",\n        className\n      )}\n    >\n      <div className="flex min-h-12 items-center justify-end gap-3 border-b px-3">\n        <TooltipProvider>\n          <div className="ml-auto flex shrink-0 items-center gap-1">\n            <ToolbarTooltip label="Zoom out">\n              <Button\n                variant="ghost"\n                size="icon-sm"\n                aria-label="Zoom out"\n                disabled={zoom <= ZOOM_OPTIONS[0]}\n                onClick={() => stepZoom(-1)}\n              >\n                <HugeiconsIcon icon={MinusSignCircleIcon} className="size-4" />\n              </Button>\n            </ToolbarTooltip>\n            <Select\n              value={zoom.toString()}\n              onValueChange={(value) =>\n                setZoom(Number(value) as (typeof ZOOM_OPTIONS)[number])\n              }\n              modal={false}\n            >\n              <SelectTrigger\n                size="sm"\n                className="w-[84px] min-w-[84px]"\n                aria-label="Zoom level"\n              >\n                <SelectValue>{Math.round(zoom * 100)}%</SelectValue>\n              </SelectTrigger>\n              <SelectContent align="end" alignItemWithTrigger={false}>\n                {ZOOM_OPTIONS.map((option) => (\n                  <SelectItem key={option} value={option.toString()}>\n                    {Math.round(option * 100)}%\n                  </SelectItem>\n                ))}\n              </SelectContent>\n            </Select>\n            <ToolbarTooltip label="Zoom in">\n              <Button\n                variant="ghost"\n                size="icon-sm"\n                aria-label="Zoom in"\n                disabled={zoom >= ZOOM_OPTIONS[ZOOM_OPTIONS.length - 1]}\n                onClick={() => stepZoom(1)}\n              >\n                <HugeiconsIcon icon={PlusSignCircleIcon} className="size-4" />\n              </Button>\n            </ToolbarTooltip>\n            <Separator\n              orientation="vertical"\n              className="mx-1 h-4 self-center"\n            />\n            <input\n              ref={inputRef}\n              type="file"\n              accept=".csv,.tsv,text/csv,text/tab-separated-values"\n              className="hidden"\n              onChange={handleUpload}\n            />\n            <ToolbarTooltip label="Upload CSV">\n              <Button\n                variant="ghost"\n                size="icon-sm"\n                aria-label="Upload CSV"\n                loading={isPending}\n                onClick={() => inputRef.current?.click()}\n              >\n                <HugeiconsIcon icon={Upload01Icon} className="size-4" />\n              </Button>\n            </ToolbarTooltip>\n          </div>\n        </TooltipProvider>\n      </div>\n      <div className="min-h-0 flex-1">\n        {parsed.error ? (\n          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-destructive">\n            {parsed.error}\n          </div>\n        ) : parsed.rows.length === 0 ? (\n          <div className="grid h-full place-items-center bg-muted/30 p-4">\n            <div className="max-w-md rounded-lg border bg-background p-4 text-center text-sm shadow-xs">\n              <p className="font-medium">Upload a CSV to preview</p>\n              <p className="mt-1 text-muted-foreground">\n                Pass delimited text with the <code>data</code> prop or upload a\n                CSV file.\n              </p>\n              <Button\n                type="button"\n                variant="outline"\n                size="sm"\n                className="mt-4"\n                loading={isPending}\n                onClick={() => inputRef.current?.click()}\n              >\n                <HugeiconsIcon icon={Upload01Icon} className="size-4" />\n                Upload CSV\n              </Button>\n            </div>\n          </div>\n        ) : !glide ? (\n          <div className="grid h-full place-items-center bg-background">\n            <Spinner className="size-4" />\n          </div>\n        ) : (\n          <glide.DataEditor\n            key={zoom}\n            columns={columns}\n            rows={parsed.rows.length}\n            getCellContent={getCellContent}\n            rowMarkers="number"\n            rowSelectionMode="multi"\n            keybindings={{ search: true }}\n            smoothScrollX\n            smoothScrollY\n            getCellsForSelection\n            width="100%"\n            height="100%"\n            theme={theme}\n            rowHeight={scale(34)}\n            headerHeight={scale(36)}\n          />\n        )}\n      </div>\n    </div>\n  )\n}\n'

export function CsvViewerSource() {
  return <HighlightedCodeBlock code={csvViewerSourceCode} />
}
