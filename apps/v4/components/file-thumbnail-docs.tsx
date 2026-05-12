"use client"

import * as React from "react"
import { File01Icon, FileImageIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as ReactPdf from "react-pdf"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { HighlightedCodeBlock } from "@/components/highlighted-code-block"

type ThumbnailFile = {
  name: string
  type: string
  url: string
  size?: string
}

type FileThumbnailProps = {
  file: ThumbnailFile
  className?: string
  showMetadata?: boolean
  thumbnailWidth?: number
}

type ReactPdfModule = typeof ReactPdf

const SAMPLE_FILES: ThumbnailFile[] = [
  {
    name: "attention.pdf",
    type: "application/pdf",
    url: "/samples/attention.pdf",
    size: "15 pages",
  },
  {
    name: "opengraph-image.png",
    type: "image/png",
    url: "/opengraph-image.png",
    size: "1200 x 630",
  },
]

function isPdfFile(file: ThumbnailFile) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  )
}

function isImageFile(file: ThumbnailFile) {
  return file.type.startsWith("image/")
}

function useLazyRender<TElement extends HTMLElement>() {
  const ref = React.useRef<TElement | null>(null)
  const [shouldRender, setShouldRender] = React.useState(false)

  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true)
          observer.disconnect()
        }
      },
      { rootMargin: "200px" }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [])

  return { ref, shouldRender }
}

function FileKindIcon({ file }: { file: ThumbnailFile }) {
  const icon = isImageFile(file) ? FileImageIcon : File01Icon

  return <HugeiconsIcon icon={icon} className="size-4" />
}

function ThumbnailLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-muted">
      <style>{`
        @keyframes file-thumbnail-preview-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .file-thumbnail-preview-shimmer {
            animation: none !important;
            transform: translateX(0);
            opacity: 0.55;
          }
        }
      `}</style>
      <div className="absolute inset-0 bg-muted" />
      <div
        className="file-thumbnail-preview-shimmer absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-background/65 to-transparent"
        style={{
          animation:
            "file-thumbnail-preview-shimmer 1.25s ease-in-out infinite",
        }}
      />
    </div>
  )
}

export function FileThumbnail({
  file,
  className,
  showMetadata = true,
  thumbnailWidth = 260,
}: FileThumbnailProps) {
  const isPdf = isPdfFile(file)
  const isImage = isImageFile(file)
  const { ref, shouldRender } = useLazyRender<HTMLDivElement>()
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null)
  const [isLoading, setIsLoading] = React.useState(isPdf || isImage)
  const [hasError, setHasError] = React.useState(false)

  React.useEffect(() => {
    setIsLoading(isPdf || isImage)
    setHasError(false)
  }, [file.url, isImage, isPdf])

  React.useEffect(() => {
    if (!isPdf || !shouldRender) return

    let mounted = true
    setIsLoading(true)

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${module.pdfjs.version}/legacy/build/pdf.worker.min.mjs`

        if (mounted) {
          setReactPdf(module)
        }
      })
      .catch(() => {
        if (mounted) {
          setHasError(true)
          setIsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [isPdf, shouldRender])

  return (
    <div
      ref={ref}
      className={cn(
        "group overflow-hidden rounded-lg border bg-background text-foreground",
        className
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {isPdf && shouldRender && reactPdf ? (
          <reactPdf.Document
            file={file.url}
            loading={null}
            error={null}
            noData={null}
            onLoadError={() => {
              setHasError(true)
              setIsLoading(false)
            }}
          >
            <reactPdf.Thumbnail
              pageNumber={1}
              width={thumbnailWidth}
              loading={null}
              error={null}
              onRenderSuccess={() => setIsLoading(false)}
              onRenderError={() => {
                setHasError(true)
                setIsLoading(false)
              }}
              className="flex size-full items-center justify-center [&_canvas]:!h-full [&_canvas]:!w-full [&_canvas]:object-cover"
            />
          </reactPdf.Document>
        ) : null}
        {isImage ? (
          <img
            src={file.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true)
              setIsLoading(false)
            }}
          />
        ) : null}
        {isLoading && !hasError ? <ThumbnailLoadingOverlay /> : null}
        {hasError || (!isPdf && !isImage) ? (
          <div className="absolute inset-0 grid place-items-center bg-muted text-muted-foreground">
            <FileKindIcon file={file} />
          </div>
        ) : null}
      </div>
      {showMetadata ? (
        <div className="flex items-center gap-2 border-t px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <FileKindIcon file={file} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {file.size ?? file.type}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function FileThumbnailDemo() {
  const [isCodeVisible, setIsCodeVisible] = React.useState(false)

  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <div className="grid gap-6 bg-background p-6 sm:grid-cols-2">
        {SAMPLE_FILES.map((file) => (
          <div key={file.url} className="space-y-2">
            <div className="text-sm font-medium">
              {isPdfFile(file) ? "PDF" : "Image"}
            </div>
            <FileThumbnail file={file} showMetadata={false} />
          </div>
        ))}
      </div>
      <div
        data-slot="code"
        data-mobile-code-visible={isCodeVisible}
        className="relative overflow-hidden **:data-[slot=copy-button]:right-4 **:data-[slot=copy-button]:hidden data-[mobile-code-visible=true]:**:data-[slot=copy-button]:flex [&_[data-rehype-pretty-code-figure]]:m-0! [&_[data-rehype-pretty-code-figure]]:rounded-t-none [&_[data-rehype-pretty-code-figure]]:border-t [&_pre]:max-h-72"
      >
        {isCodeVisible ? (
          <HighlightedCodeBlock
            code={fileThumbnailDemoCode}
            className="rounded-none border-x-0 border-b-0"
          />
        ) : (
          <div className="relative">
            <HighlightedCodeBlock
              code={fileThumbnailDemoCode}
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

const fileThumbnailDemoCode = `import { FileThumbnail } from "@/components/ui/file-thumbnail";

const files = [
  {
    label: "PDF",
    file: {
      name: "attention.pdf",
      type: "application/pdf",
      url: "/samples/attention.pdf",
      size: "15 pages",
    },
  },
  {
    label: "Image",
    file: {
      name: "opengraph-image.png",
      type: "image/png",
      url: "/opengraph-image.png",
      size: "1200 x 630",
    },
  },
];

export function FileThumbnailExample() {
  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {files.map((item) => (
        <div key={item.file.url} className="space-y-2">
          <div className="text-sm font-medium">{item.label}</div>
          <FileThumbnail file={item.file} showMetadata={false} />
        </div>
      ))}
    </div>
  );
}`

const fileThumbnailUsageCode = `"use client";

import * as React from "react";
import type * as ReactPdf from "react-pdf";
import { File01Icon, FileImageIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { cn } from "@/lib/utils";

type ThumbnailFile = {
  name: string;
  type: string;
  url: string;
  size?: string;
};

type FileThumbnailProps = {
  file: ThumbnailFile;
  className?: string;
  showMetadata?: boolean;
  thumbnailWidth?: number;
};

type ReactPdfModule = typeof ReactPdf;

function isPdfFile(file: ThumbnailFile) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isImageFile(file: ThumbnailFile) {
  return file.type.startsWith("image/");
}

function useLazyRender<TElement extends HTMLElement>() {
  const ref = React.useRef<TElement | null>(null);
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, shouldRender };
}

function FileKindIcon({ file }: { file: ThumbnailFile }) {
  const icon = isImageFile(file) ? FileImageIcon : File01Icon;

  return <HugeiconsIcon icon={icon} className="size-4" />;
}

function ThumbnailLoadingOverlay() {
  return (
    <div className="absolute inset-0 z-10 overflow-hidden bg-muted">
      <style>{\`
        @keyframes file-thumbnail-preview-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .file-thumbnail-preview-shimmer {
            animation: none !important;
            transform: translateX(0);
            opacity: 0.55;
          }
        }
      \`}</style>
      <div className="absolute inset-0 bg-muted" />
      <div
        className="file-thumbnail-preview-shimmer absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-background/65 to-transparent"
        style={{
          animation: "file-thumbnail-preview-shimmer 1.25s ease-in-out infinite",
        }}
      />
    </div>
  );
}

export function FileThumbnail({
  file,
  className,
  showMetadata = true,
  thumbnailWidth = 260,
}: FileThumbnailProps) {
  const isPdf = isPdfFile(file);
  const isImage = isImageFile(file);
  const { ref, shouldRender } = useLazyRender<HTMLDivElement>();
  const [reactPdf, setReactPdf] = React.useState<ReactPdfModule | null>(null);
  const [isLoading, setIsLoading] = React.useState(isPdf || isImage);
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setIsLoading(isPdf || isImage);
    setHasError(false);
  }, [file.url, isImage, isPdf]);

  React.useEffect(() => {
    if (!isPdf || !shouldRender) return;

    let mounted = true;
    setIsLoading(true);

    void import("react-pdf")
      .then((module) => {
        module.pdfjs.GlobalWorkerOptions.workerSrc =
          "https://unpkg.com/pdfjs-dist@" +
          module.pdfjs.version +
          "/legacy/build/pdf.worker.min.mjs";

        if (mounted) {
          setReactPdf(module);
        }
      })
      .catch(() => {
        if (mounted) {
          setHasError(true);
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isPdf, shouldRender]);

  return (
    <div
      ref={ref}
      className={cn(
        "group overflow-hidden rounded-lg border bg-background text-foreground",
        className,
      )}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {isPdf && shouldRender && reactPdf ? (
          <reactPdf.Document
            file={file.url}
            loading={null}
            error={null}
            noData={null}
            onLoadError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          >
            <reactPdf.Thumbnail
              pageNumber={1}
              width={thumbnailWidth}
              loading={null}
              error={null}
              onRenderSuccess={() => setIsLoading(false)}
              onRenderError={() => {
                setHasError(true);
                setIsLoading(false);
              }}
              className="flex size-full items-center justify-center [&_canvas]:!h-full [&_canvas]:!w-full [&_canvas]:object-cover"
            />
          </reactPdf.Document>
        ) : null}
        {isImage ? (
          <img
            src={file.url}
            alt=""
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        ) : null}
        {isLoading && !hasError ? (
          <ThumbnailLoadingOverlay />
        ) : null}
        {hasError || (!isPdf && !isImage) ? (
          <div className="absolute inset-0 grid place-items-center bg-muted text-muted-foreground">
            <FileKindIcon file={file} />
          </div>
        ) : null}
      </div>
      {showMetadata ? (
        <div className="flex items-center gap-2 border-t px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <FileKindIcon file={file} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{file.name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {file.size ?? file.type}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}`

export function FileThumbnailSource() {
  return <HighlightedCodeBlock code={fileThumbnailUsageCode} />
}
