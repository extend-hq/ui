"use client"

import * as React from "react"

import { DocxEditorPreview } from "@/components/ui/docx-editor"

export function DocxEditorBlock({ file }: { file?: string }) {
  const [isDark, setIsDark] = React.useState(false)

  return (
    <div className="h-full min-h-0 bg-background">
      <DocxEditorPreview
        src={file ?? "/samples/demo.docx"}
        isDark={isDark}
        onIsDarkChange={setIsDark}
      />
    </div>
  )
}
