"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowUpRight01Icon,
  CodeIcon,
  LaptopIcon,
  Refresh01Icon,
  SmartPhone01Icon,
  Tablet01Icon,
  TerminalIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  FileTree as TreesFileTree,
  useFileTree,
  useFileTreeSelection,
} from "@pierre/trees/react"
import type { ImperativePanelHandle } from "react-resizable-panels"

import { siteConfig } from "@/lib/config"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CitationsBlock } from "@/components/citations-docs"
import { copyToClipboardWithMeta } from "@/components/copy-button"
import {
  DocumentSplitsBlock,
  XlsxDocumentSplitsBlock,
} from "@/components/document-splitter-docs"
import { DocxEditorBlock } from "@/components/docx-editor-docs"
import { ESignatureBlock } from "@/components/e-signature-docs"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { HumanReviewBlock } from "@/components/human-review-docs"
import { OcrBlocksBlock } from "@/components/ocr-blocks-docs"
import { PdfDropzoneBlock } from "@/components/pdf-dropzone-block"

type BlockCodeSample = {
  sourcePath: string
  targetPath: string
  content: string
}

type BlockViewportSize = "desktop" | "tablet" | "mobile"
type BlockView = "preview" | "code"

function getRegistryAddCommand(name: string) {
  return `npx shadcn@latest add ${siteConfig.url}/r/${name}.json`
}

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

const blockFileTreeUnsafeCSS = `
  :host {
    --trees-item-height: 28px;
    --trees-density-override: 0.9;
    color: var(--code-foreground);
    font-family: var(--font-sans);
  }

  [data-file-tree-virtualized-wrapper] {
    background: transparent;
  }

  [data-file-tree-virtualized-scroll] {
    scrollbar-width: thin;
  }

  button[data-type='item'] {
    border-radius: 0.375rem;
    color: color-mix(in oklch, var(--code-foreground) 82%, transparent);
    font-size: 12px;
    margin-inline: 0.5rem;
    min-height: 28px;
    width: calc(100% - 1rem);
  }

  button[data-type='item']:hover,
  button[data-type='item'][data-item-selected] {
    background: color-mix(in oklch, var(--muted-foreground) 15%, transparent);
    color: var(--foreground);
  }

  button[data-type='item']:focus-visible {
    outline: 2px solid color-mix(in oklch, var(--ring) 45%, transparent);
    outline-offset: -1px;
  }

  [data-item-section='icon'] svg {
    opacity: 0.72;
  }

  button[data-item-type='folder'] > [data-item-section='content'] {
    align-items: center;
    display: inline-flex;
    gap: 0.375rem;
  }

  button[data-item-type='folder'] > [data-item-section='content']::before {
    background-color: currentColor;
    content: "";
    display: block;
    flex: 0 0 auto;
    height: 0.875rem;
    opacity: 0.72;
    width: 0.875rem;
    -webkit-mask: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 6.75C2 5.23 3.23 4 4.75 4h3.67c.73 0 1.43.29 1.94.8L11.56 6h7.69C20.77 6 22 7.23 22 8.75v8.5C22 18.77 20.77 20 19.25 20H4.75C3.23 20 2 18.77 2 17.25V6.75Z'/%3E%3C/svg%3E") center / contain no-repeat;
    mask: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2 6.75C2 5.23 3.23 4 4.75 4h3.67c.73 0 1.43.29 1.94.8L11.56 6h7.69C20.77 6 22 7.23 22 8.75v8.5C22 18.77 20.77 20 19.25 20H4.75C3.23 20 2 18.77 2 17.25V6.75Z'/%3E%3C/svg%3E") center / contain no-repeat;
  }

  button[data-item-type='folder'] > [data-item-section='content'] > * {
    min-width: 0;
  }
`

const pdfViewerBlocks = [
  {
    id: "pdf-dropzone",
    title: "PDF Dropzone",
    description:
      "A PDF-only upload dropzone that opens the dropped file in the shared viewer.",
    command: getRegistryAddCommand("pdf-dropzone"),
    docsHref: "/docs/components/file-upload",
    component: PdfDropzoneBlock,
  },
  {
    id: "citations",
    title: "Citations",
    description:
      "Evidence cards that scroll the PDF viewer to source bounding boxes.",
    command: getRegistryAddCommand("citations"),
    docsHref: "/docs/components/citations",
    component: CitationsBlock,
  },
  {
    id: "ocr-blocks",
    title: "OCR Blocks",
    description:
      "Structured OCR review with typed blocks, confidence, and page overlays.",
    hideHeader: true,
    command: getRegistryAddCommand("ocr-blocks"),
    docsHref: "/docs/components/ocr-blocks",
    component: OcrBlocksBlock,
  },
  {
    id: "e-signature",
    title: "E-Signature",
    description:
      "Signature fields connected to the PDF canvas and signed PDF export.",
    hideHeader: true,
    command: getRegistryAddCommand("e-signature"),
    docsHref: "/docs/components/e-signature",
    component: ESignatureBlock,
  },
  {
    id: "human-review",
    title: "Human Review",
    description:
      "Extraction review cards connected to source evidence in the PDF viewer.",
    command: getRegistryAddCommand("human-review"),
    docsHref: "/docs/components/human-review",
    component: HumanReviewBlock,
  },
  {
    id: "document-splits",
    title: "Document Splits",
    description:
      "Lazy page thumbnails, draggable split groups, and PDF navigation.",
    command: getRegistryAddCommand("document-splits"),
    docsHref: "/docs/components/document-splits",
    component: DocumentSplitsBlock,
  },
  {
    id: "excel-document-splits",
    title: "Excel Document Splits",
    description:
      "Workbook sheets split into draggable groups with thumbnails from the XLSX viewer.",
    command: getRegistryAddCommand("excel-document-splits"),
    docsHref: "/docs/components/xlsx-viewer",
    component: XlsxDocumentSplitsBlock,
  },
  {
    id: "docx-editor-block",
    title: "DOCX Editor",
    description:
      "A Word-style document editor with formatting controls, page thumbnails, and DOCX export.",
    command: getRegistryAddCommand("docx-editor-block"),
    docsHref: "/docs/components/docx-editor",
    component: DocxEditorBlock,
  },
]

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
  const [activeViewport, setActiveViewport] =
    React.useState<BlockViewportSize>("desktop")
  const [isCommandCopied, setIsCommandCopied] = React.useState(false)
  const [activeFile, setActiveFile] = React.useState<string | null>(
    codeSamples[0]?.targetPath ?? null
  )
  const previewPanelRef = React.useRef<ImperativePanelHandle>(null)
  const Preview = block.component
  const activeCodeSample =
    codeSamples.find((sample) => sample.targetPath === activeFile) ??
    codeSamples[0]

  function resizeViewport(viewport: (typeof blockViewportSizes)[number]) {
    setView("preview")
    setActiveViewport(viewport.id)
    previewPanelRef.current?.resize(viewport.panelSize)
  }

  React.useEffect(() => {
    if (!isCommandCopied) return

    const timer = window.setTimeout(() => setIsCommandCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [isCommandCopied])

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
        className="group/block-preview overflow-hidden rounded-xl bg-background"
      >
        <div className="flex min-h-11 flex-wrap items-center gap-2 px-2 pb-2">
          <Tabs
            value={view}
            onValueChange={(value) => setView(value as BlockView)}
          >
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
          </Tabs>
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
                title="Open in New Tab"
                aria-label={`Open ${block.title} in new tab`}
                render={<Link href={block.docsHref} target="_blank" />}
              >
                <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-4" />
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
        {view === "preview" ? (
          <div
            className={`relative hidden ${BLOCK_VIEWPORT_HEIGHT_CLASS} overflow-hidden rounded-xl border bg-muted/30 md:block`}
          >
            <div className="absolute inset-0 right-4 bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:20px_20px]" />
            <ResizablePanelGroup
              direction="horizontal"
              className="relative z-10 h-full"
            >
              <ResizablePanel
                ref={previewPanelRef}
                defaultSize={100}
                minSize={30}
                className="min-w-0 overflow-hidden rounded-xl bg-background"
              >
                <Preview key={previewKey} />
              </ResizablePanel>
              <ResizableHandle className="relative w-3 bg-transparent p-0 after:absolute after:top-1/2 after:right-0 after:h-8 after:w-1.5 after:-translate-y-1/2 after:rounded-full after:bg-border after:transition-all after:hover:h-10" />
              <ResizablePanel defaultSize={0} minSize={0} />
            </ResizablePanelGroup>
          </div>
        ) : (
          <BlockCodePanel
            codeSamples={codeSamples}
            activeFile={activeFile}
            onActiveFileChange={setActiveFile}
          />
        )}
        {view === "preview" ? (
          <div className="overflow-hidden rounded-xl border bg-background md:hidden">
            <Preview key={previewKey} />
          </div>
        ) : null}
      </div>
    </article>
  )
}

function BlockCodePanel({
  codeSamples,
  activeFile,
  onActiveFileChange,
}: {
  codeSamples: BlockCodeSample[]
  activeFile: string | null
  onActiveFileChange: (file: string) => void
}) {
  const activeCodeSample =
    codeSamples.find((sample) => sample.targetPath === activeFile) ??
    codeSamples[0]

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
        </div>
        <HighlightedCodeBlock
          code={activeCodeSample.content}
          className="min-h-0 flex-1 rounded-none border-0 [&_pre]:h-full [&>div]:h-full"
          maxHeightClassName="h-full max-h-none"
        />
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
  const filePaths = React.useMemo(
    () => codeSamples.map((sample) => sample.targetPath),
    [codeSamples]
  )
  const filePathSet = React.useMemo(() => new Set(filePaths), [filePaths])
  const activeFileRef = React.useRef(activeFile)
  const { model } = useFileTree({
    flattenEmptyDirectories: false,
    initialExpansion: "open",
    initialSelectedPaths: [activeFile],
    paths: filePaths,
    unsafeCSS: blockFileTreeUnsafeCSS,
  })
  const selectedPaths = useFileTreeSelection(model)

  React.useEffect(() => {
    activeFileRef.current = activeFile
    const activeItem = model.getItem(activeFile)

    if (activeItem && !activeItem.isSelected()) {
      activeItem.select()
      model.scrollToPath(activeFile, { focus: false, offset: "nearest" })
    }
  }, [activeFile, model])

  React.useEffect(() => {
    const selectedFile = [...selectedPaths]
      .reverse()
      .find((path) => filePathSet.has(path))

    if (selectedFile && selectedFile !== activeFileRef.current) {
      onActiveFileChange(selectedFile)
    }
  }, [filePathSet, onActiveFileChange, selectedPaths])

  return (
    <TreesFileTree
      model={model}
      className="h-[calc(34rem-3rem)]"
      style={
        {
          "--trees-bg-override": "var(--code)",
          "--trees-border-color-override": "var(--border)",
          "--trees-fg-override": "var(--code-foreground)",
          "--trees-selected-bg-override":
            "color-mix(in oklch, var(--muted-foreground) 15%, transparent)",
          height: "calc(34rem - 3rem)",
        } as React.CSSProperties
      }
    />
  )
}
