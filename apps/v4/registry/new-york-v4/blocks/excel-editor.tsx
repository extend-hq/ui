"use client"

import * as React from "react"

import { XlsxEditorPreview } from "@/components/extend/xlsx-editor"

export function ExcelEditorBlock({
  file,
  heightClassName = "h-[720px]",
}: {
  file?: string
  heightClassName?: string
}) {
  const [isDark, setIsDark] = React.useState(false)

  return (
    <div className={`${heightClassName} min-h-0 overflow-hidden bg-background`}>
      <XlsxEditorPreview
        className="h-full min-h-0 [&>div]:!h-full"
        src={file ?? "/samples/crazy-chart-zoo.xlsx"}
        isDark={isDark}
        onIsDarkChange={setIsDark}
      />
    </div>
  )
}
