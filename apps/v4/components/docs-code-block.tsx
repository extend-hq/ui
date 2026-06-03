"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CodeCollapsibleWrapper } from "@/components/code-collapsible-wrapper"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"

function DocsSourceCodePreview({
  code,
  fileName,
  language,
}: {
  code: string
  fileName: string
  language: string
}) {
  return (
    <HighlightedCodeBlock
      code={code}
      className="h-64 rounded-none border-0"
      fileName={fileName}
      language={language}
      lazy={false}
      maxHeightClassName="h-64 max-h-64"
      previewLines={12}
      showCopy={false}
    />
  )
}

export function DocsSourceCodeBlock({
  code,
  className,
  fileName = "components/ui/component.tsx",
  language = "tsx",
}: {
  code: string
  className?: string
  fileName?: string
  language?: string
}) {
  return (
    <CodeCollapsibleWrapper
      className={cn("mt-6", className)}
      copyValue={code}
      language={language}
      renderContentWhenCollapsed={false}
      title={fileName}
      collapsedContent={
        <DocsSourceCodePreview
          code={code}
          fileName={fileName}
          language={language}
        />
      }
    >
      <HighlightedCodeBlock
        code={code}
        className="rounded-none border-0"
        fileName={fileName}
        language={language}
        maxHeightClassName="max-h-[34rem]"
        showCopy={false}
      />
    </CodeCollapsibleWrapper>
  )
}

export function DocsViewCodeBlock({
  code,
  className,
  fileName,
  language,
}: {
  code: string
  className?: string
  fileName?: string
  language?: string
}) {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="code"
      data-mobile-code-visible={isCodeVisible}
      className={cn(
        "relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72",
        className
      )}
    >
      {isCodeVisible ? (
        <HighlightedCodeBlock
          code={code}
          fileName={fileName}
          language={language}
          className="rounded-none border-x-0 border-b-0"
        />
      ) : (
        <div className="relative h-56 overflow-hidden">
          <HighlightedCodeBlock
            code={code}
            fileName={fileName}
            language={language}
            className="h-full rounded-none border-x-0 border-b-0"
            lazy={false}
            maxHeightClassName="h-full max-h-56"
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
  )
}
