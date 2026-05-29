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
  type XlsxTableHeaderMenuRenderProps,
} from "@extend-ai/react-xlsx"
import {
  Add01Icon,
  Delete02Icon,
  Download01Icon,
  MinusSignCircleIcon,
  Moon02Icon,
  PlusSignCircleIcon,
  Redo02Icon,
  Sun03Icon,
  Undo02Icon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
  useWorkbookNightRenderPreference,
  WorkbookSheetTabs,
  WorkbookTableHeaderMenu,
} from "@/components/ui/xlsx-viewer"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/new-york-v4/ui/tooltip"

const XLSX_LOADING_INDICATOR_DELAY_MS = 300
const XLSX_EDITOR_READ_ONLY_THRESHOLD_BYTES = 5 * 1024 * 1024
const XLSX_DROPDOWN_Z_INDEX_CLASS = "z-[100010]"
const ZOOM_OPTIONS = [50, 75, 100, 125, 150, 200, 400] as const
const XLSX_EDITOR_INPUT_CHROME_CLASS =
  "shadow-none before:shadow-none not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-none dark:not-has-disabled:not-has-focus-visible:not-has-aria-invalid:before:shadow-none"
const XLSX_EDITOR_SELECT_CHROME_CLASS =
  "shadow-none before:shadow-none not-data-disabled:not-focus-visible:not-aria-invalid:not-data-pressed:before:shadow-none dark:not-data-disabled:not-focus-visible:not-aria-invalid:not-data-pressed:before:shadow-none"

type UploadedWorkbook = {
  buffer: ArrayBuffer
  fileName: string
  identity: string
}

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
    setActiveSheetIndex,
    sheets,
  } = useXlsxViewer()
  const { activeCell, activeCellAddress, selection } = useXlsxViewerSelection()
  const {
    addSheet,
    canRedo,
    canUndo,
    mergeSelection,
    readOnly,
    redo,
    removeActiveSheet,
    selectedFormula,
    selectedValue,
    setCellFormula,
    setCellValue,
    undo,
    unmergeSelection,
  } = useXlsxViewerEditing()
  const { canZoomIn, canZoomOut, setZoomScale, zoomIn, zoomOut, zoomScale } =
    useXlsxViewerZoom()
  const [formulaDraft, setFormulaDraft] = React.useState("")
  const [formulaFocused, setFormulaFocused] = React.useState(false)
  const formulaEditCellRef = React.useRef<typeof activeCell>(null)
  const formulaInitialValueRef = React.useRef("")
  const hasWorkbook = sheets.length > 0
  const hasSelection = Boolean(selection)
  const hasActiveCell = Boolean(activeCell)
  const currentZoom = Math.round(zoomScale)
  const selectedCellInputValue = selectedFormula || selectedValue

  React.useEffect(() => {
    if (formulaFocused) return
    setFormulaDraft(selectedCellInputValue)
  }, [formulaFocused, selectedCellInputValue, activeCellAddress])

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
            <ToolbarTooltip label="Export workbook">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Export workbook"
                disabled={!canExport}
                onClick={exportXlsx}
              >
                <HugeiconsIcon icon={Download01Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Upload XLSX">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Upload XLSX"
                onClick={onUploadClick}
              >
                <HugeiconsIcon icon={Upload01Icon} className="size-4" />
              </Button>
            </ToolbarTooltip>
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
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasSelection || readOnly}
              onClick={mergeSelection}
            >
              Merge
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasSelection || readOnly}
              onClick={unmergeSelection}
            >
              Unmerge
            </Button>
          </div>
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
          <div className="flex shrink-0 items-center gap-1">
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
        <div className="flex items-center gap-0 border-t bg-background px-2 py-1">
          <Input
            className={cn(
              "h-8 w-[92px] shrink-0 rounded-r-none border-r-0 font-mono text-xs",
              XLSX_EDITOR_INPUT_CHROME_CLASS
            )}
            readOnly
            value={activeCellAddress ?? ""}
          />
          <div className="-mx-px flex h-8 w-9 shrink-0 items-center justify-center border border-input bg-muted/30 text-[11px] font-semibold text-muted-foreground italic">
            fx
          </div>
          <Input
            className={cn(
              "h-8 flex-1 rounded-l-none border-l-0",
              XLSX_EDITOR_INPUT_CHROME_CLASS
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
  rounded,
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
  rounded: boolean
  showNightRenderToggle: boolean
  workbookIdentity: string
}) {
  const { error } = useXlsxViewer()

  return (
    <div
      className={cn(
        "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
        className,
        rounded && "rounded-lg"
      )}
    >
      <EditorToolbar
        isDark={isDark}
        onIsDarkChange={onIsDarkChange}
        onUploadClick={onUploadClick}
        showNightRenderToggle={showNightRenderToggle}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <ScrollArea
          orientation="both"
          className="min-h-0 flex-1 bg-muted/20"
          viewportClassName="min-h-0"
        >
          <XlsxViewer
            experimentalCanvas
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
            errorState={
              <div className="grid h-full w-full min-w-full place-items-center p-6 text-sm text-destructive">
                {error?.message ?? "Unable to edit workbook."}
              </div>
            }
            renderTableHeaderMenu={renderTableHeaderMenu}
          />
        </ScrollArea>
        <WorkbookSheetTabs workbookIdentity={workbookIdentity} />
      </div>
    </div>
  )
}

export function XlsxEditorPreview({
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
    useWorkbookNightRenderPreference()
  const isViewerHydrated = resolvedTheme !== undefined && nightRenderPrefLoaded
  const shouldShowHydrationSpinner = useDelayedLoadingIndicator(
    !isViewerHydrated,
    XLSX_LOADING_INDICATOR_DELAY_MS
  )

  if (!isViewerHydrated) {
    return (
      <div
        className={cn(
          "flex h-[640px] min-h-0 flex-col overflow-hidden bg-background",
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
    <XlsxEditorContent
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

function XlsxEditorContent({
  className,
  effectiveIsDark,
  fileName,
  rounded,
  setNightRenderEnabled,
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
        rounded={rounded}
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
  rounded,
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
  rounded: boolean
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
        rounded={rounded}
        showNightRenderToggle={showNightRenderToggle}
        workbookIdentity={workbookIdentity}
      />
    </XlsxViewerProvider>
  )
}
