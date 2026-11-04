"use client"

import * as React from "react"
import { CodeIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { prepareFileTreeInput } from "@pierre/trees"
import { FileTree as PierreFileTree, useFileTree } from "@pierre/trees/react"

import type {
  BlockCodeFile,
  LoadedBlockCodeFile,
} from "@/lib/block-code-samples"
import { CodeHeaderCopyButton } from "@/components/copy-button"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"

export type BlockCodeLoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; files: LoadedBlockCodeFile[] }

export function BlockCodePanel({
  codeSamples,
  loadState,
  activeFile,
  onActiveFileChange,
}: {
  codeSamples: BlockCodeFile[]
  loadState: BlockCodeLoadState
  activeFile: string | null
  onActiveFileChange: (file: string) => void
}) {
  const activeCodeSample =
    codeSamples.find((sample) => sample.targetPath === activeFile) ??
    codeSamples[0]

  if (!activeCodeSample) {
    return (
      <div className="grid h-full place-items-center rounded-xl border bg-code text-sm text-code-foreground">
        No source sample available.
      </div>
    )
  }

  const activeLoadedSample =
    loadState.status === "loaded"
      ? loadState.files.find(
          (file) => file.targetPath === activeCodeSample.targetPath
        )
      : undefined

  return (
    <div className="flex h-full overflow-hidden rounded-xl border bg-code text-code-foreground">
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
          {activeLoadedSample ? (
            <CodeHeaderCopyButton
              value={activeLoadedSample.content}
              className="ml-auto"
              event="copy_block_code"
            />
          ) : null}
        </div>
        {activeLoadedSample ? (
          <BlockCodeContent code={activeLoadedSample} />
        ) : loadState.status === "error" ? (
          <div className="grid min-h-0 flex-1 place-items-center text-sm text-code-foreground/70">
            Failed to load source.
          </div>
        ) : (
          <BlockCodeContentSkeleton />
        )}
      </div>
    </div>
  )
}

function BlockCodeContent({ code }: { code: LoadedBlockCodeFile }) {
  return (
    <HighlightedCodeBlock
      code={code.content}
      fileName={code.targetPath}
      language={code.language}
      lazy={false}
      renderFallbackCode
      showCopy={false}
      className="min-h-0 flex-1 rounded-none border-0"
      maxHeightClassName="h-full max-h-none"
    />
  )
}

function BlockCodeContentSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-0 flex-1 animate-pulse space-y-3 overflow-hidden p-4"
    >
      {Array.from({ length: 14 }, (_, index) => (
        <div
          key={index}
          className="h-3 rounded bg-code-foreground/10"
          style={{ width: `${30 + ((index * 37) % 55)}%` }}
        />
      ))}
    </div>
  )
}

function BlockFileTree({
  codeSamples,
  activeFile,
  onActiveFileChange,
}: {
  codeSamples: BlockCodeFile[]
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
        background: var(--color-primary);
        color: var(--color-primary-foreground);
      }
      button[data-type='item'][data-item-selected] *,
      button[data-type='item'][data-item-selected] svg {
        color: var(--color-primary-foreground) !important;
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
          "--trees-selected-bg-override": "var(--color-primary)",
        } as React.CSSProperties
      }
    />
  )
}
