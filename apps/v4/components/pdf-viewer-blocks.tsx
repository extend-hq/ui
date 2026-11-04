"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import Link from "next/link"
import {
  FullScreenIcon,
  LaptopIcon,
  Refresh01Icon,
  SmartPhone01Icon,
  Tablet01Icon,
  TerminalIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type { PanelImperativeHandle } from "react-resizable-panels"

import type {
  BlockCodeFile,
  LoadedBlockCodeFile,
} from "@/lib/block-code-samples"
import {
  PDF_VIEWER_BLOCKS,
  type PdfViewerBlockMetadata,
} from "@/lib/pdf-viewer-blocks"
import { cn } from "@/lib/utils"
import { withUiBasePath } from "@/lib/zone-path"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useMounted } from "@/hooks/use-mounted"
import { Button } from "@/components/ui/button"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import type { BlockCodeLoadState } from "@/components/block-code-panel"
import {
  BlockPreviewPlaceholder,
  blockPreviews,
} from "@/components/block-previews"
import {
  CopyButtonIcon,
  copyToClipboardWithMeta,
} from "@/components/copy-button"

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
const SCROLL_SETTLE_MS = 150
const MIN_VISIBLE_RATIO = 0.1

const BlockCodePanel = dynamic(
  () =>
    import("@/components/block-code-panel").then((mod) => mod.BlockCodePanel),
  { loading: () => <div className="h-full bg-code" /> }
)

// File contents stay out of the page payload; they are fetched once per
// block from the static /blocks/[block]/code route when the Code tab opens.
const blockCodeContentCache = new Map<string, Promise<LoadedBlockCodeFile[]>>()

function fetchBlockCodeFiles(blockId: string) {
  let promise = blockCodeContentCache.get(blockId)

  if (!promise) {
    promise = fetch(withUiBasePath(`/blocks/${blockId}/code`)).then(
      async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to load block code (${response.status})`)
        }

        return (await response.json()) as LoadedBlockCodeFile[]
      }
    )
    promise.catch(() => blockCodeContentCache.delete(blockId))
    blockCodeContentCache.set(blockId, promise)
  }

  return promise
}

function useLoadedBlockCode(
  blockId: string,
  enabled: boolean
): BlockCodeLoadState {
  const [state, setState] = React.useState<BlockCodeLoadState>({
    status: "loading",
  })

  React.useEffect(() => {
    if (!enabled) return

    let isCurrent = true

    fetchBlockCodeFiles(blockId)
      .then((files) => {
        if (isCurrent) setState({ status: "loaded", files })
      })
      .catch(() => {
        if (isCurrent) setState({ status: "error" })
      })

    return () => {
      isCurrent = false
    }
  }, [blockId, enabled])

  return state
}

export function PdfViewerBlocks({
  codeSamples,
}: {
  codeSamples: Record<string, BlockCodeFile[]>
}) {
  const [sectionRef, visibleBlocks] = useVisibleBlocks()
  const isDesktopViewport = useMediaQuery("(min-width: 768px)")
  const mounted = useMounted()
  const showAll = mounted && !("IntersectionObserver" in window)
  return (
    <section ref={sectionRef} className="space-y-12">
      {PDF_VIEWER_BLOCKS.map((block) => (
        <PdfViewerBlockPreview
          key={block.id}
          block={block}
          isDesktopViewport={isDesktopViewport}
          inView={showAll || visibleBlocks.has(block.id)}
          codeSamples={codeSamples[block.id] ?? []}
        />
      ))}
    </section>
  )
}

function PdfViewerBlockPreview({
  block,
  inView,
  isDesktopViewport,
  codeSamples,
}: {
  inView: boolean
  isDesktopViewport: boolean
  block: PdfViewerBlockMetadata
  codeSamples: BlockCodeFile[]
}) {
  const [previewKey, setPreviewKey] = React.useState(0)
  const [view, setView] = React.useState<BlockView>("preview")
  const [keepPreview, setKeepPreview] = React.useState(false)
  const lastScrollGesture = React.useRef(-Infinity)
  const [activeViewport, setActiveViewport] = React.useState(
    blockViewportSizes[0]
  )
  const [isCommandCopied, setIsCommandCopied] = React.useState(false)
  const [activeFile, setActiveFile] = React.useState<string | null>(
    codeSamples[0]?.targetPath ?? null
  )
  const codeLoadState = useLoadedBlockCode(
    block.id,
    view === "code" && codeSamples.length > 0
  )
  const previewPanelRef = React.useRef<PanelImperativeHandle>(null)
  const Preview = blockPreviews[block.id]
  const previewHeightClassName =
    block.previewHeightClassName ?? BLOCK_VIEWPORT_HEIGHT_CLASS

  function retainPreview() {
    if (!keepPreview) setKeepPreview(true)
  }

  function noteScrollGesture() {
    lastScrollGesture.current = performance.now()
  }

  function resizeViewport(viewport: (typeof blockViewportSizes)[number]) {
    setView("preview")
    setActiveViewport(viewport)
    previewPanelRef.current?.resize(`${viewport.panelSize}%`)
  }

  React.useEffect(() => {
    if (!isCommandCopied) return

    const timer = window.setTimeout(() => setIsCommandCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [isCommandCopied])

  const validActiveFile = codeSamples.some(
    (sample) => sample.targetPath === activeFile
  )
    ? activeFile
    : (codeSamples[0]?.targetPath ?? null)
  if (activeFile !== validActiveFile) setActiveFile(validActiveFile)

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
          <BlockViewToggle view={view} onViewChange={setView} />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <a
              href={`#${block.id}`}
              className="min-w-0 truncate text-sm font-medium underline-offset-2 hover:underline"
            >
              {block.title}
            </a>
            {block.badge ? (
              <span className="shrink-0 rounded-full border bg-background px-1.5 text-[0.625rem] leading-4 tracking-wide text-muted-foreground uppercase">
                {block.badge}
              </span>
            ) : null}
          </div>
          <div className="ml-auto flex min-w-0 items-center gap-2">
            <div className="hidden items-center gap-1 rounded-md border bg-background p-0.5 sm:flex">
              {blockViewportSizes.map((viewport) => (
                <Button
                  key={viewport.id}
                  type="button"
                  variant={
                    activeViewport.id === viewport.id ? "secondary" : "ghost"
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
                render={
                  <Link
                    href={block.viewHref}
                    prefetch={false}
                    target="_blank"
                  />
                }
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
                onClick={() => {
                  setKeepPreview(false)
                  setPreviewKey((value) => value + 1)
                }}
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
              <CopyButtonIcon
                copied={isCommandCopied}
                icon={TerminalIcon}
                className="shrink-0"
              />
              <span className="truncate font-mono text-xs">
                {block.command}
              </span>
            </Button>
          </div>
        </div>
        <div
          hidden={view !== "preview"}
          className={cn(
            "relative box-content overflow-hidden rounded-xl border bg-background",
            previewHeightClassName
          )}
          onClickCapture={retainPreview}
          onPointerDownCapture={(event) => {
            if (event.pointerType !== "touch") retainPreview()
          }}
          onFocusCapture={retainPreview}
          onWheelCapture={keepPreview ? undefined : noteScrollGesture}
          onTouchMoveCapture={keepPreview ? undefined : noteScrollGesture}
          onScrollCapture={() => {
            if (
              performance.now() - lastScrollGesture.current <
              SCROLL_SETTLE_MS
            )
              retainPreview()
          }}
          onKeyDownCapture={retainPreview}
          onChangeCapture={retainPreview}
          onDropCapture={retainPreview}
        >
          {keepPreview || (inView && view === "preview") ? (
            <ResizablePanelGroup
              orientation="horizontal"
              className="h-full bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-[size:20px_20px]"
            >
              <ResizablePanel
                ref={previewPanelRef}
                defaultSize={`${activeViewport.panelSize}%`}
                minSize="30%"
                className="min-w-0 overflow-hidden rounded-xl bg-background"
              >
                <Preview key={previewKey} />
              </ResizablePanel>
              {isDesktopViewport && (
                <>
                  <ResizableHandle className="relative w-3 bg-transparent p-0 after:absolute after:top-1/2 after:right-0 after:h-8 after:w-1.5 after:-translate-y-1/2 after:rounded-full after:bg-background after:shadow-sm after:ring-1 after:ring-border after:transition-all after:hover:h-10" />
                  <ResizablePanel defaultSize="0%" minSize="0%" />
                </>
              )}
            </ResizablePanelGroup>
          ) : (
            <BlockPreviewPlaceholder />
          )}
        </div>
        {view === "code" && (
          <div className={BLOCK_VIEWPORT_HEIGHT_CLASS}>
            {inView && (
              <BlockCodePanel
                codeSamples={codeSamples}
                loadState={codeLoadState}
                activeFile={activeFile}
                onActiveFileChange={setActiveFile}
              />
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function useVisibleBlocks() {
  const sectionRef = React.useRef<HTMLElement>(null)
  const [visibleBlocks, setVisibleBlocks] = React.useState<Set<string>>(
    () => new Set()
  )

  React.useEffect(() => {
    const section = sectionRef.current
    if (!section || !("IntersectionObserver" in window)) return

    const visible = new Set<string>()
    let dirty = false
    let settleTimer: number | undefined

    function publish() {
      settleTimer = undefined
      if (!dirty) return
      dirty = false
      const next = new Set(visible)
      React.startTransition(() => setVisibleBlocks(next))
    }

    function onScroll() {
      window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(publish, SCROLL_SETTLE_MS)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id
          const inView =
            entry.isIntersecting &&
            (entry.intersectionRatio >= MIN_VISIBLE_RATIO ||
              (entry.rootBounds?.height ?? window.innerHeight) <
                entry.boundingClientRect.height * MIN_VISIBLE_RATIO)
          if (visible.has(id) === inView) continue
          if (inView) visible.add(id)
          else visible.delete(id)
          dirty = true
        }
        if (settleTimer === undefined) publish()
      },
      { threshold: [0, MIN_VISIBLE_RATIO] }
    )

    section
      .querySelectorAll(":scope > article[id]")
      .forEach((node) => observer.observe(node))
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.clearTimeout(settleTimer)
    }
  }, [])

  return [sectionRef, visibleBlocks] as const
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
                "bg-background text-foreground shadow-sm/5 hover:text-foreground dark:bg-input"
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
