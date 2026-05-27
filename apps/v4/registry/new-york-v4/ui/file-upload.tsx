"use client"

import * as React from "react"
import {
  FileImageIcon,
  FileSpreadsheetIcon,
  FileUploadIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { cn } from "@/lib/utils"
import { FileThumbnail } from "@/components/ui/file-thumbnail"

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
  browseLabel?: string
  className?: string
  description?: string
  draggingLabel?: string
  multiple?: boolean
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

function matchesAccept(file: File, accept?: string) {
  if (!accept) return true

  return accept.split(",").some((rawToken) => {
    const token = rawToken.trim().toLowerCase()

    if (!token) return false
    if (token.startsWith(".")) return file.name.toLowerCase().endsWith(token)
    if (token.endsWith("/*")) {
      return file.type.toLowerCase().startsWith(token.slice(0, -1))
    }

    return file.type.toLowerCase() === token
  })
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

export function FileUpload({
  accept,
  acceptedFileTypes = ACCEPTED_FILE_TYPES,
  browseLabel = "Browse files",
  className,
  description = "PDF, DOCX, XLSX, CSV, PNG, or JPG",
  draggingLabel = "Drop to add",
  multiple = true,
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
        setRejectionMessage("This file type is not supported here.")
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

  return (
    <div className={cn("space-y-3", className)}>
      <label
        className={cn(
          "relative flex min-h-64 cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-2xl border border-dashed bg-background px-6 py-10 text-center transition-colors",
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
          if (dragDepthRef.current === 0) setIsDragging(false)
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault()
          dragDepthRef.current = 0
          setIsDragging(false)
          if (event.dataTransfer.files.length > 0) {
            commitFiles(event.dataTransfer.files)
          }
        }}
      >
        <div className="flex items-center justify-center gap-2">
          {acceptedFileTypes.map((item) => (
            <div
              key={item.label}
              className={cn(
                "grid size-12 place-items-center rounded-xl border bg-background text-muted-foreground transition-colors",
                isDragging && "bg-accent text-foreground"
              )}
            >
              <HugeiconsIcon icon={item.icon} className="size-5" />
            </div>
          ))}
        </div>
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
