"use client"

import * as React from "react"
import {
  File,
  Virtualizer,
  WorkerPoolContextProvider,
  type FileContents,
  type SupportedLanguages,
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

function getCodeCacheKey(code: string, fileName: string) {
  let hash = 0

  for (let index = 0; index < code.length; index += 1) {
    hash = (hash * 31 + code.charCodeAt(index)) | 0
  }

  return `${fileName}:${code.length}:${hash >>> 0}`
}

export function HighlightedCodeBlock({
  code,
  className,
  fileName = "component.tsx",
  language = "tsx",
  maxHeightClassName = "max-h-[34rem]",
  previewLines,
  showCopy = true,
}: {
  code: string
  className?: string
  fileName?: string
  language?: string
  maxHeightClassName?: string
  previewLines?: number
  showCopy?: boolean
}) {
  const [isVisible, setIsVisible] = React.useState(false)
  const codeThemeType = useCodeThemeType()
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const visibleCode = React.useMemo(() => {
    if (!previewLines) {
      return code
    }

    return code.split("\n").slice(0, previewLines).join("\n")
  }, [code, previewLines])
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
    }),
    [codeThemeType]
  )

  React.useEffect(() => {
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
  }, [])

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
            <File file={file} style={CODE_FILE_THEME} options={fileOptions} />
          </Virtualizer>
        </WorkerPoolContextProvider>
      ) : (
        <div className={cn("min-h-72 bg-code", maxHeightClassName)} />
      )}
    </div>
  )
}
