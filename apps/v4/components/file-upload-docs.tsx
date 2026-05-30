"use client"

import * as React from "react"
import {
  FileImageIcon,
  FileSpreadsheetIcon,
  FileUploadIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { BorderBeam } from "border-beam"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileThumbnail } from "@/components/ui/file-thumbnail"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { Card } from "@/registry/new-york-v4/ui/card"

type FileUploadItem = {
  id: string
  name: string
  type: string
  size: number
  url: string
}

type AcceptedFileType = {
  label: string
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]
}

type FileUploadProps = {
  accept?: string
  acceptedFileTypes?: AcceptedFileType[]
  borderBeamTheme?: React.ComponentProps<typeof BorderBeam>["theme"]
  browseLabel?: string
  className?: string
  description?: string
  draggingLabel?: string
  multiple?: boolean
  showBorderBeam?: boolean
  showFileList?: boolean
  title?: string
  onFilesAccepted?: (files: File[]) => void
  onFilesChange?: (files: FileUploadItem[]) => void
}

const ACCEPTED_FILE_TYPES: AcceptedFileType[] = [
  { label: "Image", icon: FileImageIcon },
  { label: "PDF", icon: FileUploadIcon },
  { label: "Sheet", icon: FileSpreadsheetIcon },
]
const ICON_TRANSFORMS = [
  {
    idle: "translate(-78%, -50%) rotate(-8deg)",
    active: "translate(-114%, -50%) rotate(-12deg) scale(1.08)",
  },
  {
    idle: "translate(-50%, -50%) rotate(0deg)",
    active: "translate(-50%, -50%) rotate(0deg) scale(1.18)",
  },
  {
    idle: "translate(-22%, -50%) rotate(8deg)",
    active: "translate(14%, -50%) rotate(12deg) scale(1.08)",
  },
]

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"

  const units = ["B", "KB", "MB", "GB"]
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${
    units[index]
  }`
}

function toUploadItems(files: FileList | File[]): FileUploadItem[] {
  return Array.from(files).map((file) => ({
    id: `${file.name}-${file.size}-${file.lastModified}`,
    name: file.name,
    type: file.type || "Unknown type",
    size: file.size,
    url: URL.createObjectURL(file),
  }))
}

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true

  return accept.split(",").some((rawToken) => {
    const token = rawToken.trim().toLowerCase()

    if (!token) return false
    if (token.startsWith(".")) {
      return file.name.toLowerCase().endsWith(token)
    }
    if (token.endsWith("/*")) {
      return file.type.toLowerCase().startsWith(token.slice(0, -1))
    }

    return file.type.toLowerCase() === token
  })
}

function UploadIconCluster({
  acceptedFileTypes,
  isDragging,
}: {
  acceptedFileTypes: AcceptedFileType[]
  isDragging: boolean
}) {
  const singleIcon = acceptedFileTypes.length === 1

  return (
    <div className="relative h-14 w-36">
      {acceptedFileTypes.map((item, index) => (
        <Card
          key={item.label}
          className={cn(
            "absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-xl bg-background text-muted-foreground transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:rounded-[calc(var(--radius-xl)-1px)]",
            "motion-reduce:transition-none",
            index === 1 && "z-10",
            isDragging && "bg-accent text-foreground"
          )}
          style={{
            transform: singleIcon
              ? `translate(-50%, -50%) scale(${isDragging ? 1.14 : 1})`
              : isDragging
                ? ICON_TRANSFORMS[index]?.active
                : ICON_TRANSFORMS[index]?.idle,
          }}
        >
          <HugeiconsIcon icon={item.icon} className="size-5" />
        </Card>
      ))}
    </div>
  )
}

export function FileUpload({
  accept,
  acceptedFileTypes = ACCEPTED_FILE_TYPES,
  borderBeamTheme = "light",
  browseLabel = "Browse files",
  className,
  description = "PDF, DOCX, XLSX, CSV, PNG, or JPG",
  draggingLabel = "Drop to add",
  multiple = true,
  showBorderBeam = true,
  showFileList = true,
  title = "Click to upload or drop files",
  onFilesAccepted,
  onFilesChange,
}: FileUploadProps) {
  const dragDepthRef = React.useRef(0)
  const [isDragging, setIsDragging] = React.useState(false)
  const [files, setFiles] = React.useState<FileUploadItem[]>([])
  const [rejectionMessage, setRejectionMessage] = React.useState<string | null>(
    null
  )

  const commitFiles = React.useCallback(
    (nextFiles: FileList | File[]) => {
      const acceptedFiles = Array.from(nextFiles)
        .filter((file) => matchesAccept(file, accept))
        .slice(0, multiple ? undefined : 1)

      if (acceptedFiles.length === 0) {
        setRejectionMessage("Only PDF files are supported here.")
        return
      }

      setRejectionMessage(null)
      onFilesAccepted?.(acceptedFiles)

      const items = toUploadItems(acceptedFiles)
      setFiles((previousFiles) => {
        previousFiles.forEach((file) => URL.revokeObjectURL(file.url))
        return items
      })
      onFilesChange?.(items)
    },
    [accept, multiple, onFilesAccepted, onFilesChange]
  )

  React.useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.url))
    }
  }, [files])

  const dropzone = (
    <label
      className={cn(
        "relative flex min-h-64 cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-[1.125rem] border border-dashed bg-background px-6 py-10 text-center transition-[border-color,background-color] duration-200 ease-out",
        "motion-reduce:transition-none",
        isDragging
          ? "border-foreground/40 bg-accent/35"
          : "border-border hover:border-foreground/30 hover:bg-muted/35"
      )}
      onDragEnter={(event) => {
        event.preventDefault()
        dragDepthRef.current += 1
        setIsDragging(true)
      }}
      onDragLeave={(event) => {
        event.preventDefault()
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
        if (dragDepthRef.current === 0) {
          setIsDragging(false)
        }
      }}
      onDragOver={(event) => {
        event.preventDefault()
      }}
      onDrop={(event) => {
        event.preventDefault()
        dragDepthRef.current = 0
        setIsDragging(false)

        if (event.dataTransfer.files.length > 0) {
          commitFiles(event.dataTransfer.files)
        }
      }}
    >
      <UploadIconCluster
        acceptedFileTypes={acceptedFileTypes}
        isDragging={isDragging}
      />
      <div className="space-y-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
        {rejectionMessage ? (
          <div className="text-xs text-destructive">{rejectionMessage}</div>
        ) : null}
      </div>
      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
        <HugeiconsIcon icon={Upload01Icon} className="size-3.5" />
        <span>{isDragging ? draggingLabel : browseLabel}</span>
      </div>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          if (event.target.files) {
            commitFiles(event.target.files)
            event.currentTarget.value = ""
          }
        }}
      />
    </label>
  )

  return (
    <div className={cn("space-y-3", className)}>
      {showBorderBeam ? (
        <BorderBeam
          active={isDragging}
          borderRadius={18}
          brightness={2.4}
          className="rounded-[1.125rem]"
          colorVariant="ocean"
          duration={2.4}
          size="md"
          strength={1}
          theme={borderBeamTheme}
        >
          {dropzone}
        </BorderBeam>
      ) : (
        dropzone
      )}
      {showFileList && files.length > 0 ? (
        <div className="rounded-xl border bg-background">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"
            >
              <FileThumbnail
                file={{
                  name: file.name,
                  type: file.type,
                  size: formatBytes(file.size),
                }}
                previewImageUrl={
                  file.type.startsWith("image/") ? file.url : null
                }
                className="size-10 shrink-0 rounded-lg"
                showMetadata={false}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{file.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {file.type} - {formatBytes(file.size)}
                </div>
              </div>
              <div className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                Ready
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function FileUploadDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <div className="bg-background p-4">
        <FileUpload />
      </div>
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={fileUploadDemoCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={fileUploadDemoCode}
              className="rounded-none border-x-0 border-b-0"
              maxHeightClassName="max-h-56"
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
    </div>
  )
}

const fileUploadDemoCode = `import { FileUpload } from "@/components/ui/file-upload";

export function FileUploadExample() {
  return (
    <div className="rounded-xl border bg-background p-4">
      <FileUpload />
    </div>
  );
}`

const fileUploadUsageCode =
  '"use client"\n\nimport * as React from "react"\nimport {\n  FileImageIcon,\n  FileSpreadsheetIcon,\n  FileUploadIcon,\n  Upload01Icon,\n} from "@hugeicons/core-free-icons"\nimport { HugeiconsIcon } from "@hugeicons/react"\nimport { BorderBeam } from "border-beam"\n\nimport { cn } from "@/lib/utils"\nimport { FileThumbnail } from "@/components/ui/file-thumbnail"\nimport { Card } from "@/registry/new-york-v4/ui/card"\n\ntype FileUploadItem = {\n  id: string\n  name: string\n  type: string\n  size: number\n  url: string\n}\n\ntype AcceptedFileType = {\n  label: string\n  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"]\n}\n\ntype FileUploadProps = {\n  accept?: string\n  acceptedFileTypes?: AcceptedFileType[]\n  borderBeamTheme?: React.ComponentProps<typeof BorderBeam>["theme"]\n  browseLabel?: string\n  className?: string\n  description?: string\n  draggingLabel?: string\n  multiple?: boolean\n  showBorderBeam?: boolean\n  showFileList?: boolean\n  title?: string\n  onFilesAccepted?: (files: File[]) => void\n  onFilesChange?: (files: FileUploadItem[]) => void\n}\n\nconst ACCEPTED_FILE_TYPES: AcceptedFileType[] = [\n  { label: "Image", icon: FileImageIcon },\n  { label: "PDF", icon: FileUploadIcon },\n  { label: "Sheet", icon: FileSpreadsheetIcon },\n]\nconst ICON_TRANSFORMS = [\n  {\n    idle: "translate(-78%, -50%) rotate(-8deg)",\n    active: "translate(-114%, -50%) rotate(-12deg) scale(1.08)",\n  },\n  {\n    idle: "translate(-50%, -50%) rotate(0deg)",\n    active: "translate(-50%, -50%) rotate(0deg) scale(1.18)",\n  },\n  {\n    idle: "translate(-22%, -50%) rotate(8deg)",\n    active: "translate(14%, -50%) rotate(12deg) scale(1.08)",\n  },\n]\n\nfunction formatBytes(bytes: number) {\n  if (bytes === 0) return "0 B"\n\n  const units = ["B", "KB", "MB", "GB"]\n  const index = Math.min(\n    Math.floor(Math.log(bytes) / Math.log(1024)),\n    units.length - 1\n  )\n\n  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${\n    units[index]\n  }`\n}\n\nfunction matchesAccept(file: File, accept?: string) {\n  if (!accept) return true\n\n  return accept.split(",").some((rawToken) => {\n    const token = rawToken.trim().toLowerCase()\n\n    if (!token) return false\n    if (token.startsWith(".")) return file.name.toLowerCase().endsWith(token)\n    if (token.endsWith("/*")) {\n      return file.type.toLowerCase().startsWith(token.slice(0, -1))\n    }\n\n    return file.type.toLowerCase() === token\n  })\n}\n\nfunction toUploadItems(files: FileList | File[]): FileUploadItem[] {\n  return Array.from(files).map((file) => ({\n    id: `${file.name}-${file.size}-${file.lastModified}`,\n    name: file.name,\n    type: file.type || "Unknown type",\n    size: file.size,\n    url: URL.createObjectURL(file),\n  }))\n}\n\nfunction UploadIconCluster({\n  acceptedFileTypes,\n  isDragging,\n}: {\n  acceptedFileTypes: AcceptedFileType[]\n  isDragging: boolean\n}) {\n  const singleIcon = acceptedFileTypes.length === 1\n\n  return (\n    <div className="relative h-14 w-36">\n      {acceptedFileTypes.map((item, index) => (\n        <Card\n          key={item.label}\n          className={cn(\n            "absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-xl bg-background text-muted-foreground transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:rounded-[calc(var(--radius-xl)-1px)]",\n            "motion-reduce:transition-none",\n            index === 1 && "z-10",\n            isDragging && "bg-accent text-foreground"\n          )}\n          style={{\n            transform: singleIcon\n              ? `translate(-50%, -50%) scale(${isDragging ? 1.14 : 1})`\n              : isDragging\n                ? ICON_TRANSFORMS[index]?.active\n                : ICON_TRANSFORMS[index]?.idle,\n          }}\n        >\n          <HugeiconsIcon icon={item.icon} className="size-5" />\n        </Card>\n      ))}\n    </div>\n  )\n}\n\nexport function FileUpload({\n  accept,\n  acceptedFileTypes = ACCEPTED_FILE_TYPES,\n  borderBeamTheme = "light",\n  browseLabel = "Browse files",\n  className,\n  description = "PDF, DOCX, XLSX, CSV, PNG, or JPG",\n  draggingLabel = "Drop to add",\n  multiple = true,\n  showBorderBeam = true,\n  showFileList = true,\n  title = "Click to upload or drop files",\n  onFilesAccepted,\n  onFilesChange,\n}: FileUploadProps) {\n  const dragDepthRef = React.useRef(0)\n  const [isDragging, setIsDragging] = React.useState(false)\n  const [files, setFiles] = React.useState<FileUploadItem[]>([])\n  const [rejectionMessage, setRejectionMessage] = React.useState<string | null>(\n    null\n  )\n\n  const commitFiles = React.useCallback(\n    (nextFiles: FileList | File[]) => {\n      const acceptedFiles = Array.from(nextFiles)\n        .filter((file) => matchesAccept(file, accept))\n        .slice(0, multiple ? undefined : 1)\n\n      if (acceptedFiles.length === 0) {\n        setRejectionMessage("This file type is not supported here.")\n        return\n      }\n\n      setRejectionMessage(null)\n      onFilesAccepted?.(acceptedFiles)\n\n      const items = toUploadItems(acceptedFiles)\n      setFiles((previousFiles) => {\n        previousFiles.forEach((file) => URL.revokeObjectURL(file.url))\n        return items\n      })\n      onFilesChange?.(items)\n    },\n    [accept, multiple, onFilesAccepted, onFilesChange]\n  )\n\n  React.useEffect(() => {\n    return () => {\n      files.forEach((file) => URL.revokeObjectURL(file.url))\n    }\n  }, [files])\n\n  const dropzone = (\n    <label\n      className={cn(\n        "relative flex min-h-64 cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-[1.125rem] border border-dashed bg-background px-6 py-10 text-center transition-[border-color,background-color] duration-200 ease-out",\n        "motion-reduce:transition-none",\n        isDragging\n          ? "border-foreground/40 bg-accent/35"\n          : "border-border hover:border-foreground/30 hover:bg-muted/35"\n      )}\n      onDragEnter={(event) => {\n        event.preventDefault()\n        dragDepthRef.current += 1\n        setIsDragging(true)\n      }}\n      onDragLeave={(event) => {\n        event.preventDefault()\n        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)\n        if (dragDepthRef.current === 0) setIsDragging(false)\n      }}\n      onDragOver={(event) => event.preventDefault()}\n      onDrop={(event) => {\n        event.preventDefault()\n        dragDepthRef.current = 0\n        setIsDragging(false)\n        if (event.dataTransfer.files.length > 0) {\n          commitFiles(event.dataTransfer.files)\n        }\n      }}\n    >\n      <UploadIconCluster\n        acceptedFileTypes={acceptedFileTypes}\n        isDragging={isDragging}\n      />\n      <div className="space-y-1">\n        <div className="text-sm font-medium">{title}</div>\n        <div className="text-xs text-muted-foreground">{description}</div>\n        {rejectionMessage ? (\n          <div className="text-xs text-destructive">{rejectionMessage}</div>\n        ) : null}\n      </div>\n      <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">\n        <HugeiconsIcon icon={Upload01Icon} className="size-3.5" />\n        <span>{isDragging ? draggingLabel : browseLabel}</span>\n      </div>\n      <input\n        type="file"\n        accept={accept}\n        multiple={multiple}\n        className="sr-only"\n        onChange={(event) => {\n          if (event.target.files) {\n            commitFiles(event.target.files)\n            event.currentTarget.value = ""\n          }\n        }}\n      />\n    </label>\n  )\n\n  return (\n    <div className={cn("space-y-3", className)}>\n      {showBorderBeam ? (\n        <BorderBeam\n          active={isDragging}\n          borderRadius={18}\n          brightness={2.4}\n          className="rounded-[1.125rem]"\n          colorVariant="ocean"\n          duration={2.4}\n          size="md"\n          strength={1}\n          theme={borderBeamTheme}\n        >\n          {dropzone}\n        </BorderBeam>\n      ) : (\n        dropzone\n      )}\n      {showFileList && files.length > 0 ? (\n        <div className="rounded-xl border bg-background">\n          {files.map((file) => (\n            <div\n              key={file.id}\n              className="flex items-center gap-3 border-b px-3 py-2.5 last:border-b-0"\n            >\n              <FileThumbnail\n                file={{\n                  name: file.name,\n                  type: file.type,\n                  size: formatBytes(file.size),\n                }}\n                previewImageUrl={\n                  file.type.startsWith("image/") ? file.url : null\n                }\n                className="size-10 shrink-0 rounded-lg"\n                showMetadata={false}\n              />\n              <div className="min-w-0 flex-1">\n                <div className="truncate text-sm font-medium">{file.name}</div>\n                <div className="truncate text-xs text-muted-foreground">\n                  {file.type} - {formatBytes(file.size)}\n                </div>\n              </div>\n              <div className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">\n                Ready\n              </div>\n            </div>\n          ))}\n        </div>\n      ) : null}\n    </div>\n  )\n}'

export function FileUploadSource() {
  return <HighlightedCodeBlock code={fileUploadUsageCode} />
}
