"use client"

import * as React from "react"
import { codeToHtml } from "shiki"

import { cn } from "@/lib/utils"
import { CopyButton } from "@/components/copy-button"

export function HighlightedCodeBlock({
  code,
  className,
  maxHeightClassName = "max-h-[34rem]",
  previewLines,
  showCopy = true,
}: {
  code: string
  className?: string
  maxHeightClassName?: string
  previewLines?: number
  showCopy?: boolean
}) {
  const [html, setHtml] = React.useState<string | null>(null)
  const visibleCode = React.useMemo(() => {
    if (!previewLines) {
      return code
    }

    return code.split("\n").slice(0, previewLines).join("\n")
  }, [code, previewLines])

  React.useEffect(() => {
    let cancelled = false

    async function highlight() {
      const highlighted = await codeToHtml(visibleCode, {
        lang: "tsx",
        themes: {
          dark: "github-dark",
          light: "github-light-default",
        },
        transformers: [
          {
            pre(node) {
              node.properties["data-language"] = "tsx"
              node.properties["style"] = ""
              node.properties["class"] = cn(
                "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-auto !bg-transparent p-4 outline-none",
                showCopy && "pr-20",
                maxHeightClassName
              )
            },
            code(node) {
              node.properties["data-language"] = "tsx"
              node.properties["data-line-numbers"] = ""
            },
            line(node) {
              node.properties["data-line"] = ""
            },
          },
        ],
      })

      if (!cancelled) {
        setHtml(highlighted)
      }
    }

    setHtml(null)
    void highlight()

    return () => {
      cancelled = true
    }
  }, [maxHeightClassName, showCopy, visibleCode])

  return (
    <div
      data-rehype-pretty-code-figure
      className={cn(
        "relative m-0! overflow-hidden rounded-lg border bg-code text-code-foreground",
        className
      )}
    >
      {showCopy && <CopyButton value={code} />}
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre
          className={cn(
            "no-scrollbar min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-auto p-4 text-[0.8rem] leading-relaxed outline-none",
            showCopy && "pr-20",
            maxHeightClassName
          )}
        >
          <code>{visibleCode}</code>
        </pre>
      )}
    </div>
  )
}
