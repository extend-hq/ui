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
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileThumbnail } from "@/components/file-thumbnail-docs"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"
import { Card } from "@/registry/new-york-v4/ui/card"

type FileUploadItem = {
  id: string
  name: string
  type: string
  size: number
  url: string
}

type FileUploadProps = {
  className?: string
  onFilesChange?: (files: FileUploadItem[]) => void
}

const ACCEPTED_FILE_TYPES = [
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

function UploadIconCluster({ isDragging }: { isDragging: boolean }) {
  return (
    <div className="relative h-14 w-36">
      {ACCEPTED_FILE_TYPES.map((item, index) => (
        <Card
          key={item.label}
          className={cn(
            "absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-xl bg-background text-muted-foreground transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:rounded-[calc(var(--radius-xl)-1px)]",
            "motion-reduce:transition-none",
            index === 1 && "z-10",
            isDragging && "bg-accent text-foreground"
          )}
          style={{
            transform: isDragging
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

export function FileUpload({ className, onFilesChange }: FileUploadProps) {
  const dragDepthRef = React.useRef(0)
  const { resolvedTheme } = useTheme()
  const [isDragging, setIsDragging] = React.useState(false)
  const [files, setFiles] = React.useState<FileUploadItem[]>([])
  const borderBeamTheme: React.ComponentProps<typeof BorderBeam>["theme"] =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "light"
        ? "light"
        : "auto"

  const commitFiles = React.useCallback(
    (nextFiles: FileList | File[]) => {
      const items = toUploadItems(nextFiles)
      setFiles((previousFiles) => {
        previousFiles.forEach((file) => URL.revokeObjectURL(file.url))
        return items
      })
      onFilesChange?.(items)
    },
    [onFilesChange]
  )

  React.useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.url))
    }
  }, [files])

  return (
    <div className={cn("space-y-3", className)}>
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
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                commitFiles(event.target.files)
              }
            }}
          />
          <UploadIconCluster isDragging={isDragging} />
          <div className="space-y-1">
            <div className="text-sm font-medium">
              Click to upload or drop files
            </div>
            <div className="text-xs text-muted-foreground">
              PDF, DOCX, XLSX, CSV, PNG, or JPG
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Upload01Icon} className="size-3.5" />
            <span>{isDragging ? "Drop to add" : "Browse files"}</span>
          </div>
        </label>
      </BorderBeam>
      {files.length > 0 ? (
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
                  url: file.url,
                  size: formatBytes(file.size),
                }}
                className="size-10 shrink-0 rounded-lg"
                showMetadata={false}
                thumbnailWidth={56}
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
                className="relative z-10 rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted"
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

const fileUploadUsageCode = `"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { BorderBeam } from "border-beam";
import {
  FileImageIcon,
  FileSpreadsheetIcon,
  FileUploadIcon,
  Upload01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { FileThumbnail } from "@/components/ui/file-thumbnail";

type FileUploadItem = {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
};

type FileUploadProps = {
  className?: string;
  onFilesChange?: (files: FileUploadItem[]) => void;
};

const ACCEPTED_FILE_TYPES = [
  { label: "Image", icon: FileImageIcon },
  { label: "PDF", icon: FileUploadIcon },
  { label: "Sheet", icon: FileSpreadsheetIcon },
];
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
];

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  return \`\${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} \${units[index]}\`;
}

function toUploadItems(files: FileList | File[]): FileUploadItem[] {
  return Array.from(files).map((file) => ({
    id: \`\${file.name}-\${file.size}-\${file.lastModified}\`,
    name: file.name,
    type: file.type || "Unknown type",
    size: file.size,
    url: URL.createObjectURL(file),
  }));
}

function UploadIconCluster({ isDragging }: { isDragging: boolean }) {
  return (
    <div className="relative h-14 w-36">
      {ACCEPTED_FILE_TYPES.map((item, index) => (
        <Card
          key={item.label}
          className={cn(
            "absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-xl bg-background text-muted-foreground transition-[transform,color,background-color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] before:rounded-[calc(var(--radius-xl)-1px)]",
            "motion-reduce:transition-none",
            index === 1 && "z-10",
            isDragging && "bg-accent text-foreground",
          )}
          style={{
            transform: isDragging
              ? ICON_TRANSFORMS[index]?.active
              : ICON_TRANSFORMS[index]?.idle,
          }}
        >
          <HugeiconsIcon icon={item.icon} className="size-5" />
        </Card>
      ))}
    </div>
  );
}

export function FileUpload({ className, onFilesChange }: FileUploadProps) {
  const dragDepthRef = React.useRef(0);
  const { resolvedTheme } = useTheme();
  const [isDragging, setIsDragging] = React.useState(false);
  const [files, setFiles] = React.useState<FileUploadItem[]>([]);
  const borderBeamTheme: React.ComponentProps<typeof BorderBeam>["theme"] =
    resolvedTheme === "dark"
      ? "dark"
      : resolvedTheme === "light"
        ? "light"
        : "auto";

  const commitFiles = React.useCallback(
    (nextFiles: FileList | File[]) => {
      const items = toUploadItems(nextFiles);
      setFiles((previousFiles) => {
        previousFiles.forEach((file) => URL.revokeObjectURL(file.url));
        return items;
      });
      onFilesChange?.(items);
    },
    [onFilesChange],
  );

  React.useEffect(() => {
    return () => {
      files.forEach((file) => URL.revokeObjectURL(file.url));
    };
  }, [files]);

  return (
    <div className={cn("space-y-3", className)}>
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
        <label
          className={cn(
            "relative flex min-h-64 cursor-pointer flex-col items-center justify-center gap-5 overflow-hidden rounded-[1.125rem] border border-dashed bg-background px-6 py-10 text-center transition-[border-color,background-color] duration-200 ease-out",
            "motion-reduce:transition-none",
            isDragging
              ? "border-foreground/40 bg-accent/35"
              : "border-border hover:border-foreground/30 hover:bg-muted/35",
          )}
          onDragEnter={(event) => {
            event.preventDefault();
            dragDepthRef.current += 1;
            setIsDragging(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) {
              setIsDragging(false);
            }
          }}
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepthRef.current = 0;
            setIsDragging(false);

            if (event.dataTransfer.files.length > 0) {
              commitFiles(event.dataTransfer.files);
            }
          }}
        >
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files) {
                commitFiles(event.target.files);
              }
            }}
          />
          <UploadIconCluster isDragging={isDragging} />
          <div className="space-y-1">
            <div className="text-sm font-medium">
              Click to upload or drop files
            </div>
            <div className="text-xs text-muted-foreground">
              PDF, DOCX, XLSX, CSV, PNG, or JPG
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
            <HugeiconsIcon icon={Upload01Icon} className="size-3.5" />
            <span>{isDragging ? "Drop to add" : "Browse files"}</span>
          </div>
        </label>
      </BorderBeam>
      {files.length > 0 ? (
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
                  url: file.url,
                  size: formatBytes(file.size),
                }}
                className="size-10 shrink-0 rounded-lg"
                showMetadata={false}
                thumbnailWidth={56}
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
  );
}`

export function FileUploadSource() {
  return <HighlightedCodeBlock code={fileUploadUsageCode} />
}
