"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  CodeIcon,
  FullScreenIcon,
  LaptopIcon,
  Refresh01Icon,
  SmartPhone01Icon,
  Tablet01Icon,
  TerminalIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { prepareFileTreeInput } from "@pierre/trees"
import { FileTree as PierreFileTree, useFileTree } from "@pierre/trees/react"
import { useVirtualizer } from "@tanstack/react-virtual"
import type { PanelImperativeHandle } from "react-resizable-panels"

import {
  PDF_VIEWER_BLOCKS,
  type PdfViewerBlockId,
  type PdfViewerBlockMetadata,
} from "@/lib/pdf-viewer-blocks"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useMounted } from "@/hooks/use-mounted"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { CopyButton, copyToClipboardWithMeta } from "@/components/copy-button"
import {
  DocumentSplitsBlock,
  XlsxDocumentSplitsBlock,
} from "@/components/document-splitter-docs"
import { DocxEditorBlock } from "@/components/docx-editor-docs"
import { ESignatureBlock } from "@/components/e-signature-docs"
import { HumanReviewBlock } from "@/components/human-review-docs"
import { PdfDropzoneBlock } from "@/components/pdf-dropzone-block"

type BlockCodeSample = {
  sourcePath: string
  targetPath: string
  language: string
}

type LoadedBlockCodeSample = BlockCodeSample & {
  content: string
  highlightedContent: string | null
  lineCount: number
}

type PdfViewerBlock = PdfViewerBlockMetadata & {
  component: React.ComponentType
}

type BlockViewportSize = "desktop" | "tablet" | "mobile"
type BlockView = "preview" | "code"

const blockViewportSizes: Array<{
  id: BlockViewportSize
  label: string
  panelSize: number
  icon: typeof LaptopIcon
}> = [
  { id: "desktop", label: "Desktop", panelSize: 100, icon: LaptopIcon },
  { id: "tablet", label: "Tablet", panelSize: 62, icon: Tablet01Icon },
  { id: "mobile", label: "Mobile", panelSize: 34, icon: SmartPhone01Icon },
]

const BLOCK_VIEWPORT_HEIGHT_CLASS = "h-[680px]"

const OcrBlocksBlock = dynamic(
  () =>
    import("@/components/ocr-blocks-docs").then((mod) => mod.OcrBlocksBlock),
  {
    loading: () => <BlockPreviewPlaceholder />,
  }
)

const blockComponents = {
  "human-review": HumanReviewBlock,
  "pdf-dropzone": PdfDropzoneBlock,
  "ocr-blocks": OcrBlocksBlock,
  "e-signature": ESignatureBlock,
  "document-splits": DocumentSplitsBlock,
  "excel-document-splits": XlsxDocumentSplitsBlock,
  "docx-editor-block": DocxEditorBlock,
} satisfies Record<PdfViewerBlockId, React.ComponentType>

const pdfViewerBlocks: PdfViewerBlock[] = PDF_VIEWER_BLOCKS.map((block) => ({
  ...block,
  component: blockComponents[block.id],
}))

export function PdfViewerBlocks({
  codeSamples,
}: {
  codeSamples: Record<string, BlockCodeSample[]>
}) {
  return (
    <section className="space-y-12">
      {pdfViewerBlocks.map((block) => (
        <PdfViewerBlockPreview
          key={block.id}
          block={block}
          codeSamples={codeSamples[block.id] ?? []}
        />
      ))}
    </section>
  )
}

function PdfViewerBlockPreview({
  block,
  codeSamples,
}: {
  block: (typeof pdfViewerBlocks)[number]
  codeSamples: BlockCodeSample[]
}) {
  const [previewKey, setPreviewKey] = React.useState(0)
  const [view, setView] = React.useState<BlockView>("preview")
  const [hasOpenedCode, setHasOpenedCode] = React.useState(false)
  const [activeViewport, setActiveViewport] =
    React.useState<BlockViewportSize>("desktop")
  const [isCommandCopied, setIsCommandCopied] = React.useState(false)
  const [activeFile, setActiveFile] = React.useState<string | null>(
    codeSamples[0]?.targetPath ?? null
  )
  const isMounted = useMounted()
  const previewPanelRef = React.useRef<PanelImperativeHandle>(null)
  const codePanelMountFrameRef = React.useRef<number | null>(null)
  const Preview = block.component
  const isDesktopViewport = useMediaQuery("(min-width: 768px)")
  const previewHeightClassName =
    block.previewHeightClassName ?? BLOCK_VIEWPORT_HEIGHT_CLASS

  const scheduleCodePanelMount = React.useCallback(() => {
    if (hasOpenedCode || codePanelMountFrameRef.current !== null) return

    codePanelMountFrameRef.current = window.requestAnimationFrame(() => {
      codePanelMountFrameRef.current = window.requestAnimationFrame(() => {
        codePanelMountFrameRef.current = null
        setHasOpenedCode(true)
      })
    })
  }, [hasOpenedCode])

  function setBlockView(nextView: BlockView) {
    if (nextView === "code" && !hasOpenedCode) {
      setView(nextView)
      scheduleCodePanelMount()
      return
    }

    setView(nextView)
  }

  function resizeViewport(viewport: (typeof blockViewportSizes)[number]) {
    setView("preview")
    setActiveViewport(viewport.id)
    previewPanelRef.current?.resize(`${viewport.panelSize}%`)
  }

  React.useEffect(() => {
    return () => {
      if (codePanelMountFrameRef.current !== null) {
        window.cancelAnimationFrame(codePanelMountFrameRef.current)
      }
    }
  }, [])

  React.useEffect(() => {
    if (!isCommandCopied) return

    const timer = window.setTimeout(() => setIsCommandCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [isCommandCopied])

  React.useEffect(() => {
    if (!codeSamples.length) {
      setActiveFile(null)
      return
    }

    if (
      !activeFile ||
      !codeSamples.some((sample) => sample.targetPath === activeFile)
    ) {
      setActiveFile(codeSamples[0]?.targetPath ?? null)
    }
  }, [activeFile, codeSamples])

  async function copyInstallCommand() {
    const copied = await copyToClipboardWithMeta(block.command, {
      name: "copy_registry_add_command",
      properties: {
        block: block.id,
        command: block.command,
      },
    })

    if (copied) {
      setIsCommandCopied(true)
    }
  }

  return (
    <article id={block.id} className="scroll-mt-24 space-y-2">
      <div
        data-view={view}
        className="group/block-preview overflow-hidden rounded-xl"
      >
        <div className="flex min-h-11 flex-wrap items-center gap-2 px-2 pb-2">
          <BlockViewToggle view={view} onViewChange={setBlockView} />
          <a
            href={`#${block.id}`}
            className="min-w-0 flex-1 truncate text-sm font-medium underline-offset-2 hover:underline"
          >
            {block.title}
          </a>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border bg-background p-0.5 sm:flex">
              {blockViewportSizes.map((viewport) => (
                <Button
                  key={viewport.id}
                  type="button"
                  variant={
                    activeViewport === viewport.id ? "secondary" : "ghost"
                  }
                  size="icon-sm"
                  className="size-7"
                  title={viewport.label}
                  aria-label={`${viewport.label} viewport`}
                  onClick={() => resizeViewport(viewport)}
                >
                  <HugeiconsIcon icon={viewport.icon} className="size-4" />
                </Button>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                title="Open Fullscreen Preview"
                aria-label={`Open ${block.title} fullscreen preview`}
                render={<Link href={block.viewHref} target="_blank" />}
              >
                <HugeiconsIcon icon={FullScreenIcon} className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="size-7"
                title="Refresh Preview"
                aria-label={`Refresh ${block.title} preview`}
                onClick={() => setPreviewKey((value) => value + 1)}
              >
                <HugeiconsIcon icon={Refresh01Icon} className="size-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden max-w-[24rem] min-w-0 gap-1 px-2 shadow-none lg:flex"
              aria-label={
                isCommandCopied
                  ? "Copied install command"
                  : "Copy install command"
              }
              onClick={copyInstallCommand}
            >
              <HugeiconsIcon
                icon={isCommandCopied ? Tick02Icon : TerminalIcon}
                className="size-4 shrink-0"
              />
              <span className="truncate font-mono text-xs">
                {block.command}
              </span>
            </Button>
          </div>
        </div>
        <div className={view === "preview" ? "block" : "hidden"}>
          <div
            className={`relative hidden ${previewHeightClassName} box-content overflow-hidden rounded-xl border bg-muted/30 md:block`}
          >
            <div className="absolute inset-0 right-4 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <ResizablePanelGroup
              orientation="horizontal"
              className="relative z-10 h-full"
            >
              <ResizablePanel
                ref={previewPanelRef}
                defaultSize="100%"
                minSize="30%"
                className="min-w-0 overflow-hidden rounded-xl bg-background"
              >
                <BlockPreviewSurface
                  Preview={Preview}
                  isMounted={isMounted}
                  previewKey={previewKey}
                  shouldRenderPreview={isDesktopViewport}
                />
              </ResizablePanel>
              <ResizableHandle className="relative w-3 bg-transparent p-0 after:absolute after:top-1/2 after:right-0 after:h-8 after:w-1.5 after:-translate-y-1/2 after:rounded-full after:bg-border after:transition-all after:hover:h-10" />
              <ResizablePanel defaultSize="0%" minSize="0%" />
            </ResizablePanelGroup>
          </div>
          <div className="overflow-hidden rounded-xl border bg-background md:hidden">
            <BlockPreviewSurface
              Preview={Preview}
              isMounted={isMounted}
              previewKey={previewKey}
              shouldRenderPreview={!isDesktopViewport}
            />
          </div>
        </div>
        {view === "code" && !hasOpenedCode ? <BlockCodePanelShell /> : null}
        {hasOpenedCode ? (
          <div className={view === "code" ? "block" : "hidden"}>
            <BlockCodePanel
              blockId={block.id}
              codeSamples={codeSamples}
              activeFile={activeFile}
              onActiveFileChange={setActiveFile}
            />
          </div>
        ) : null}
      </div>
    </article>
  )
}

function BlockPreviewPlaceholder() {
  return <div className="h-full min-h-[560px] bg-muted/20" />
}

function BlockViewToggle({
  view,
  onViewChange,
}: {
  view: BlockView
  onViewChange: (view: BlockView) => void
}) {
  return (
    <div
      role="tablist"
      aria-label="Block view"
      className="flex w-fit items-center gap-0.5 rounded-lg bg-muted p-0.5 text-muted-foreground/72"
    >
      {(["preview", "code"] as const).map((item) => {
        const isActive = view === item

        return (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(
              "flex h-8 items-center justify-center rounded-md px-2.5 text-sm font-medium whitespace-nowrap transition-colors outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring",
              isActive &&
                "bg-background text-foreground shadow-sm/5 dark:bg-input"
            )}
            onClick={() => onViewChange(item)}
          >
            {item === "preview" ? "Preview" : "Code"}
          </button>
        )
      })}
    </div>
  )
}

const BlockPreviewSurface = React.memo(function BlockPreviewSurface({
  Preview,
  isMounted,
  previewKey,
  shouldRenderPreview,
}: {
  Preview: React.ComponentType
  isMounted: boolean
  previewKey: number
  shouldRenderPreview: boolean
}) {
  if (!isMounted || !shouldRenderPreview) {
    return <BlockPreviewPlaceholder />
  }

  return <Preview key={previewKey} />
})

function BlockCodePanelShell() {
  return (
    <div
      className={`flex ${BLOCK_VIEWPORT_HEIGHT_CLASS} overflow-hidden rounded-xl border bg-code text-code-foreground`}
    >
      <div className="hidden w-72 shrink-0 border-r bg-code md:block">
        <div className="flex h-12 items-center border-b px-4 text-sm font-medium">
          Files
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="h-12 border-b" />
      </div>
    </div>
  )
}

function BlockCodePanel({
  blockId,
  codeSamples,
  activeFile,
  onActiveFileChange,
}: {
  blockId: string
  codeSamples: BlockCodeSample[]
  activeFile: string | null
  onActiveFileChange: (file: string) => void
}) {
  const [loadedCodeByPath, setLoadedCodeByPath] = React.useState<
    Record<string, LoadedBlockCodeSample>
  >({})
  const [loadingPath, setLoadingPath] = React.useState<string | null>(null)
  const [failedPath, setFailedPath] = React.useState<string | null>(null)
  const activeCodeSample =
    codeSamples.find((sample) => sample.targetPath === activeFile) ??
    codeSamples[0]
  const activeLoadedCode = activeCodeSample
    ? loadedCodeByPath[activeCodeSample.targetPath]
    : undefined

  React.useEffect(() => {
    if (!activeCodeSample || activeLoadedCode) return

    const controller = new AbortController()
    const targetPath = activeCodeSample.targetPath

    setLoadingPath(targetPath)
    setFailedPath(null)

    async function loadCode() {
      try {
        const response = await fetch(
          `/api/block-code?block=${encodeURIComponent(
            blockId
          )}&file=${encodeURIComponent(targetPath)}`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error(`Failed to load ${targetPath}`)
        }

        const loadedCode = (await response.json()) as LoadedBlockCodeSample

        setLoadedCodeByPath((current) => ({
          ...current,
          [targetPath]: loadedCode,
        }))
      } catch (error) {
        if (controller.signal.aborted) return

        console.error(error)
        setFailedPath(targetPath)
      } finally {
        if (!controller.signal.aborted) {
          setLoadingPath((current) => (current === targetPath ? null : current))
        }
      }
    }

    void loadCode()

    return () => controller.abort()
  }, [activeCodeSample, activeLoadedCode, blockId])

  if (!activeCodeSample) {
    return (
      <div
        className={`grid ${BLOCK_VIEWPORT_HEIGHT_CLASS} place-items-center rounded-xl border bg-code text-sm text-code-foreground`}
      >
        No source sample available.
      </div>
    )
  }

  return (
    <div
      className={`flex ${BLOCK_VIEWPORT_HEIGHT_CLASS} overflow-hidden rounded-xl border bg-code text-code-foreground`}
    >
      <div className="hidden w-72 shrink-0 border-r bg-code md:block">
        <div className="flex h-12 items-center border-b px-4 text-sm font-medium">
          Files
        </div>
        <BlockFileTree
          codeSamples={codeSamples}
          activeFile={activeCodeSample.targetPath}
          onActiveFileChange={onActiveFileChange}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center gap-2 border-b px-4 text-sm">
          <HugeiconsIcon icon={CodeIcon} className="size-4 opacity-70" />
          <span className="truncate">{activeCodeSample.targetPath}</span>
          <CopyButton
            value={activeLoadedCode?.content ?? ""}
            className="static ml-auto size-7 bg-transparent"
            disabled={!activeLoadedCode}
            event="copy_block_code"
          />
        </div>
        <BlockCodeContent
          code={activeLoadedCode}
          failed={failedPath === activeCodeSample.targetPath}
          loading={
            loadingPath === activeCodeSample.targetPath && !activeLoadedCode
          }
        />
      </div>
    </div>
  )
}

function BlockCodeContent({
  code,
  failed,
  loading,
}: {
  code?: LoadedBlockCodeSample
  failed: boolean
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center text-sm text-code-foreground/72">
        Loading source...
      </div>
    )
  }

  if (failed) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6 text-center text-sm text-code-foreground/72">
        Unable to load this source file.
      </div>
    )
  }

  if (!code) {
    return <div className="min-h-0 flex-1" />
  }

  if (!code.highlightedContent) {
    return <VirtualizedCodeBlock code={code.content} />
  }

  return (
    <figure
      data-rehype-pretty-code-figure
      className="m-0! min-h-0 flex-1 overflow-hidden"
    >
      <div
        key={code.targetPath}
        className="h-full [&_pre]:h-full [&_pre]:max-h-none"
        dangerouslySetInnerHTML={{
          __html: code.highlightedContent,
        }}
      />
    </figure>
  )
}

function VirtualizedCodeBlock({ code }: { code: string }) {
  const parentRef = React.useRef<HTMLDivElement | null>(null)
  const lines = React.useMemo(() => code.split("\n"), [code])
  const lineVirtualizer = useVirtualizer({
    count: lines.length,
    estimateSize: () => 20,
    getScrollElement: () => parentRef.current,
    overscan: 32,
  })

  return (
    <div
      ref={parentRef}
      data-rehype-pretty-code-figure
      className="no-scrollbar min-h-0 flex-1 overflow-auto overscroll-contain bg-code text-[0.8rem] leading-5 text-code-foreground outline-none"
    >
      <div
        className="relative min-w-max py-3.5 font-mono"
        style={{ height: lineVirtualizer.getTotalSize() + 28 }}
      >
        {lineVirtualizer.getVirtualItems().map((virtualLine) => (
          <div
            key={virtualLine.key}
            className="absolute top-0 left-0 flex min-w-full whitespace-pre"
            style={{ transform: `translateY(${virtualLine.start + 14}px)` }}
          >
            <span className="w-12 shrink-0 pr-4 text-right text-code-foreground/45 select-none">
              {virtualLine.index + 1}
            </span>
            <code className="pr-8">{lines[virtualLine.index] || " "}</code>
          </div>
        ))}
      </div>
    </div>
  )
}

function BlockFileTree({
  codeSamples,
  activeFile,
  onActiveFileChange,
}: {
  codeSamples: BlockCodeSample[]
  activeFile: string
  onActiveFileChange: (file: string) => void
}) {
  const paths = React.useMemo(
    () => codeSamples.map((sample) => sample.targetPath),
    [codeSamples]
  )

  return (
    <PierreBlockFileTree
      key={paths.join("\0")}
      activeFile={activeFile}
      paths={paths}
      onActiveFileChange={onActiveFileChange}
    />
  )
}

function PierreBlockFileTree({
  activeFile,
  paths,
  onActiveFileChange,
}: {
  activeFile: string
  paths: string[]
  onActiveFileChange: (file: string) => void
}) {
  const filePathSet = React.useMemo(() => new Set(paths), [paths])
  const preparedInput = React.useMemo(
    () =>
      prepareFileTreeInput(paths, {
        flattenEmptyDirectories: true,
        sort: "default",
      }),
    [paths]
  )
  const { model } = useFileTree({
    flattenEmptyDirectories: true,
    initialExpansion: "open",
    initialSelectedPaths: activeFile ? [activeFile] : [],
    itemHeight: 28,
    overscan: 12,
    preparedInput,
    unsafeCSS: `
      button[data-type='item'][data-item-selected] {
        background: color-mix(in oklab, var(--color-code-foreground) 16%, transparent);
      }
    `,
    onSelectionChange: (selectedPaths) => {
      const nextPath = selectedPaths.find((path) => filePathSet.has(path))
      if (nextPath) {
        onActiveFileChange(nextPath)
      }
    },
  })

  React.useEffect(() => {
    if (!activeFile) return

    const item = model.getItem(activeFile)
    if (!item) return

    item.select()
    model.scrollToPath(activeFile, { focus: false, offset: "nearest" })
  }, [activeFile, model])

  return (
    <PierreFileTree
      model={model}
      className="block h-[calc(680px-3rem)]"
      style={
        {
          "--trees-bg-override": "var(--color-code)",
          "--trees-border-color-override": "var(--color-border)",
          "--trees-fg-override":
            "color-mix(in oklab, var(--color-code-foreground) 78%, transparent)",
          "--trees-selected-bg-override":
            "color-mix(in oklab, var(--color-code-foreground) 16%, transparent)",
        } as React.CSSProperties
      }
    />
  )
}
