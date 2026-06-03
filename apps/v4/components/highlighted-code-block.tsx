"use client"

import * as React from "react"
import {
  File,
  Virtualizer,
  WorkerPoolContextProvider,
  type FileContents,
  type SupportedLanguages,
  type VirtualFileMetrics,
  type WorkerInitializationRenderOptions,
  type WorkerPoolOptions,
} from "@pierre/diffs/react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy-button"

const CODE_FILE_THEME = {
  "--diffs-light-bg": "var(--color-code)",
  "--diffs-dark-bg": "var(--color-code)",
  "--diffs-light": "var(--color-code-foreground)",
  "--diffs-dark": "var(--color-code-foreground)",
  "--diffs-bg-context-override": "var(--color-code)",
  "--diffs-bg-context-gutter-override": "var(--color-code)",
  "--diffs-bg-buffer-override": "var(--color-code)",
  "--diffs-fg-number-override": "var(--color-muted-foreground)",
  "--diffs-font-size": "0.8rem",
  "--diffs-line-height": "1.625",
} as React.CSSProperties

const CODE_FONT_SIZE_PX = 12.8
const CODE_LINE_HEIGHT_PX = CODE_FONT_SIZE_PX * 1.625

const CODE_VIRTUAL_FILE_METRICS = {
  hunkLineCount: 50,
  lineHeight: CODE_LINE_HEIGHT_PX,
  diffHeaderHeight: 44,
  spacing: 8,
  paddingTop: 0,
  paddingBottom: 8,
} satisfies VirtualFileMetrics

const CODE_FILE_UNSAFE_CSS = `
  [data-code-buffer-hidden="true"] {
    display: none !important;
    height: 0 !important;
  }
`

const CODE_HIGHLIGHTER_OPTIONS = {
  theme: {
    light: "pierre-light-soft",
    dark: "pierre-dark-soft",
  },
  langs: [
    "tsx",
    "typescript",
    "javascript",
    "jsx",
    "css",
    "html",
    "json",
    "mdx",
    "markdown",
  ],
} satisfies WorkerInitializationRenderOptions

const CODE_WORKER_POOL_OPTIONS = {
  workerFactory: () =>
    new Worker(new URL("@pierre/diffs/worker/worker.js", import.meta.url), {
      type: "module",
    }),
} satisfies WorkerPoolOptions

type CodeThemeType = "light" | "dark"

function useCodeThemeType(): CodeThemeType {
  const { resolvedTheme } = useTheme()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  return isMounted && resolvedTheme === "dark" ? "dark" : "light"
}

function getSampleHash(value: string) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0
  }

  return hash >>> 0
}

function getCodeCacheKey(code: string, fileName: string) {
  const sampleSize = 2048

  if (code.length <= sampleSize * 2) {
    return `${fileName}:${code.length}:${getSampleHash(code)}`
  }

  return [
    fileName,
    code.length,
    getSampleHash(code.slice(0, sampleSize)),
    getSampleHash(code.slice(-sampleSize)),
  ].join(":")
}

function getPreviewCode(code: string, previewLines?: number) {
  if (!previewLines) {
    return code
  }

  let lineCount = 0

  for (let index = 0; index < code.length; index += 1) {
    if (code.charCodeAt(index) !== 10) continue

    lineCount += 1
    if (lineCount >= previewLines) {
      return code.slice(0, index)
    }
  }

  return code
}

function getLastRenderableLineIndex(code: string) {
  if (!code) {
    return -1
  }

  let lineCount = 1

  for (let index = 0; index < code.length; index += 1) {
    if (code.charCodeAt(index) === 10) {
      lineCount += 1
    }
  }

  const hasTrailingLineBreak =
    code.endsWith("\n") || code.endsWith("\r") || code.endsWith("\r\n")

  return hasTrailingLineBreak ? lineCount - 2 : lineCount - 1
}

function setVirtualizerBufferHidden(element: Element, hidden: boolean) {
  if (hidden) {
    element.setAttribute("data-code-buffer-hidden", "true")
  } else {
    element.removeAttribute("data-code-buffer-hidden")
  }
}

function syncVirtualizerBuffers(
  fileContainer: HTMLElement,
  lastRenderableLineIndex: number
) {
  const shadowRoot = fileContainer.shadowRoot
  if (!shadowRoot) return

  const lines = Array.from(
    shadowRoot.querySelectorAll<HTMLElement>("[data-line][data-line-index]")
  )
  const firstLineIndex = Number(lines[0]?.dataset.lineIndex)
  const lastLineIndex = Number(lines.at(-1)?.dataset.lineIndex)
  const isAtStart = Number.isFinite(firstLineIndex) && firstLineIndex <= 0
  const isAtEnd =
    Number.isFinite(lastLineIndex) && lastLineIndex >= lastRenderableLineIndex
  const beforeBuffers = Array.from(
    shadowRoot.querySelectorAll('[data-virtualizer-buffer="before"]')
  )
  const afterBuffers = Array.from(
    shadowRoot.querySelectorAll('[data-virtualizer-buffer="after"]')
  )

  beforeBuffers.forEach((buffer, index) => {
    setVirtualizerBufferHidden(buffer, isAtStart || index > 0)
  })
  afterBuffers.forEach((buffer, index) => {
    setVirtualizerBufferHidden(buffer, isAtEnd || index > 0)
  })
}

export function HighlightedCodeBlock({
  code,
  className,
  fileName = "component.tsx",
  language = "tsx",
  lazy = true,
  maxHeightClassName = "max-h-[34rem]",
  previewLines,
  showCopy = true,
}: {
  code: string
  className?: string
  fileName?: string
  language?: string
  lazy?: boolean
  maxHeightClassName?: string
  previewLines?: number
  showCopy?: boolean
}) {
  const [isVisible, setIsVisible] = React.useState(!lazy)
  const codeThemeType = useCodeThemeType()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const visibleCode = React.useMemo(() => {
    return getPreviewCode(code, previewLines)
  }, [code, previewLines])
  const lastRenderableLineIndex = React.useMemo(() => {
    return getLastRenderableLineIndex(visibleCode)
  }, [visibleCode])
  const file = React.useMemo(
    (): FileContents => ({
      name: fileName,
      contents: visibleCode,
      lang: language as SupportedLanguages,
      cacheKey: getCodeCacheKey(visibleCode, fileName),
    }),
    [fileName, language, visibleCode]
  )

  const fileOptions = React.useMemo(
    () => ({
      disableFileHeader: true,
      overflow: "scroll" as const,
      theme: {
        light: "pierre-light-soft",
        dark: "pierre-dark-soft",
      },
      themeType: codeThemeType,
      onPostRender: (fileContainer: HTMLElement) => {
        syncVirtualizerBuffers(fileContainer, lastRenderableLineIndex)
      },
      unsafeCSS: CODE_FILE_UNSAFE_CSS,
    }),
    [codeThemeType, lastRenderableLineIndex]
  )

  React.useEffect(() => {
    if (!lazy) {
      setIsVisible(true)
      return
    }

    const container = containerRef.current
    if (!container) return

    if (!("IntersectionObserver" in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "800px 0px" }
    )

    observer.observe(container)

    return () => observer.disconnect()
  }, [lazy])

  return (
    <div
      ref={containerRef}
      data-rehype-pretty-code-figure
      className={cn(
        "relative m-0! overflow-hidden rounded-lg border bg-code text-code-foreground",
        className
      )}
    >
      {showCopy && <CopyButton value={code} />}
      {isVisible ? (
        <WorkerPoolContextProvider
          poolOptions={CODE_WORKER_POOL_OPTIONS}
          highlighterOptions={CODE_HIGHLIGHTER_OPTIONS}
        >
          <Virtualizer
            className={cn(
              "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-auto outline-none",
              maxHeightClassName
            )}
            contentClassName="min-w-full"
          >
            <File
              file={file}
              metrics={CODE_VIRTUAL_FILE_METRICS}
              style={CODE_FILE_THEME}
              options={fileOptions}
            />
          </Virtualizer>
        </WorkerPoolContextProvider>
      ) : (
        <div className={cn("min-h-72 bg-code", maxHeightClassName)} />
      )}
    </div>
  )
}
