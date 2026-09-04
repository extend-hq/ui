"use client"

import * as React from "react"
import { createPluginRegistration } from "@embedpdf/core"
import {
  EmbedPDF,
  PDFContext,
  useDocumentPermissions,
  useRegistry,
} from "@embedpdf/core/react"
import {
  PdfAnnotationSubtype,
  PdfErrorCode,
  PdfPageFlattenFlag,
  uuidV4,
  type PdfAnnotationObject,
  type PdfDocumentObject,
  type PdfEngine,
  type PdfLinkAnnoObject,
  type PdfPrintOptions,
} from "@embedpdf/models"
import {
  AnnotationLayer,
  AnnotationPluginPackage,
  getSelectedAnnotations,
  LockModeType,
  useAnnotation,
  useAnnotationCapability,
  type AnnotationEvent,
  type AnnotationSelectionMenuProps,
  type AnnotationTransferItem,
  type GroupSelectionMenuProps,
} from "@embedpdf/plugin-annotation/react"
import { AttachmentPluginPackage } from "@embedpdf/plugin-attachment/react"
import { BookmarkPluginPackage } from "@embedpdf/plugin-bookmark/react"
import {
  CapturePluginPackage,
  MarqueeCapture,
  useCapture,
  type CaptureAreaEvent,
} from "@embedpdf/plugin-capture/react"
import {
  DocumentManagerPluginPackage,
  useActiveDocument,
  useDocumentManagerCapability,
} from "@embedpdf/plugin-document-manager/react"
import { ExportPluginPackage, useExport } from "@embedpdf/plugin-export/react"
import {
  FormPluginPackage,
  useFormCapability,
} from "@embedpdf/plugin-form/react"
import {
  FullscreenPluginPackage,
  useFullscreen,
} from "@embedpdf/plugin-fullscreen/react"
import {
  HistoryPluginPackage,
  useHistoryCapability,
} from "@embedpdf/plugin-history/react"
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from "@embedpdf/plugin-interaction-manager/react"
import { PanPluginPackage, usePan } from "@embedpdf/plugin-pan/react"
import { PrintPluginPackage, usePrint } from "@embedpdf/plugin-print/react"
import {
  RedactionLayer,
  RedactionMode,
  RedactionPluginPackage,
  useRedaction,
  type RedactionSelectionMenuProps,
} from "@embedpdf/plugin-redaction/react"
import { RenderLayer, RenderPluginPackage } from "@embedpdf/plugin-render/react"
import {
  Rotate,
  RotatePluginPackage,
  useRotate,
} from "@embedpdf/plugin-rotate/react"
import {
  Scroller,
  ScrollPluginPackage,
  ScrollStrategy,
  useScroll,
  useScrollCapability,
  type PageLayout,
} from "@embedpdf/plugin-scroll/react"
import {
  SearchLayer,
  SearchPluginPackage,
  useSearch,
} from "@embedpdf/plugin-search/react"
import {
  CopyToClipboard,
  SelectionLayer,
  SelectionPluginPackage,
  useSelectionCapability,
  type SelectionSelectionMenuProps,
} from "@embedpdf/plugin-selection/react"
import {
  deserializeEntries,
  serializeEntries,
  SignatureMode,
  SignaturePluginPackage,
  useSignatureCapability,
} from "@embedpdf/plugin-signature/react"
import {
  SpreadMode,
  SpreadPluginPackage,
  useSpread,
} from "@embedpdf/plugin-spread/react"
import { StampPluginPackage } from "@embedpdf/plugin-stamp/react"
import { ThumbnailPluginPackage } from "@embedpdf/plugin-thumbnail/react"
import { TilingLayer, TilingPluginPackage } from "@embedpdf/plugin-tiling/react"
import {
  useIsViewportGated,
  useViewportCapability,
  useViewportElement,
  useViewportRef,
  ViewportElementContext,
  ViewportPluginPackage,
} from "@embedpdf/plugin-viewport/react"
import {
  MarqueeZoom,
  useZoom,
  ZoomMode,
  ZoomPluginPackage,
} from "@embedpdf/plugin-zoom/react"

import { loadSharedPdfEngine } from "@/lib/pdf-thumbnail-utils"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ColorPicker } from "@/components/ui/color-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { ToastPrimitive, ToastProvider } from "@/components/ui/toast"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  useElementWidth,
  useInlineThumbnailSidebar,
} from "@/components/extend/document-viewer-sidebar"
import {
  PdfEditorCaptureDialog,
  PdfEditorConfirmDialog,
  PdfEditorLinkDialog,
  PdfEditorPasswordPrompt,
  PdfEditorPrintDialog,
  PdfEditorPropertiesDialog,
  PdfEditorSecurityDialog,
  PdfEditorShortcutsDialog,
  PdfEditorSignatureDialog,
} from "@/components/extend/pdf-editor-dialogs"
import {
  PdfEditorAttachmentsPanel,
  PdfEditorCommentsPanel,
  PdfEditorFormsPanel,
  PdfEditorOutlinePanel,
  PdfEditorPagesPanel,
  PdfEditorRedactionsPanel,
  PdfEditorSignaturesPanel,
  PdfEditorStampsPanel,
  PdfEditorThumbnailsPanel,
} from "@/components/extend/pdf-editor-panels"
import { PdfEditorPropertiesPanel } from "@/components/extend/pdf-editor-properties"
import {
  BookOpenGlyph,
  CameraGlyph,
  ChevronLeftGlyph,
  ChevronRightGlyph,
  CloseGlyph,
  CommentGlyph,
  CommentsGlyph,
  CopyGlyph,
  CursorGlyph,
  downloadArrayBuffer,
  downloadBlob,
  DownloadGlyph,
  EditGlyph,
  ExitFullscreenGlyph,
  ExternalLinkGlyph,
  EyeOffGlyph,
  FileTextGlyph,
  FullscreenGlyph,
  getPdfFileName,
  GridGlyph,
  GroupGlyph,
  HandGlyph,
  HighlighterGlyph,
  InfoGlyph,
  isTypingTarget,
  KeyboardGlyph,
  LayersGlyph,
  LinkGlyph,
  ListTreeGlyph,
  LockGlyph,
  MarqueeZoomGlyph,
  MoreGlyph,
  noop,
  PaletteGlyph,
  PanelLeftGlyph,
  PanelRightGlyph,
  PaperclipGlyph,
  PDF_EDITOR_ANNOTATION_TOOL_GROUPS,
  PDF_EDITOR_DEFAULT_COLOR_PRESETS,
  PDF_EDITOR_DEFAULT_FEATURES,
  PDF_EDITOR_DEFAULT_SIGNATURE_FONTS_URL,
  PDF_EDITOR_DEFAULT_STAMP_MANIFEST_URL,
  PDF_EDITOR_FORM_TOOLS,
  PDF_EDITOR_MODE_OPTIONS,
  PDF_EDITOR_SELECTION_COLOR,
  PdfEditorContextProvider,
  PdfEditorScrollArea,
  PdfEditorScrollAreaResolverContext,
  PdfEditorToolbarSeparator,
  PdfEditorToolButton,
  PdfEditorTooltip,
  PlusGlyph,
  PrintGlyph,
  RedactAreaGlyph,
  RedoGlyph,
  resolveDefaultScrollAreaViewport,
  RotateGlyph,
  SearchGlyph,
  ShieldGlyph,
  SignatureGlyph,
  SlidersGlyph,
  StampGlyph,
  StrikethroughGlyph,
  TextFieldGlyph,
  TextGlyph,
  toNormalizedRect,
  TrashGlyph,
  UnderlineGlyph,
  UndoGlyph,
  UngroupGlyph,
  UnlockGlyph,
  UploadGlyph,
  usePdfEditor,
  ZoomInGlyph,
  ZoomOutGlyph,
  type PdfEditorContextValue,
  type PdfEditorDialogRequest,
  type PdfEditorFeatureFlags,
  type PdfEditorGlyph,
  type PdfEditorLeftPanel,
  type PdfEditorMode,
  type PdfEditorNoticeTone,
  type PdfEditorResolvedFeatures,
  type PdfEditorRightPanel,
  type PdfEditorScrollAreaViewportResolver,
  type PdfEditorSelectionAction,
  type PdfEditorSelectionPage,
  type PdfEditorSelectionPayload,
} from "@/components/extend/pdf-editor-shared"
import { PdfEditorWorkspace } from "@/components/extend/pdf-editor-workspace"

export type {
  PdfEditorFeatureFlags,
  PdfEditorLeftPanel,
  PdfEditorMode,
  PdfEditorNormalizedRect,
  PdfEditorRightPanel,
  PdfEditorSelectionAction,
  PdfEditorSelectionPayload,
} from "@/components/extend/pdf-editor-shared"

/* -------------------------------------------------------------------------- */
/* Public types                                                               */
/* -------------------------------------------------------------------------- */

export type PDFEditorPageOverlayProps = {
  pageNumber: number
  pageWidth: number
  pageHeight: number
  scale: number
  rotation: number
}

export type PDFEditorZoomLevel = number | "fit-page" | "fit-width" | "automatic"

export type PDFEditorToast = {
  message: string
  tone: PdfEditorNoticeTone
}

export type PDFEditorHandle = {
  /** Current PDF bytes including annotations, form values, and pending security changes. */
  getDocumentBuffer: () => Promise<ArrayBuffer>
  download: (fileName?: string) => Promise<void>
  print: (options?: PdfPrintOptions) => Promise<void>
  exportAnnotations: () => Promise<AnnotationTransferItem[]>
  importAnnotations: (items: AnnotationTransferItem[]) => void
  getFormValues: () => Record<string, string>
  setFormValues: (values: Record<string, string>) => Promise<void>
  /** Permanently applies every pending redaction mark. */
  applyRedactions: () => Promise<void>
  setMode: (mode: PdfEditorMode) => void
  /** Activates an EmbedPDF annotation tool id such as `highlight` or `ink`; `null` returns to selection. */
  setActiveTool: (toolId: string | null) => void
  scrollToPage: (pageNumber: number, options?: ScrollIntoViewOptions) => void
  undo: () => void
  redo: () => void
  getViewportElement: () => HTMLDivElement | null
}

export type PDFEditorProps = {
  className?: string
  /** A URL, or the PDF bytes as an ArrayBuffer, Uint8Array, Blob, or File. */
  src?: string | ArrayBuffer | Uint8Array | Blob
  fileName?: string
  defaultZoom?: PDFEditorZoomLevel
  defaultMode?: PdfEditorMode
  /** Author written into new annotations. Defaults to "Guest". */
  annotationAuthor?: string
  colorPresets?: string[]
  /** Turn individual editing capabilities off. Everything is enabled by default. */
  features?: PdfEditorFeatureFlags
  showToolbar?: boolean
  showUpload?: boolean
  showDownload?: boolean
  toolbarActions?: React.ReactNode
  /** Extra actions for the text selection menu. Each receives normalized page coordinates. */
  selectionActions?: PdfEditorSelectionAction[]
  /** Persist saved signatures in localStorage. Pass a string to use a custom storage key. */
  persistSignatures?: boolean | string
  /** Additional rubber stamp manifests to load next to the built-in library. */
  stampManifests?: string[]
  /** Stylesheet used for the typed-signature fonts. Pass `null` to skip loading web fonts. */
  signatureFontsStylesheetUrl?: string | null
  resolveScrollAreaViewport?: PdfEditorScrollAreaViewportResolver
  renderPageOverlay?: (props: PDFEditorPageOverlayProps) => React.ReactNode
  onDocumentLoadSuccess?: (info: {
    numPages: number
    documentId: string
    fileName: string
  }) => void
  onDocumentLoadError?: (message: string) => void
  onActivePageChange?: (pageNumber: number) => void
  onModeChange?: (mode: PdfEditorMode) => void
  onAnnotationEvent?: (event: AnnotationEvent) => void
  /** Fires with the full annotation set after every committed change (debounced). */
  onAnnotationsChange?: (items: AnnotationTransferItem[]) => void
  onFormValuesChange?: (values: Record<string, string>) => void
  onRedactionsApplied?: () => void
  onSave?: (result: { buffer: ArrayBuffer; fileName: string }) => void
  onCapture?: (event: CaptureAreaEvent) => void
  onPdfUpload?: (file: File) => void
  /** Routes editor notices to a host-owned toast system instead of the built-in viewport. */
  onToast?: (toast: PDFEditorToast) => void
  onSelectionAction?: (
    actionId: string,
    payload: PdfEditorSelectionPayload
  ) => void
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const PAGE_GAP = 24
const THUMBNAIL_PAGE_WIDTH = 92
const THUMBNAIL_IMAGE_PADDING = 8
const THUMBNAIL_WIDTH = THUMBNAIL_PAGE_WIDTH + THUMBNAIL_IMAGE_PADDING * 2
const THUMBNAIL_LABEL_HEIGHT = 24
const THUMBNAIL_GAP = 12
const THUMBNAIL_PANE_PADDING_Y = 16
const RIGHT_PANEL_INLINE_MIN_WIDTH = 1100
const TOOLBAR_STACK_MAX_WIDTH = 640
const ZOOM_PRESETS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4]
const MIN_ZOOM = 0.1
const MAX_ZOOM = 8
const PAGE_BASE_RENDER_MAX_SCALE = 1
const PAGE_BASE_RENDER_DPR = 1
const SEARCH_DEBOUNCE_MS = 300
const NOTICE_DURATION_MS = 4200
const TOOLTIP_DELAY_MS = 5
const SELECTION_MENU_OFFSET = 8
const SELECTION_MENU_HEIGHT = 36
const DEFAULT_SIGNATURE_STORAGE_KEY = "pdf-editor:signatures"
const DEFAULT_ANNOTATION_AUTHOR = "Guest"

const ZOOM_MODE_LABELS: Record<ZoomMode, string> = {
  [ZoomMode.FitPage]: "Fit page",
  [ZoomMode.FitWidth]: "Fit width",
  [ZoomMode.Automatic]: "Automatic",
}
const SPREAD_MODE_OPTIONS = [
  { label: "Single page", value: SpreadMode.None },
  { label: "Two pages", value: SpreadMode.Odd },
  { label: "Two pages, cover", value: SpreadMode.Even },
]
const SCROLL_DIRECTION_OPTIONS = [
  { label: "Scroll down", value: "vertical" },
  { label: "Scroll sideways", value: "horizontal" },
]

function toZoomLevel(level: PDFEditorZoomLevel): ZoomMode | number {
  if (level === "fit-page") return ZoomMode.FitPage
  if (level === "fit-width") return ZoomMode.FitWidth
  if (level === "automatic") return ZoomMode.Automatic
  return level
}

function isZoomMode(value: unknown): value is ZoomMode {
  return (
    value === ZoomMode.FitPage ||
    value === ZoomMode.FitWidth ||
    value === ZoomMode.Automatic
  )
}

/* -------------------------------------------------------------------------- */
/* Engine + document source                                                   */
/* -------------------------------------------------------------------------- */

function useSharedPdfEngine() {
  const [engine, setEngine] = React.useState<PdfEngine | null>(null)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let cancelled = false

    loadSharedPdfEngine().then(
      (loadedEngine) => {
        if (!cancelled) setEngine(loadedEngine)
      },
      (loadError: Error) => {
        if (!cancelled) setError(loadError)
      }
    )

    return () => {
      cancelled = true
    }
  }, [])

  return { engine, error }
}

type EditorSource =
  | { key: string; kind: "url"; url: string; name: string }
  | { key: string; kind: "buffer"; buffer: ArrayBuffer; name: string }

let sourceCounter = 0

function nextSourceKey() {
  sourceCounter += 1
  return `pdf-editor-source-${sourceCounter}`
}

function bytesToArrayBuffer(bytes: Uint8Array) {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

function useEditorSource(
  src: PDFEditorProps["src"],
  fileName: string | undefined
) {
  const sourceId = React.useId()
  const [input, setInput] = React.useState({ src, fileName, version: 0 })
  if (input.src !== src || input.fileName !== fileName) {
    setInput({ src, fileName, version: input.version + 1 })
  }
  const immediateSource = React.useMemo<EditorSource | null>(() => {
    const key = `${sourceId}-${input.version}`
    if (typeof input.src === "string") {
      return {
        key,
        kind: "url",
        url: input.src,
        name: getPdfFileName(input.fileName, input.src),
      }
    }
    if (input.src instanceof ArrayBuffer || input.src instanceof Uint8Array) {
      return {
        key,
        kind: "buffer",
        buffer:
          input.src instanceof ArrayBuffer
            ? input.src.slice(0)
            : bytesToArrayBuffer(input.src),
        name: getPdfFileName(input.fileName),
      }
    }
    return null
  }, [input, sourceId])
  const [resolved, setResolved] = React.useState<{
    input: typeof input
    source: EditorSource
  } | null>(null)

  React.useEffect(() => {
    if (!(input.src instanceof Blob)) return
    let cancelled = false
    const blobName =
      input.fileName ?? (input.src instanceof File ? input.src.name : undefined)
    input.src.arrayBuffer().then((buffer) => {
      if (cancelled) return
      setResolved({
        input,
        source: {
          key: nextSourceKey(),
          kind: "buffer",
          buffer,
          name: getPdfFileName(blobName),
        },
      })
    })
    return () => {
      cancelled = true
    }
  }, [input])

  const replace = React.useCallback(
    (buffer: ArrayBuffer, name: string) => {
      setResolved({
        input,
        source: { key: nextSourceKey(), kind: "buffer", buffer, name },
      })
    },
    [input]
  )
  const source = resolved?.input === input ? resolved.source : immediateSource
  return { source, loading: input.src instanceof Blob && !source, replace }
}

/* -------------------------------------------------------------------------- */
/* Annotation JSON serialization                                              */
/* -------------------------------------------------------------------------- */

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""

  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
  }

  return btoa(binary)
}

function base64ToArrayBuffer(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes.buffer
}

type SerializedAnnotationItem = {
  annotation: PdfAnnotationObject
  ctx?: { data: string; mimeType?: string }
}

export function serializeAnnotationItems(items: AnnotationTransferItem[]) {
  return {
    format: "extend-ui/pdf-editor-annotations",
    version: 1,
    exportedAt: new Date().toISOString(),
    annotations: items.map((item): SerializedAnnotationItem => {
      const context = item.ctx as
        | { data?: ArrayBuffer; mimeType?: string }
        | undefined

      return {
        annotation: item.annotation,
        ...(context?.data instanceof ArrayBuffer
          ? {
              ctx: {
                data: arrayBufferToBase64(context.data),
                mimeType: context.mimeType,
              },
            }
          : {}),
      }
    }),
  }
}

export function deserializeAnnotationItems(
  payload: unknown
): AnnotationTransferItem[] {
  const list = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        Array.isArray((payload as { annotations?: unknown }).annotations)
      ? (payload as { annotations: unknown[] }).annotations
      : null

  if (!list) throw new Error("Unrecognized annotation export.")

  return list.map((entry) => {
    const item = entry as SerializedAnnotationItem

    if (!item || typeof item !== "object" || !item.annotation) {
      throw new Error("Unrecognized annotation export.")
    }

    return {
      annotation: item.annotation,
      ...(item.ctx?.data
        ? {
            ctx: {
              data: base64ToArrayBuffer(item.ctx.data),
              mimeType: item.ctx.mimeType,
            } as AnnotationTransferItem["ctx"],
          }
        : {}),
    }
  })
}

/* -------------------------------------------------------------------------- */
/* Viewport                                                                   */
/* -------------------------------------------------------------------------- */

function PdfEditorViewport({
  children,
  className,
  documentId,
}: {
  children: React.ReactNode
  className?: string
  documentId: string
}) {
  const viewportRef = useViewportRef(documentId)
  const { provides: viewport } = useViewportCapability()
  const isGated = useIsViewportGated(documentId)
  const viewportGap = viewport?.getViewportGap() ?? 0

  return (
    <ViewportElementContext.Provider value={viewportRef}>
      <PdfEditorScrollArea
        className={className}
        orientation="both"
        scrollbarGutter={false}
        viewportClassName="relative select-none selection:bg-transparent selection:text-inherit"
        viewportProps={{ style: { padding: viewportGap } }}
        viewportRef={viewportRef}
      >
        {isGated ? null : children}
      </PdfEditorScrollArea>
    </ViewportElementContext.Provider>
  )
}

function PdfEditorViewportBridge({
  viewportElementRef,
}: {
  viewportElementRef: React.MutableRefObject<HTMLDivElement | null>
}) {
  const elementRef = useViewportElement()

  React.useEffect(() => {
    viewportElementRef.current = elementRef?.current ?? null
  })

  return null
}

/* -------------------------------------------------------------------------- */
/* Selection menus rendered inside the page layers                            */
/* -------------------------------------------------------------------------- */

function SelectionMenuShell({
  rect,
  placement,
  menuWrapperProps,
  children,
}: {
  rect: SelectionSelectionMenuProps["rect"]
  placement: SelectionSelectionMenuProps["placement"]
  menuWrapperProps: SelectionSelectionMenuProps["menuWrapperProps"]
  children: React.ReactNode
}) {
  return (
    <div {...menuWrapperProps}>
      <div
        data-slot="pdf-editor-selection-menu"
        className="flex items-center gap-0.5 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg"
        style={{
          position: "absolute",
          left: 0,
          top: placement.suggestTop
            ? -(SELECTION_MENU_HEIGHT + SELECTION_MENU_OFFSET)
            : rect.size.height + SELECTION_MENU_OFFSET,
          pointerEvents: "auto",
          cursor: "default",
          whiteSpace: "nowrap",
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <TooltipProvider delay={TOOLTIP_DELAY_MS}>{children}</TooltipProvider>
      </div>
    </div>
  )
}

function MenuButton({
  label,
  glyph: Glyph,
  onClick,
  disabled,
  destructive,
}: {
  label: string
  glyph: PdfEditorGlyph
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <PdfEditorToolButton
      label={label}
      size="icon-xs"
      disabled={disabled}
      className={cn(destructive && "text-destructive hover:text-destructive")}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <Glyph className="size-3.5" />
    </PdfEditorToolButton>
  )
}

async function buildSelectionPayload(
  documentId: string,
  document: PdfDocumentObject | null,
  selectionScope: ReturnType<
    NonNullable<
      ReturnType<typeof useSelectionCapability>["provides"]
    >["forDocument"]
  >
): Promise<PdfEditorSelectionPayload | null> {
  const formatted = selectionScope.getFormattedSelection()

  if (formatted.length === 0) return null

  let text = ""

  try {
    const lines = await selectionScope.getSelectedText().toPromise()
    text = lines.join("\n")
  } catch {
    text = ""
  }

  const pages: PdfEditorSelectionPage[] = formatted.map((page) => {
    const pageSize = document?.pages[page.pageIndex]?.size ?? {
      width: 1,
      height: 1,
    }

    return {
      pageIndex: page.pageIndex,
      pageNumber: page.pageIndex + 1,
      pageSize,
      rect: page.rect,
      rects: page.segmentRects,
      normalizedRect: toNormalizedRect(page.rect, pageSize),
      normalizedRects: page.segmentRects.map((rect) =>
        toNormalizedRect(rect, pageSize)
      ),
    }
  })

  return { documentId, text, pages, ...pages[0] }
}

function PdfEditorTextSelectionMenu({
  documentId,
  rect,
  placement,
  menuWrapperProps,
}: SelectionSelectionMenuProps & { documentId: string }) {
  const { provides: selectionCapability } = useSelectionCapability()
  const { provides: annotationCapability } = useAnnotationCapability()
  const { provides: annotation } = useAnnotation(documentId)
  const { provides: redaction } = useRedaction(documentId)
  const editor = usePdfEditor()
  const selectionScope = React.useMemo(
    () => selectionCapability?.forDocument(documentId) ?? null,
    [documentId, selectionCapability]
  )
  const canAnnotate =
    editor.features.annotate && editor.permissions.canModifyAnnotations
  const canRedact =
    editor.features.redact && editor.permissions.canModifyContents

  const createMarkup = (
    toolId: string,
    subtype:
      | PdfAnnotationSubtype.HIGHLIGHT
      | PdfAnnotationSubtype.UNDERLINE
      | PdfAnnotationSubtype.STRIKEOUT,
    options: { select?: boolean; openComments?: boolean } = {}
  ) => {
    if (!selectionScope || !annotation) return

    const formatted = selectionScope.getFormattedSelection()

    if (formatted.length === 0) return

    const defaults = (annotationCapability?.getTool(toolId)?.defaults ??
      {}) as Record<string, unknown>

    const finish = (text: string[]) => {
      let firstId: { pageIndex: number; id: string } | null = null

      for (const page of formatted) {
        const id = uuidV4()

        annotation.createAnnotation(page.pageIndex, {
          ...defaults,
          id,
          type: subtype,
          pageIndex: page.pageIndex,
          rect: page.rect,
          segmentRects: page.segmentRects,
          author: editor.annotationAuthor,
          created: new Date(),
          modified: new Date(),
          flags: ["print"],
          custom: text.length ? { text: text.join("\n") } : undefined,
        } as PdfAnnotationObject)

        firstId ??= { pageIndex: page.pageIndex, id }
      }

      selectionScope.clear()

      if (options.select && firstId) {
        annotation.selectAnnotation(firstId.pageIndex, firstId.id)
      }

      if (options.openComments) editor.setRightPanel("comments")
    }

    selectionScope.getSelectedText().wait(finish, () => finish([]))
  }

  const runCustomAction = async (action: PdfEditorSelectionAction) => {
    if (!selectionScope) return

    const payload = await buildSelectionPayload(
      documentId,
      editor.document,
      selectionScope
    )

    if (!payload) return

    action.onSelect?.(payload)
    editor.onSelectionAction?.(action.id, payload)

    if (!action.keepSelection) selectionScope.clear()
  }

  return (
    <SelectionMenuShell
      rect={rect}
      placement={placement}
      menuWrapperProps={menuWrapperProps}
    >
      <MenuButton
        label="Copy"
        glyph={CopyGlyph}
        onClick={() => {
          selectionScope?.copyToClipboard()
          selectionScope?.clear()
        }}
      />
      {canAnnotate ? (
        <>
          <PdfEditorToolbarSeparator />
          <MenuButton
            label="Highlight"
            glyph={HighlighterGlyph}
            onClick={() =>
              createMarkup("highlight", PdfAnnotationSubtype.HIGHLIGHT)
            }
          />
          <MenuButton
            label="Underline"
            glyph={UnderlineGlyph}
            onClick={() =>
              createMarkup("underline", PdfAnnotationSubtype.UNDERLINE)
            }
          />
          <MenuButton
            label="Strikethrough"
            glyph={StrikethroughGlyph}
            onClick={() =>
              createMarkup("strikeout", PdfAnnotationSubtype.STRIKEOUT)
            }
          />
          {editor.features.comments ? (
            <MenuButton
              label="Comment"
              glyph={CommentGlyph}
              onClick={() =>
                createMarkup("highlight", PdfAnnotationSubtype.HIGHLIGHT, {
                  select: true,
                  openComments: true,
                })
              }
            />
          ) : null}
          <MenuButton
            label="Add link"
            glyph={LinkGlyph}
            onClick={() =>
              editor.openDialog({ type: "link", source: "selection" })
            }
          />
        </>
      ) : null}
      {canRedact ? (
        <>
          <PdfEditorToolbarSeparator />
          <MenuButton
            label="Mark for redaction"
            glyph={EyeOffGlyph}
            onClick={() => {
              redaction?.queueCurrentSelectionAsPending().wait(
                () => {
                  selectionScope?.clear()
                  editor.setRightPanel("redactions")
                },
                () =>
                  editor.notify("The selection could not be marked.", "error")
              )
            }}
          />
        </>
      ) : null}
      {editor.selectionActions.length > 0 ? (
        <>
          <PdfEditorToolbarSeparator />
          {editor.selectionActions.map((action) => (
            <PdfEditorTooltip key={action.id} label={action.label}>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation()
                  void runCustomAction(action)
                }}
              >
                {action.icon}
                {action.label}
              </Button>
            </PdfEditorTooltip>
          ))}
        </>
      ) : null}
    </SelectionMenuShell>
  )
}

const STAMP_SOURCE_TYPES = new Set<PdfAnnotationSubtype>([
  PdfAnnotationSubtype.INK,
  PdfAnnotationSubtype.SQUARE,
  PdfAnnotationSubtype.CIRCLE,
  PdfAnnotationSubtype.LINE,
  PdfAnnotationSubtype.POLYLINE,
  PdfAnnotationSubtype.POLYGON,
  PdfAnnotationSubtype.FREETEXT,
  PdfAnnotationSubtype.STAMP,
  PdfAnnotationSubtype.TEXT,
])

function PdfEditorAnnotationMenu({
  documentId,
  selected,
  context,
  rect,
  placement,
  menuWrapperProps,
}: AnnotationSelectionMenuProps & { documentId: string }) {
  const { provides: annotation } = useAnnotation(documentId)
  const { provides: redaction } = useRedaction(documentId)
  const editor = usePdfEditor()

  if (!selected || !annotation) return null

  const object = context.annotation.object
  const { pageIndex, id } = object
  const isRedact = object.type === PdfAnnotationSubtype.REDACT
  const isWidget = object.type === PdfAnnotationSubtype.WIDGET
  const isLink = object.type === PdfAnnotationSubtype.LINK
  const isLocked = (object.flags ?? []).includes("locked")
  const canModify = editor.permissions.canModifyAnnotations
  const canDelete = canModify && !context.structurallyLocked

  const remove = () => annotation.deleteAnnotation(pageIndex, id)

  if (isRedact) {
    return (
      <SelectionMenuShell
        rect={rect}
        placement={placement}
        menuWrapperProps={menuWrapperProps}
      >
        <MenuButton
          label="Apply redaction"
          glyph={EyeOffGlyph}
          disabled={!editor.permissions.canModifyContents}
          onClick={() =>
            editor.openDialog({
              type: "confirm",
              title: "Apply this redaction?",
              description: "The marked content is removed permanently.",
              confirmLabel: "Apply",
              onConfirm: () => {
                redaction
                  ?.commitPending(pageIndex, id)
                  .wait(noop, () =>
                    editor.notify(
                      "The redaction could not be applied.",
                      "error"
                    )
                  )
              },
            })
          }
        />
        <MenuButton
          label="Style"
          glyph={SlidersGlyph}
          onClick={() => editor.setRightPanel("properties")}
        />
        <MenuButton
          label="Remove mark"
          glyph={TrashGlyph}
          destructive
          onClick={remove}
        />
      </SelectionMenuShell>
    )
  }

  if (isLink) {
    const target = (object as PdfLinkAnnoObject).target

    return (
      <SelectionMenuShell
        rect={rect}
        placement={placement}
        menuWrapperProps={menuWrapperProps}
      >
        <MenuButton
          label="Open link"
          glyph={ExternalLinkGlyph}
          disabled={!target}
          onClick={() => {
            if (!target) return

            annotation.navigateTarget(target).wait((result) => {
              if (result.outcome === "uri") {
                window.open(result.uri, "_blank", "noopener")
              }
            }, noop)
          }}
        />
        <MenuButton
          label="Edit link"
          glyph={EditGlyph}
          disabled={!canModify}
          onClick={() =>
            editor.openDialog({ type: "link", source: "annotation" })
          }
        />
        <MenuButton
          label="Delete"
          glyph={TrashGlyph}
          destructive
          disabled={!canDelete}
          onClick={remove}
        />
      </SelectionMenuShell>
    )
  }

  return (
    <SelectionMenuShell
      rect={rect}
      placement={placement}
      menuWrapperProps={menuWrapperProps}
    >
      {!isWidget && editor.features.comments ? (
        <MenuButton
          label="Comment"
          glyph={CommentGlyph}
          onClick={() => editor.setRightPanel("comments")}
        />
      ) : null}
      <MenuButton
        label="Properties"
        glyph={SlidersGlyph}
        onClick={() => editor.setRightPanel("properties")}
      />
      {!isWidget && canModify ? (
        <MenuButton
          label="Add link"
          glyph={LinkGlyph}
          onClick={() =>
            editor.openDialog({ type: "link", source: "annotation" })
          }
        />
      ) : null}
      {!isWidget &&
      editor.features.stamps &&
      canModify &&
      STAMP_SOURCE_TYPES.has(object.type) ? (
        <MenuButton
          label="Save as stamp"
          glyph={StampGlyph}
          onClick={() => editor.setRightPanel("stamps")}
        />
      ) : null}
      {!isWidget && canModify ? (
        <MenuButton
          label={isLocked ? "Unlock" : "Lock"}
          glyph={isLocked ? UnlockGlyph : LockGlyph}
          onClick={() => {
            const flags = object.flags ?? []
            annotation.updateAnnotation(pageIndex, id, {
              flags: isLocked
                ? flags.filter((flag) => flag !== "locked")
                : [...flags, "locked"],
            })
          }}
        />
      ) : null}
      <MenuButton
        label="Delete"
        glyph={TrashGlyph}
        destructive
        disabled={!canDelete}
        onClick={remove}
      />
    </SelectionMenuShell>
  )
}

function PdfEditorGroupMenu({
  documentId,
  selected,
  context,
  rect,
  placement,
  menuWrapperProps,
}: GroupSelectionMenuProps & { documentId: string }) {
  const { provides: annotation } = useAnnotation(documentId)
  const editor = usePdfEditor()

  if (!selected || !annotation) return null

  const groupingAction = annotation.getGroupingAction()
  const canModify = editor.permissions.canModifyAnnotations

  return (
    <SelectionMenuShell
      rect={rect}
      placement={placement}
      menuWrapperProps={menuWrapperProps}
    >
      <span className="px-1.5 text-xs text-muted-foreground">
        {context.annotations.length} selected
      </span>
      <MenuButton
        label={groupingAction === "ungroup" ? "Ungroup" : "Group"}
        glyph={groupingAction === "ungroup" ? UngroupGlyph : GroupGlyph}
        disabled={!canModify || groupingAction === "disabled"}
        onClick={() => {
          if (groupingAction === "ungroup") {
            annotation.ungroupAnnotations(context.annotations[0].object.id)
          } else {
            annotation.groupAnnotations()
          }
        }}
      />
      <MenuButton
        label="Properties"
        glyph={SlidersGlyph}
        onClick={() => editor.setRightPanel("properties")}
      />
      <MenuButton
        label="Delete all"
        glyph={TrashGlyph}
        destructive
        disabled={!canModify}
        onClick={() =>
          annotation.deleteAnnotations(
            context.annotations.map((item) => ({
              pageIndex: item.object.pageIndex,
              id: item.object.id,
            }))
          )
        }
      />
    </SelectionMenuShell>
  )
}

function PdfEditorRedactionMenu({
  documentId,
  selected,
  context,
  rect,
  placement,
  menuWrapperProps,
}: RedactionSelectionMenuProps & { documentId: string }) {
  const { provides: redaction } = useRedaction(documentId)
  const editor = usePdfEditor()

  if (!selected || !redaction) return null

  const { page, id } = context.item

  return (
    <SelectionMenuShell
      rect={rect}
      placement={placement}
      menuWrapperProps={menuWrapperProps}
    >
      <MenuButton
        label="Apply redaction"
        glyph={EyeOffGlyph}
        disabled={!editor.permissions.canModifyContents}
        onClick={() =>
          editor.openDialog({
            type: "confirm",
            title: "Apply this redaction?",
            description: "The marked content is removed permanently.",
            confirmLabel: "Apply",
            onConfirm: () => {
              redaction
                .commitPending(page, id)
                .wait(noop, () =>
                  editor.notify("The redaction could not be applied.", "error")
                )
            },
          })
        }
      />
      <MenuButton
        label="Remove mark"
        glyph={TrashGlyph}
        destructive
        onClick={() => redaction.removePending(page, id)}
      />
    </SelectionMenuShell>
  )
}

/* -------------------------------------------------------------------------- */
/* Toolbar controls                                                           */
/* -------------------------------------------------------------------------- */

function PdfEditorPageControl({
  activePage,
  numPages,
  disabled,
  onPageChange,
}: {
  activePage: number
  numPages: number
  disabled: boolean
  onPageChange: (pageNumber: number) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const displayPage = numPages ? activePage : 1
  const [isEditing, setIsEditing] = React.useState(false)
  const [draftPage, setDraftPage] = React.useState(() => String(displayPage))

  React.useEffect(() => {
    if (!isEditing) return

    inputRef.current?.focus()
    inputRef.current?.select()
  }, [isEditing])

  const applyPageDraft = React.useCallback(
    (value: string) => {
      const trimmedValue = value.trim()

      if (!trimmedValue) return

      const parsedPage = Number(trimmedValue)

      if (!Number.isInteger(parsedPage)) return

      onPageChange(Math.min(Math.max(parsedPage, 1), Math.max(numPages, 1)))
    },
    [numPages, onPageChange]
  )

  return (
    <div className="flex items-center text-sm whitespace-nowrap text-primary">
      <span>Page</span>
      {isEditing ? (
        <Input
          ref={inputRef}
          aria-label="Page number"
          inputMode="numeric"
          pattern="[0-9]*"
          size="sm"
          value={draftPage}
          className="mx-1 w-14 min-w-14 rounded-md [&_[data-slot=input]]:text-center"
          onBlur={() => setIsEditing(false)}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.target.value

            setDraftPage(nextValue)
            applyPageDraft(nextValue)
          }}
          onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter" || event.key === "Escape") {
              event.currentTarget.blur()
            }
          }}
        />
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="font-normal"
          aria-label={`Current page ${displayPage}. Edit page number`}
          disabled={disabled || !numPages}
          onClick={() => {
            setDraftPage(String(displayPage))
            setIsEditing(true)
          }}
        >
          {displayPage}
        </Button>
      )}
      <span>of {numPages || "–"}</span>
    </div>
  )
}

function PdfEditorZoomControl({
  documentId,
  disabled,
}: {
  documentId: string
  disabled: boolean
}) {
  const { state, provides: zoom } = useZoom(documentId)
  const current = state.currentZoomLevel
  const selectValue = isZoomMode(state.zoomLevel)
    ? state.zoomLevel
    : String(Number(current.toFixed(2)))
  const presets = ZOOM_PRESETS.includes(Number(current.toFixed(2)))
    ? ZOOM_PRESETS
    : [...ZOOM_PRESETS, Number(current.toFixed(2))].sort((a, b) => a - b)

  return (
    <div className="flex items-center gap-0.5">
      <PdfEditorToolButton
        label="Zoom out"
        shortcut="mod+-"
        disabled={disabled || current <= MIN_ZOOM}
        onClick={() => zoom?.zoomOut()}
      >
        <ZoomOutGlyph className="size-4" />
      </PdfEditorToolButton>
      <Select
        value={selectValue}
        disabled={disabled}
        modal={false}
        onValueChange={(value) => {
          const next = String(value)
          zoom?.requestZoom(isZoomMode(next) ? next : Number(next))
        }}
      >
        <SelectTrigger
          size="sm"
          className="w-[104px] min-w-[104px]"
          aria-label="Zoom level"
        >
          <SelectValue placeholder="Zoom">
            {Math.round(current * 100)}%
          </SelectValue>
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {(Object.keys(ZOOM_MODE_LABELS) as ZoomMode[]).map((mode) => (
            <SelectItem key={mode} value={mode}>
              {ZOOM_MODE_LABELS[mode]}
            </SelectItem>
          ))}
          {presets.map((preset) => (
            <SelectItem key={preset} value={String(preset)}>
              {Math.round(preset * 100)}%
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PdfEditorToolButton
        label="Zoom in"
        shortcut="mod+="
        disabled={disabled || current >= MAX_ZOOM}
        onClick={() => zoom?.zoomIn()}
      >
        <ZoomInGlyph className="size-4" />
      </PdfEditorToolButton>
    </div>
  )
}

function PdfEditorSearchControl({
  documentId,
  disabled,
  open,
  onOpenChange,
}: {
  documentId: string
  disabled: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { state, provides } = useSearch(documentId)
  const { provides: scroll } = useScroll(documentId)
  const [draft, setDraft] = React.useState("")
  const [query, setQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)
  const providesRef = React.useRef(provides)
  const scrollRef = React.useRef(scroll)
  const requestIdRef = React.useRef(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    providesRef.current = provides
    scrollRef.current = scroll
  }, [provides, scroll])

  React.useEffect(() => {
    if (!open) return

    const frame = window.requestAnimationFrame(() => inputRef.current?.focus())

    return () => window.cancelAnimationFrame(frame)
  }, [open])

  const scrollToResult = React.useCallback(
    (index: number) => {
      const result = state.results[index]
      if (!result || !scroll) return

      const firstRect = result.rects[0]

      scroll.scrollToPage({
        pageNumber: result.pageIndex + 1,
        ...(firstRect
          ? {
              pageCoordinates: { x: firstRect.origin.x, y: firstRect.origin.y },
              alignY: 30,
            }
          : {}),
        behavior: "auto",
      })
    },
    [scroll, state.results]
  )

  const runSearch = React.useCallback((rawQuery: string) => {
    const nextQuery = rawQuery.trim()
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setQuery(nextQuery)

    const searchProvider = providesRef.current
    const scrollProvider = scrollRef.current

    if (!searchProvider) {
      setIsSearching(false)
      return
    }

    if (!nextQuery) {
      searchProvider.stopSearch()
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    searchProvider.startSearch()
    searchProvider.searchAllPages(nextQuery).wait(
      (result) => {
        if (requestIdRef.current !== requestId) return

        const first = result.results[0]

        if (first && scrollProvider) {
          searchProvider.goToResult(0)
          const firstRect = first.rects[0]

          scrollProvider.scrollToPage({
            pageNumber: first.pageIndex + 1,
            ...(firstRect
              ? {
                  pageCoordinates: {
                    x: firstRect.origin.x,
                    y: firstRect.origin.y,
                  },
                  alignY: 30,
                }
              : {}),
            behavior: "auto",
          })
        }

        setIsSearching(false)
      },
      () => {
        if (requestIdRef.current === requestId) setIsSearching(false)
      }
    )
  }, [])

  React.useEffect(() => {
    if (!draft.trim()) return

    const timeout = window.setTimeout(
      () => runSearch(draft),
      SEARCH_DEBOUNCE_MS
    )

    return () => window.clearTimeout(timeout)
  }, [draft, runSearch])

  const clear = () => {
    requestIdRef.current += 1
    setDraft("")
    setQuery("")
    setIsSearching(false)
    provides?.stopSearch()
  }

  const navigate = (direction: 1 | -1) => {
    if (!provides || state.total === 0) return

    scrollToResult(
      direction === 1 ? provides.nextResult() : provides.previousResult()
    )
  }

  const resultLabel = isSearching
    ? "Searching…"
    : !query
      ? "Type to search"
      : state.total
        ? `${state.activeResultIndex + 1} / ${state.total}`
        : "No results"

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PdfEditorTooltip label="Search" shortcut="mod+F">
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Search"
            disabled={disabled}
            className={cn(query && "text-primary")}
          >
            <SearchGlyph className="size-4" />
          </Button>
        </PopoverTrigger>
      </PdfEditorTooltip>
      <PopoverContent
        align="end"
        className="w-72 p-0 [&>[data-slot=popover-viewport]]:p-3.5!"
      >
        <div className="space-y-3">
          <Input
            ref={inputRef}
            placeholder="Search text"
            value={draft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              const next = event.target.value
              setDraft(next)

              if (next.trim()) {
                setIsSearching(true)
              } else {
                clear()
              }
            }}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key !== "Enter") return

              event.preventDefault()

              if (state.total) {
                navigate(event.shiftKey ? -1 : 1)
              } else if (draft.trim()) {
                runSearch(draft)
              }
            }}
          />
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 truncate text-xs text-muted-foreground">
              {resultLabel}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Previous result"
                disabled={isSearching || state.total === 0}
                onClick={() => navigate(-1)}
              >
                <ChevronLeftGlyph className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label="Next result"
                disabled={isSearching || state.total === 0}
                onClick={() => navigate(1)}
              >
                <ChevronRightGlyph className="size-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clear}>
                Clear
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function PdfEditorModeSwitch({
  mode,
  features,
  compact = false,
  onModeChange,
}: {
  mode: PdfEditorMode
  features: PdfEditorResolvedFeatures
  compact?: boolean
  onModeChange: (mode: PdfEditorMode) => void
}) {
  const options = PDF_EDITOR_MODE_OPTIONS.filter(
    (option) => option.feature === null || features[option.feature]
  )

  return (
    <div
      role="group"
      aria-label="Editor mode"
      className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5"
    >
      {options.map((option) => {
        const Glyph = option.glyph
        const active = option.id === mode

        return (
          <Button
            key={option.id}
            type="button"
            size={compact ? "icon-xs" : "xs"}
            variant={active ? "default" : "ghost"}
            aria-pressed={active}
            aria-label={option.label}
            className={cn("gap-1.5", !active && "text-muted-foreground")}
            onClick={() => onModeChange(option.id)}
          >
            <Glyph className="size-3.5" />
            {compact ? null : (
              <span className="hidden md:inline">{option.label}</span>
            )}
          </Button>
        )
      })}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Side panel shells                                                          */
/* -------------------------------------------------------------------------- */

function PanelTabStrip<T extends string>({
  tabs,
  value,
  onChange,
  onClose,
  label,
  disabled = false,
}: {
  tabs: Array<{ id: T; label: string; glyph: PdfEditorGlyph }>
  value: T | null
  onChange: (value: T) => void
  onClose: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-1 border-b px-1.5 py-1">
      <TooltipProvider delay={TOOLTIP_DELAY_MS}>
        <div
          className="flex min-w-0 items-center gap-0.5 overflow-x-auto"
          role="tablist"
          aria-label={label}
        >
          {tabs.map((tab) => {
            const Glyph = tab.glyph

            return (
              <PdfEditorToolButton
                key={tab.id}
                label={tab.label}
                active={value === tab.id}
                role="tab"
                aria-selected={value === tab.id}
                disabled={disabled}
                onClick={() => onChange(tab.id)}
              >
                <Glyph className="size-4" />
              </PdfEditorToolButton>
            )
          })}
        </div>
        <PdfEditorToolButton
          label="Close panel"
          size="icon-xs"
          disabled={disabled}
          onClick={onClose}
        >
          <CloseGlyph className="size-3.5" />
        </PdfEditorToolButton>
      </TooltipProvider>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Signature persistence + engine warm-up utilities                           */
/* -------------------------------------------------------------------------- */

function PdfEditorSignaturePersistence({
  storageKey,
}: {
  storageKey: string | null
}) {
  const { provides: signatureCapability } = useSignatureCapability()

  React.useEffect(() => {
    if (!signatureCapability || !storageKey) return

    try {
      const raw = window.localStorage.getItem(storageKey)

      if (raw && signatureCapability.getEntries().length === 0) {
        signatureCapability.loadEntries(deserializeEntries(JSON.parse(raw)))
      }
    } catch {
      // Ignore corrupt or unavailable storage.
    }

    return signatureCapability.onEntriesChange((entries) => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify(serializeEntries(entries))
        )
      } catch {
        // Storage may be unavailable (private mode, quota).
      }
    })
  }, [signatureCapability, storageKey])

  return null
}

/* -------------------------------------------------------------------------- */
/* Fallback shell (engine loading, document loading, errors, empty)           */
/* -------------------------------------------------------------------------- */

function PdfEditorDocumentStatus({
  state,
  errorMessage,
  onUploadFile,
}: {
  state: "loading" | "error" | "empty"
  errorMessage?: string
  onUploadFile?: (file: File) => void
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <div
      data-slot="pdf-editor-document-status"
      data-state={state}
      className="grid min-h-0 flex-1 place-items-center p-6 text-center text-sm text-muted-foreground"
    >
      {state === "loading" ? (
        <Spinner className="size-4" />
      ) : (
        <div className="flex max-w-sm flex-col items-center gap-3">
          <div role={state === "error" ? "alert" : undefined}>
            {state === "error"
              ? (errorMessage ?? "The PDF could not be loaded.")
              : "Open a PDF to start editing"}
          </div>
          {onUploadFile ? (
            <>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                tabIndex={-1}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) onUploadFile(file)
                  event.currentTarget.value = ""
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                <UploadGlyph className="size-4" />
                Open PDF
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  )
}

const EMPTY_EDITOR_CONTEXT: React.ContextType<typeof PDFContext> = {
  registry: null,
  coreState: null,
  isInitializing: true,
  pluginsReady: false,
  activeDocumentId: null,
  activeDocument: null,
  documents: {},
  documentStates: [],
}

/* -------------------------------------------------------------------------- */
/* Editor (per loaded document)                                               */
/* -------------------------------------------------------------------------- */

type EditorHandleImpl = PDFEditorHandle

type PdfEditorInnerProps = {
  documentId: string
  document: PdfDocumentObject | null
  documentState: "loading" | "ready" | "empty" | "error" | "password"
  unavailableContent?: React.ReactNode
  fileName: string
  className?: string
  defaultZoom: PDFEditorZoomLevel
  defaultMode: PdfEditorMode
  leftPanel: PdfEditorLeftPanel | null
  setLeftPanel: React.Dispatch<React.SetStateAction<PdfEditorLeftPanel | null>>
  formDesignMode: boolean
  setFormDesignMode: React.Dispatch<React.SetStateAction<boolean>>
  annotationAuthor: string
  features: PdfEditorResolvedFeatures
  showToolbar: boolean
  showUpload: boolean
  showDownload: boolean
  toolbarActions?: React.ReactNode
  selectionActions: PdfEditorSelectionAction[]
  signatureFontsStylesheetUrl: string | null
  renderPageOverlay?: (props: PDFEditorPageOverlayProps) => React.ReactNode
  handleRef: React.MutableRefObject<EditorHandleImpl | null>
  onReplaceDocument: (buffer: ArrayBuffer, fileName: string) => void
  onUploadFile: (file: File) => void
  onActivePageChange?: (pageNumber: number) => void
  onModeChange?: (mode: PdfEditorMode) => void
  onAnnotationEvent?: (event: AnnotationEvent) => void
  onAnnotationsChange?: (items: AnnotationTransferItem[]) => void
  onFormValuesChange?: (values: Record<string, string>) => void
  onRedactionsApplied?: () => void
  onSave?: (result: { buffer: ArrayBuffer; fileName: string }) => void
  onCapture?: (event: CaptureAreaEvent) => void
  onToast?: (toast: PDFEditorToast) => void
  onSelectionAction?: (
    actionId: string,
    payload: PdfEditorSelectionPayload
  ) => void
}

const LEFT_PANEL_TABS: Array<{
  id: PdfEditorLeftPanel
  label: string
  glyph: PdfEditorGlyph
  feature: keyof PdfEditorFeatureFlags | null
}> = [
  { id: "thumbnails", label: "Thumbnails", glyph: GridGlyph, feature: null },
  { id: "outline", label: "Outline", glyph: ListTreeGlyph, feature: "outline" },
  {
    id: "attachments",
    label: "Attachments",
    glyph: PaperclipGlyph,
    feature: "attachments",
  },
  {
    id: "pages",
    label: "Organize pages",
    glyph: LayersGlyph,
    feature: "pages",
  },
]

const RIGHT_PANEL_TABS: Array<{
  id: PdfEditorRightPanel
  label: string
  glyph: PdfEditorGlyph
  feature: keyof PdfEditorFeatureFlags | null
}> = [
  { id: "properties", label: "Properties", glyph: SlidersGlyph, feature: null },
  {
    id: "comments",
    label: "Comments",
    glyph: CommentsGlyph,
    feature: "comments",
  },
  {
    id: "redactions",
    label: "Redactions",
    glyph: EyeOffGlyph,
    feature: "redact",
  },
  { id: "stamps", label: "Stamps", glyph: StampGlyph, feature: "stamps" },
  {
    id: "signatures",
    label: "Signatures",
    glyph: SignatureGlyph,
    feature: "sign",
  },
  {
    id: "forms",
    label: "Form fields",
    glyph: TextFieldGlyph,
    feature: "forms",
  },
]

function PdfEditorInner({
  documentId,
  document: pdfDocument,
  documentState,
  unavailableContent,
  fileName,
  className,
  defaultZoom,
  defaultMode,
  leftPanel,
  setLeftPanel,
  formDesignMode,
  setFormDesignMode,
  annotationAuthor,
  features,
  showToolbar,
  showUpload,
  showDownload,
  toolbarActions,
  selectionActions,
  signatureFontsStylesheetUrl,
  renderPageOverlay,
  handleRef,
  onReplaceDocument,
  onUploadFile,
  onActivePageChange,
  onModeChange,
  onAnnotationEvent,
  onAnnotationsChange,
  onFormValuesChange,
  onRedactionsApplied,
  onSave,
  onCapture,
  onToast,
  onSelectionAction,
}: PdfEditorInnerProps) {
  const { registry } = useRegistry()
  const permissions = useDocumentPermissions(documentId)
  const { state: scrollState, provides: scroll } = useScroll(documentId)
  const { provides: scrollCapability } = useScrollCapability()
  const { state: zoomState, provides: zoom } = useZoom(documentId)
  const { provides: rotate } = useRotate(documentId)
  const { spreadMode, provides: spread } = useSpread(documentId)
  const { provides: pan, isPanning } = usePan(documentId)
  const { state: captureState, provides: capture } = useCapture(documentId)
  const { provides: fullscreen, state: fullscreenState } = useFullscreen()
  const { provides: historyCapability } = useHistoryCapability()
  const { provides: annotationCapability } = useAnnotationCapability()
  const { state: annotationState, provides: annotation } =
    useAnnotation(documentId)
  const { state: redactionState, provides: redaction } =
    useRedaction(documentId)
  const { provides: exportScope } = useExport(documentId)
  const { provides: print } = usePrint(documentId)
  const { provides: formCapability } = useFormCapability()
  const { provides: selectionCapability } = useSelectionCapability()

  const [mode, setModeState] = React.useState<PdfEditorMode>(defaultMode)
  const [rightPanel, setRightPanel] =
    React.useState<PdfEditorRightPanel | null>(null)
  const [dialog, setDialog] = React.useState<PdfEditorDialogRequest | null>(
    null
  )
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [historyState, setHistoryState] = React.useState({
    canUndo: false,
    canRedo: false,
  })
  const [horizontalScroll, setHorizontalScroll] = React.useState(false)
  const [isDownloading, setIsDownloading] = React.useState(false)

  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const [toastContainer, setToastContainer] =
    React.useState<HTMLDivElement | null>(null)
  const [editorToastManager] = React.useState(() =>
    ToastPrimitive.createToastManager()
  )
  const viewportElementRef = React.useRef<HTMLDivElement | null>(null)
  const uploadInputRef = React.useRef<HTMLInputElement>(null)
  const annotationImportInputRef = React.useRef<HTMLInputElement>(null)
  const [shellRef, shellWidth] = useElementWidth<HTMLDivElement>()
  const leftInline = useInlineThumbnailSidebar(shellWidth)
  const rightInline = shellWidth >= RIGHT_PANEL_INLINE_MIN_WIDTH
  const compactToolbar = shellWidth > 0 && shellWidth <= TOOLBAR_STACK_MAX_WIDTH

  const activePage = scrollState.currentPage
  const numPages = pdfDocument?.pageCount ?? 0
  const controlsDisabled = !numPages
  const currentZoom = zoomState.currentZoomLevel
  const selectedAnnotations = React.useMemo(
    () => getSelectedAnnotations(annotationState),
    [annotationState]
  )
  const activeToolId = annotationState.activeToolId
  const activeTool = React.useMemo(
    () =>
      activeToolId && annotationCapability
        ? annotationCapability.getTool(activeToolId)
        : null,
    [activeToolId, annotationCapability]
  )
  const historyScope = React.useMemo(
    () => historyCapability?.forDocument(documentId) ?? null,
    [documentId, historyCapability]
  )
  const formScope = React.useMemo(
    () => formCapability?.forDocument(documentId) ?? null,
    [documentId, formCapability]
  )
  const selectionScope = React.useMemo(
    () => selectionCapability?.forDocument(documentId) ?? null,
    [documentId, selectionCapability]
  )

  /* ---- notices ---------------------------------------------------------- */

  const notify = React.useCallback(
    (message: string, tone: PdfEditorNoticeTone = "info") => {
      if (onToast) {
        onToast({ message, tone })
        return
      }

      editorToastManager.add({ title: message, type: tone })
    },
    [editorToastManager, onToast]
  )

  const setRootElement = React.useCallback((element: HTMLDivElement | null) => {
    rootRef.current = element
    setToastContainer(element)
  }, [])

  /* ---- tool helpers ----------------------------------------------------- */

  const deactivateTools = React.useCallback(() => {
    annotation?.setActiveTool(null)
    if (redactionState.isRedacting) redaction?.endRedact()
    if (isPanning) pan?.disablePan()
    if (captureState.isMarqueeCaptureActive) capture?.disableMarqueeCapture()
    if (zoomState.isMarqueeZoomActive) zoom?.disableMarqueeZoom()
  }, [
    annotation,
    capture,
    captureState.isMarqueeCaptureActive,
    isPanning,
    pan,
    redaction,
    redactionState.isRedacting,
    zoom,
    zoomState.isMarqueeZoomActive,
  ])

  const setActiveTool = React.useCallback(
    (toolId: string | null) => {
      if (!annotation) return

      if (isPanning) pan?.disablePan()
      if (captureState.isMarqueeCaptureActive) capture?.disableMarqueeCapture()
      if (zoomState.isMarqueeZoomActive) zoom?.disableMarqueeZoom()
      if (redactionState.isRedacting) redaction?.endRedact()

      annotation.setActiveTool(
        toolId !== null && annotationState.activeToolId === toolId
          ? null
          : toolId
      )
    },
    [
      annotation,
      annotationState.activeToolId,
      capture,
      captureState.isMarqueeCaptureActive,
      isPanning,
      pan,
      redaction,
      redactionState.isRedacting,
      zoom,
      zoomState.isMarqueeZoomActive,
    ]
  )

  const setMode = React.useCallback(
    (nextMode: PdfEditorMode) => {
      setModeState((previous) => {
        if (previous === nextMode) return previous

        onModeChange?.(nextMode)
        return nextMode
      })

      const defaultPanel: Record<PdfEditorMode, PdfEditorRightPanel | null> = {
        view: null,
        annotate: "properties",
        sign: "signatures",
        forms: "forms",
        redact: "redactions",
      }
      const panel = defaultPanel[nextMode]

      if (panel) setRightPanel(panel)
      else setRightPanel(null)
    },
    [onModeChange]
  )

  React.useEffect(() => {
    deactivateTools()
    annotation?.deselectAnnotation()
    // Only react to mode changes here; tool state is otherwise managed by the toolbar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  React.useEffect(() => {
    annotation?.setLocked(
      mode === "forms" && formDesignMode
        ? { type: LockModeType.None }
        : { type: LockModeType.Include, categories: ["form"] }
    )
  }, [annotation, formDesignMode, mode])

  React.useEffect(() => {
    if (mode !== "forms" && formDesignMode) setFormDesignMode(false)
  }, [formDesignMode, mode, setFormDesignMode])

  /* ---- history ---------------------------------------------------------- */

  React.useEffect(() => {
    if (!historyScope) return

    const sync = () => {
      const state = historyScope.getHistoryState()
      setHistoryState({
        canUndo: state.global.canUndo,
        canRedo: state.global.canRedo,
      })
    }

    sync()
    return historyScope.onHistoryChange(sync)
  }, [historyScope])

  /* ---- callbacks: page, annotations, forms, redactions ------------------ */

  React.useEffect(() => {
    if (!controlsDisabled && activePage > 0) onActivePageChange?.(activePage)
  }, [activePage, controlsDisabled, onActivePageChange])

  const onAnnotationEventRef = React.useRef(onAnnotationEvent)
  const onAnnotationsChangeRef = React.useRef(onAnnotationsChange)
  const onFormValuesChangeRef = React.useRef(onFormValuesChange)
  const onRedactionsAppliedRef = React.useRef(onRedactionsApplied)

  React.useEffect(() => {
    onAnnotationEventRef.current = onAnnotationEvent
    onAnnotationsChangeRef.current = onAnnotationsChange
    onFormValuesChangeRef.current = onFormValuesChange
    onRedactionsAppliedRef.current = onRedactionsApplied
  })

  React.useEffect(() => {
    if (!annotation) return

    let timeout: number | null = null

    const unsubscribe = annotation.onAnnotationEvent((event) => {
      onAnnotationEventRef.current?.(event)

      if (!onAnnotationsChangeRef.current) return
      if (event.type === "loaded" || !event.committed) return

      if (timeout !== null) window.clearTimeout(timeout)

      timeout = window.setTimeout(() => {
        timeout = null
        annotation.exportAnnotations().wait((items) => {
          onAnnotationsChangeRef.current?.(items)
        }, noop)
      }, 400)
    })

    return () => {
      if (timeout !== null) window.clearTimeout(timeout)
      unsubscribe()
    }
  }, [annotation])

  React.useEffect(() => {
    if (!formScope) return

    return formScope.onFieldValueChange(() => {
      onFormValuesChangeRef.current?.(formScope.getFormValues())
    })
  }, [formScope])

  React.useEffect(() => {
    if (!redaction) return

    return redaction.onRedactionEvent((event) => {
      if (event.type !== "commit") return

      if (event.success) {
        notify(
          "Redactions applied. The content was removed from the document.",
          "success"
        )
        onRedactionsAppliedRef.current?.()
      } else {
        notify("The redactions could not be applied.", "error")
      }
    })
  }, [notify, redaction])

  /* ---- initial zoom (numeric defaults never lift the viewport gate) ----- */

  const initialZoomDocumentRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!pdfDocument || !zoom) return
    if (initialZoomDocumentRef.current === documentId) return

    initialZoomDocumentRef.current = documentId
    zoom.requestZoom(toZoomLevel(defaultZoom))
  }, [defaultZoom, documentId, pdfDocument, zoom])

  /* ---- document actions ------------------------------------------------- */

  const scrollToPage = React.useCallback(
    (
      pageNumber: number,
      options?: { smooth?: boolean } | ScrollIntoViewOptions
    ) => {
      const smooth =
        options && "smooth" in options
          ? options.smooth
          : options && "behavior" in options
            ? options.behavior === "smooth"
            : false

      scroll?.scrollToPage({ pageNumber, behavior: smooth ? "smooth" : "auto" })
    },
    [scroll]
  )

  const scrollToAnnotation = React.useCallback(
    (target: PdfAnnotationObject) => {
      scroll?.scrollToPage({
        pageNumber: target.pageIndex + 1,
        pageCoordinates: { x: target.rect.origin.x, y: target.rect.origin.y },
        alignX: 50,
        alignY: 25,
        behavior: "smooth",
      })
    },
    [scroll]
  )

  const getDocumentBuffer = React.useCallback(async () => {
    if (!exportScope) throw new Error("The document is not ready.")

    if (annotation && annotationState.hasPendingChanges) {
      try {
        await annotation.commit().toPromise()
      } catch {
        // Continue with whatever the engine currently holds.
      }
    }

    return exportScope.saveAsCopy().toPromise()
  }, [annotation, annotationState.hasPendingChanges, exportScope])

  const downloadDocument = React.useCallback(
    async (name?: string) => {
      const targetName = getPdfFileName(name ?? fileName)

      setIsDownloading(true)

      try {
        const buffer = await getDocumentBuffer()
        downloadArrayBuffer(buffer, targetName)
        onSave?.({ buffer, fileName: targetName })
      } catch (error) {
        console.error(error)
        notify("The document could not be saved.", "error")
      } finally {
        setIsDownloading(false)
      }
    },
    [fileName, getDocumentBuffer, notify, onSave]
  )

  const flattenDocument = React.useCallback(() => {
    setDialog({
      type: "confirm",
      title: "Flatten annotations and form fields?",
      description:
        "Annotations and filled form fields become part of the page content and can no longer be edited.",
      confirmLabel: "Flatten",
      destructive: true,
      onConfirm: async () => {
        if (!registry || !pdfDocument) return

        try {
          if (annotation && annotationState.hasPendingChanges) {
            await annotation.commit().toPromise()
          }

          const engine = registry.getEngine()

          for (const page of pdfDocument.pages) {
            await engine
              .flattenPage(pdfDocument, page, {
                flag: PdfPageFlattenFlag.Display,
              })
              .toPromise()
          }

          const buffer = await engine.saveAsCopy(pdfDocument).toPromise()
          onReplaceDocument(buffer, fileName)
          notify("Annotations flattened into the page content.", "success")
        } catch (error) {
          console.error(error)
          notify("The document could not be flattened.", "error")
        }
      },
    })
  }, [
    annotation,
    annotationState.hasPendingChanges,
    fileName,
    notify,
    onReplaceDocument,
    pdfDocument,
    registry,
  ])

  const exportAnnotationsJson = React.useCallback(() => {
    if (!annotation) return

    annotation.exportAnnotations().wait(
      (items) => {
        downloadBlob(
          new Blob([JSON.stringify(serializeAnnotationItems(items), null, 2)], {
            type: "application/json",
          }),
          `${fileName.replace(/\.pdf$/i, "")}-annotations.json`
        )
        notify(
          `Exported ${items.length} annotation${items.length === 1 ? "" : "s"}.`,
          "success"
        )
      },
      () => notify("The annotations could not be exported.", "error")
    )
  }, [annotation, fileName, notify])

  const importAnnotationsFile = React.useCallback(
    async (file: File) => {
      if (!annotation) return

      try {
        const items = deserializeAnnotationItems(JSON.parse(await file.text()))
        annotation.importAnnotations(items)
        notify(
          `Imported ${items.length} annotation${items.length === 1 ? "" : "s"}.`,
          "success"
        )
      } catch {
        notify("The file is not a valid annotation export.", "error")
      }
    },
    [annotation, notify]
  )

  const deleteSelectedAnnotations = React.useCallback(() => {
    if (!annotation || selectedAnnotations.length === 0) return

    const deletable = selectedAnnotations.filter(
      (item) => !annotation.isAnnotationStructurallyLocked(item.object)
    )

    if (deletable.length === 0) return

    annotation.deleteAnnotations(
      deletable.map((item) => ({
        pageIndex: item.object.pageIndex,
        id: item.object.id,
      }))
    )
  }, [annotation, selectedAnnotations])

  const applyAllRedactions = React.useCallback(() => {
    if (!redaction || redactionState.pendingCount === 0) return

    setDialog({
      type: "confirm",
      title: `Apply ${redactionState.pendingCount} redaction${redactionState.pendingCount === 1 ? "" : "s"}?`,
      description:
        "Redaction permanently removes the marked content from the document. This cannot be undone.",
      confirmLabel: "Apply redactions",
      onConfirm: () => {
        redaction.commitAllPending().wait(noop, noop)
      },
    })
  }, [redaction, redactionState.pendingCount])

  /* ---- imperative handle ------------------------------------------------ */

  React.useEffect(() => {
    if (controlsDisabled) return
    handleRef.current = {
      getDocumentBuffer,
      download: downloadDocument,
      print: async (options) => {
        if (!print) throw new Error("Printing is not available.")
        await print.print(options).toPromise()
      },
      exportAnnotations: async () => {
        if (!annotation) return []
        return annotation.exportAnnotations().toPromise()
      },
      importAnnotations: (items) => annotation?.importAnnotations(items),
      getFormValues: () => formScope?.getFormValues() ?? {},
      setFormValues: async (values) => {
        if (!formScope) return
        await formScope.setFormValues(values).toPromise()
      },
      applyRedactions: async () => {
        if (!redaction) return
        await redaction.commitAllPending().toPromise()
      },
      setMode,
      setActiveTool: (toolId) => annotation?.setActiveTool(toolId),
      scrollToPage: (pageNumber, options) => scrollToPage(pageNumber, options),
      undo: () => historyScope?.undo(),
      redo: () => historyScope?.redo(),
      getViewportElement: () => viewportElementRef.current,
    }

    return () => {
      handleRef.current = null
    }
  }, [
    annotation,
    controlsDisabled,
    downloadDocument,
    formScope,
    getDocumentBuffer,
    handleRef,
    historyScope,
    print,
    redaction,
    scrollToPage,
    setMode,
  ])

  /* ---- keyboard shortcuts ----------------------------------------------- */

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (controlsDisabled) return
      const key = event.key
      const mod = event.metaKey || event.ctrlKey

      if (isTypingTarget(event.target)) {
        if (key === "Escape") (event.target as HTMLElement).blur()
        return
      }

      if (key === "Escape") {
        deactivateTools()
        annotation?.deselectAnnotation()
        selectionScope?.clear()
        setSearchOpen(false)
        event.preventDefault()
        return
      }

      if (
        (key === "Delete" || key === "Backspace") &&
        selectedAnnotations.length > 0
      ) {
        deleteSelectedAnnotations()
        event.preventDefault()
        return
      }

      if (mod && key.toLowerCase() === "z") {
        if (event.shiftKey) historyScope?.redo()
        else historyScope?.undo()
        event.preventDefault()
        return
      }

      if (mod && key.toLowerCase() === "y") {
        historyScope?.redo()
        event.preventDefault()
        return
      }

      if (mod && (key === "=" || key === "+")) {
        zoom?.zoomIn()
        event.preventDefault()
        return
      }

      if (mod && key === "-") {
        zoom?.zoomOut()
        event.preventDefault()
        return
      }

      if (mod && key === "0") {
        zoom?.requestZoom(ZoomMode.FitPage)
        event.preventDefault()
        return
      }

      if (mod && key.toLowerCase() === "p" && features.print) {
        setDialog({ type: "print" })
        event.preventDefault()
        return
      }

      if (mod && key.toLowerCase() === "s" && showDownload) {
        void downloadDocument()
        event.preventDefault()
        return
      }

      if (mod && key.toLowerCase() === "f") {
        setSearchOpen(true)
        event.preventDefault()
        return
      }

      if (mod && key.toLowerCase() === "a" && annotation && mode !== "view") {
        const ids = annotationState.pages[Math.max(0, activePage - 1)] ?? []

        if (ids.length > 0) {
          annotation.setSelection(ids)
          event.preventDefault()
        }
        return
      }

      if (!mod && !event.altKey && key.toLowerCase() === "h") {
        pan?.togglePan()
        event.preventDefault()
        return
      }

      if (!mod && !event.altKey && key.toLowerCase() === "v") {
        deactivateTools()
        event.preventDefault()
      }
    },
    [
      activePage,
      annotation,
      annotationState.pages,
      controlsDisabled,
      deactivateTools,
      deleteSelectedAnnotations,
      downloadDocument,
      features.print,
      historyScope,
      mode,
      pan,
      selectedAnnotations.length,
      selectionScope,
      showDownload,
      zoom,
    ]
  )

  const handlePointerDownCapture = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const root = rootRef.current
      if (!root) return

      const active = window.document.activeElement

      if (active && root.contains(active) && active !== root) return
      if (!(event.target instanceof Node) || !root.contains(event.target))
        return
      if (isTypingTarget(event.target)) return

      root.focus({ preventScroll: true })
    },
    []
  )

  /* ---- context ---------------------------------------------------------- */

  const openDialog = React.useCallback(
    (request: PdfEditorDialogRequest) => setDialog(request),
    []
  )
  const toggleLeftPanel = React.useCallback(
    (panel: PdfEditorLeftPanel) =>
      setLeftPanel((previous) => (previous === panel ? null : panel)),
    [setLeftPanel]
  )
  const toggleRightPanel = React.useCallback(
    (panel: PdfEditorRightPanel) =>
      setRightPanel((previous) => (previous === panel ? null : panel)),
    []
  )

  const contextValue = React.useMemo<PdfEditorContextValue>(
    () => ({
      documentId,
      document: pdfDocument,
      fileName,
      mode,
      setMode,
      leftPanel,
      setLeftPanel,
      toggleLeftPanel,
      rightPanel,
      setRightPanel,
      toggleRightPanel,
      openDialog,
      notify,
      features,
      permissions,
      annotationAuthor,
      selectionActions,
      formDesignMode,
      setFormDesignMode,
      replaceDocument: (buffer, name) =>
        onReplaceDocument(buffer, name ?? fileName),
      downloadDocument,
      getDocumentBuffer,
      scrollToPage,
      scrollToAnnotation,
      onCapture,
      onSelectionAction,
      signatureFontsStylesheetUrl,
    }),
    [
      annotationAuthor,
      documentId,
      downloadDocument,
      features,
      fileName,
      formDesignMode,
      getDocumentBuffer,
      leftPanel,
      mode,
      notify,
      onCapture,
      onReplaceDocument,
      onSelectionAction,
      openDialog,
      pdfDocument,
      permissions,
      rightPanel,
      scrollToAnnotation,
      scrollToPage,
      selectionActions,
      setFormDesignMode,
      setLeftPanel,
      setMode,
      signatureFontsStylesheetUrl,
      toggleLeftPanel,
      toggleRightPanel,
    ]
  )

  /* ---- page renderer ---------------------------------------------------- */

  const renderPage = React.useCallback(
    (page: PageLayout) => (
      <Rotate documentId={documentId} pageIndex={page.pageIndex}>
        <PagePointerProvider
          documentId={documentId}
          pageIndex={page.pageIndex}
          data-pdf-editor-page={page.pageNumber}
          className="relative border border-transparent bg-transparent shadow-xs select-none selection:bg-transparent selection:text-inherit"
          style={{ backgroundColor: "transparent" }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-white"
          />
          <RenderLayer
            documentId={documentId}
            pageIndex={page.pageIndex}
            scale={Math.min(currentZoom, PAGE_BASE_RENDER_MAX_SCALE)}
            dpr={PAGE_BASE_RENDER_DPR}
            className="pointer-events-none absolute inset-0 h-full w-full object-fill opacity-100 blur-[0.35px] transition-none"
          />
          <TilingLayer
            documentId={documentId}
            pageIndex={page.pageIndex}
            className="pointer-events-none opacity-100 transition-none [&_img]:opacity-100 [&_img]:transition-none"
          />
          <SearchLayer
            documentId={documentId}
            pageIndex={page.pageIndex}
            className="pointer-events-none"
            highlightColor="rgba(253, 224, 71, 0.45)"
            activeHighlightColor="rgba(249, 115, 22, 0.55)"
          />
          <MarqueeZoom documentId={documentId} pageIndex={page.pageIndex} />
          <MarqueeCapture documentId={documentId} pageIndex={page.pageIndex} />
          <SelectionLayer
            documentId={documentId}
            pageIndex={page.pageIndex}
            textStyle={{ background: "rgba(59, 130, 246, 0.3)" }}
            selectionMenu={(props) => (
              <PdfEditorTextSelectionMenu {...props} documentId={documentId} />
            )}
          />
          <AnnotationLayer
            documentId={documentId}
            pageIndex={page.pageIndex}
            selectionOutline={{
              color: PDF_EDITOR_SELECTION_COLOR,
              style: "solid",
              width: 1,
              offset: 2,
            }}
            groupSelectionOutline={{
              color: PDF_EDITOR_SELECTION_COLOR,
              style: "dashed",
              width: 1,
              offset: 3,
            }}
            resizeUI={{ size: 10, color: PDF_EDITOR_SELECTION_COLOR }}
            vertexUI={{ size: 10, color: PDF_EDITOR_SELECTION_COLOR }}
            rotationUI={{
              size: 18,
              color: "#ffffff",
              iconColor: PDF_EDITOR_SELECTION_COLOR,
              connectorColor: PDF_EDITOR_SELECTION_COLOR,
              showConnector: true,
            }}
            selectionMenu={(props) => (
              <PdfEditorAnnotationMenu {...props} documentId={documentId} />
            )}
            groupSelectionMenu={(props) => (
              <PdfEditorGroupMenu {...props} documentId={documentId} />
            )}
          />
          <RedactionLayer
            documentId={documentId}
            pageIndex={page.pageIndex}
            selectionMenu={(props) => (
              <PdfEditorRedactionMenu {...props} documentId={documentId} />
            )}
          />
          {renderPageOverlay?.({
            pageNumber: page.pageNumber,
            pageWidth: page.width,
            pageHeight: page.height,
            scale: currentZoom,
            rotation: 0,
          })}
        </PagePointerProvider>
      </Rotate>
    ),
    [currentZoom, documentId, renderPageOverlay]
  )

  /* ---- toolbar pieces --------------------------------------------------- */

  const activeToolColorKey = React.useMemo(() => {
    if (!activeTool) return null

    const defaults = activeTool.defaults as Record<string, unknown>

    if ("fontColor" in defaults) return "fontColor"
    if ("strokeColor" in defaults) return "strokeColor"
    if ("color" in defaults) return "color"
    return null
  }, [activeTool])
  const activeToolColor = activeToolColorKey
    ? String(
        (activeTool?.defaults as Record<string, unknown>)[activeToolColorKey] ??
          "#111827"
      )
    : null

  const visibleLeftTabs = LEFT_PANEL_TABS.filter(
    (tab) => tab.feature === null || features[tab.feature]
  )
  const visibleRightTabs = RIGHT_PANEL_TABS.filter(
    (tab) => tab.feature === null || features[tab.feature]
  )

  const canAnnotate = features.annotate && permissions.canModifyAnnotations
  const canRedact = features.redact && permissions.canModifyContents
  const canDesignForms = features.forms && permissions.canModifyAnnotations

  const selectToolButton = (
    <PdfEditorToolButton
      label="Select"
      shortcut="V"
      active={
        !activeToolId &&
        !isPanning &&
        !captureState.isMarqueeCaptureActive &&
        !zoomState.isMarqueeZoomActive &&
        !redactionState.isRedacting
      }
      onClick={deactivateTools}
    >
      <CursorGlyph className="size-4" />
    </PdfEditorToolButton>
  )

  const renderToolButton = (
    tool: { id: string; label: string; glyph: PdfEditorGlyph; hint?: string },
    disabled: boolean
  ) => {
    const Glyph = tool.glyph

    return (
      <PdfEditorToolButton
        key={tool.id}
        label={tool.hint ? `${tool.label} · ${tool.hint}` : tool.label}
        active={activeToolId === tool.id}
        disabled={disabled}
        onClick={() => setActiveTool(tool.id)}
      >
        <Glyph className="size-4" />
      </PdfEditorToolButton>
    )
  }

  let ribbon: React.ReactNode = null

  if (mode === "view") {
    ribbon = (
      <>
        {selectToolButton}
        <PdfEditorToolButton
          label="Hand tool"
          shortcut="H"
          active={isPanning}
          onClick={() => pan?.togglePan()}
        >
          <HandGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolButton
          label="Zoom to area"
          active={zoomState.isMarqueeZoomActive}
          onClick={() => zoom?.toggleMarqueeZoom()}
        >
          <MarqueeZoomGlyph className="size-4" />
        </PdfEditorToolButton>
        {features.capture ? (
          <PdfEditorToolButton
            label="Capture area as image"
            active={captureState.isMarqueeCaptureActive}
            onClick={() => capture?.toggleMarqueeCapture()}
          >
            <CameraGlyph className="size-4" />
          </PdfEditorToolButton>
        ) : null}
        <PdfEditorToolbarSeparator />
        <Select
          items={SPREAD_MODE_OPTIONS}
          value={spreadMode}
          disabled={controlsDisabled}
          modal={false}
          onValueChange={(value) =>
            spread?.setSpreadMode(String(value) as SpreadMode)
          }
        >
          <SelectTrigger
            size="sm"
            className="w-[132px]"
            aria-label="Page layout"
          >
            <BookOpenGlyph className="size-4 text-muted-foreground" />
            <SelectValue placeholder="Layout" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {SPREAD_MODE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={SCROLL_DIRECTION_OPTIONS}
          value={horizontalScroll ? "horizontal" : "vertical"}
          disabled={controlsDisabled}
          modal={false}
          onValueChange={(value) => {
            const horizontal = value === "horizontal"
            setHorizontalScroll(horizontal)
            scrollCapability?.setScrollStrategy(
              horizontal ? ScrollStrategy.Horizontal : ScrollStrategy.Vertical,
              documentId
            )
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-[128px]"
            aria-label="Scroll direction"
          >
            <SelectValue placeholder="Scroll" />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {SCROLL_DIRECTION_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    )
  } else if (mode === "annotate") {
    ribbon = (
      <>
        {selectToolButton}
        {PDF_EDITOR_ANNOTATION_TOOL_GROUPS.map((group) => (
          <React.Fragment key={group.id}>
            <PdfEditorToolbarSeparator />
            {group.tools.map((tool) => renderToolButton(tool, !canAnnotate))}
          </React.Fragment>
        ))}
        {features.stamps ? (
          <PdfEditorToolButton
            label="Rubber stamps"
            active={rightPanel === "stamps"}
            disabled={!canAnnotate}
            onClick={() => toggleRightPanel("stamps")}
          >
            <StampGlyph className="size-4" />
          </PdfEditorToolButton>
        ) : null}
        {activeTool && activeToolColorKey && activeToolColor ? (
          <>
            <PdfEditorToolbarSeparator />
            <ColorPicker
              label={`${activeTool.name} color`}
              icon={PaletteGlyph}
              color={activeToolColor}
              onChange={(color) =>
                annotationCapability?.setToolDefaults(activeTool.id, {
                  [activeToolColorKey]: color,
                })
              }
            />
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-0.5">
          <PdfEditorToolButton
            label="Delete selected"
            shortcut="Delete"
            disabled={selectedAnnotations.length === 0}
            onClick={deleteSelectedAnnotations}
          >
            <TrashGlyph className="size-4" />
          </PdfEditorToolButton>
          {features.comments ? (
            <PdfEditorToolButton
              label="Comments"
              active={rightPanel === "comments"}
              onClick={() => toggleRightPanel("comments")}
            >
              <CommentsGlyph className="size-4" />
            </PdfEditorToolButton>
          ) : null}
          <PdfEditorToolButton
            label="Properties"
            active={rightPanel === "properties"}
            onClick={() => toggleRightPanel("properties")}
          >
            <SlidersGlyph className="size-4" />
          </PdfEditorToolButton>
        </div>
      </>
    )
  } else if (mode === "sign") {
    ribbon = (
      <>
        {selectToolButton}
        <PdfEditorToolbarSeparator />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!canAnnotate}
          onClick={() => setDialog({ type: "signature" })}
        >
          <PlusGlyph className="size-4" />
          Create signature
        </Button>
        <PdfEditorToolButton
          label="Saved signatures"
          active={rightPanel === "signatures"}
          onClick={() => toggleRightPanel("signatures")}
        >
          <SignatureGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolbarSeparator />
        {renderToolButton(
          {
            id: "freeText",
            label: "Text box",
            glyph: TextGlyph,
            hint: "Click to add text",
          },
          !canAnnotate
        )}
        <PdfEditorToolButton
          label="Date · Click to add today's date"
          disabled={!canAnnotate}
          active={
            activeToolId === "freeText" &&
            Boolean(annotationState.activeToolContext?.date)
          }
          onClick={() => {
            if (!annotation) return

            annotationCapability?.setToolDefaults("freeText", {
              contents: new Date().toLocaleDateString(),
            })
            annotation.setActiveTool("freeText", { date: true })
          }}
        >
          <FileTextGlyph className="size-4" />
        </PdfEditorToolButton>
        {renderToolButton(
          { id: "ink", label: "Draw", glyph: EditGlyph, hint: "Sign by hand" },
          !canAnnotate
        )}
      </>
    )
  } else if (mode === "forms") {
    ribbon = (
      <>
        {selectToolButton}
        <PdfEditorToolbarSeparator />
        <div
          role="group"
          aria-label="Form mode"
          className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted p-0.5"
        >
          <Button
            type="button"
            size="xs"
            variant={formDesignMode ? "ghost" : "default"}
            aria-pressed={!formDesignMode}
            onClick={() => setFormDesignMode(false)}
          >
            Fill
          </Button>
          <Button
            type="button"
            size="xs"
            variant={formDesignMode ? "default" : "ghost"}
            aria-pressed={formDesignMode}
            disabled={!canDesignForms}
            onClick={() => setFormDesignMode(true)}
          >
            Design
          </Button>
        </div>
        {formDesignMode ? (
          <>
            <PdfEditorToolbarSeparator />
            {PDF_EDITOR_FORM_TOOLS.map((tool) =>
              renderToolButton(tool, !canDesignForms)
            )}
          </>
        ) : null}
        <div className="ml-auto flex items-center gap-0.5">
          <PdfEditorToolButton
            label="Delete selected"
            shortcut="Delete"
            disabled={selectedAnnotations.length === 0 || !formDesignMode}
            onClick={deleteSelectedAnnotations}
          >
            <TrashGlyph className="size-4" />
          </PdfEditorToolButton>
          <PdfEditorToolButton
            label="Form fields"
            active={rightPanel === "forms"}
            onClick={() => toggleRightPanel("forms")}
          >
            <TextFieldGlyph className="size-4" />
          </PdfEditorToolButton>
          <PdfEditorToolButton
            label="Properties"
            active={rightPanel === "properties"}
            onClick={() => toggleRightPanel("properties")}
          >
            <SlidersGlyph className="size-4" />
          </PdfEditorToolButton>
        </div>
      </>
    )
  } else if (mode === "redact") {
    const activeType = redactionState.activeType
    const pendingCount = redactionState.pendingCount

    ribbon = (
      <>
        {selectToolButton}
        <PdfEditorToolbarSeparator />
        <PdfEditorToolButton
          label="Redact · Select text or drag an area"
          active={activeType === RedactionMode.Redact}
          disabled={!canRedact}
          onClick={() => {
            deactivateTools()
            if (activeType !== RedactionMode.Redact) redaction?.enableRedact()
          }}
        >
          <EyeOffGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolButton
          label="Mark text"
          active={activeType === RedactionMode.RedactSelection}
          disabled={!canRedact}
          onClick={() => {
            deactivateTools()
            if (activeType !== RedactionMode.RedactSelection)
              redaction?.enableRedactSelection()
          }}
        >
          <StrikethroughGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolButton
          label="Mark area"
          active={activeType === RedactionMode.MarqueeRedact}
          disabled={!canRedact}
          onClick={() => {
            deactivateTools()
            if (activeType !== RedactionMode.MarqueeRedact)
              redaction?.enableMarqueeRedact()
          }}
        >
          <RedactAreaGlyph className="size-4" />
        </PdfEditorToolButton>
        <PdfEditorToolbarSeparator />
        <Badge
          variant={pendingCount > 0 ? "secondary" : "outline"}
          className="me-1 tabular-nums"
        >
          {pendingCount} pending
        </Badge>
        <Button
          type="button"
          size="sm"
          disabled={!canRedact || pendingCount === 0}
          onClick={applyAllRedactions}
        >
          Apply all
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pendingCount === 0}
          onClick={() => redaction?.clearPending()}
        >
          Clear
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          <PdfEditorToolButton
            label="Redactions"
            active={rightPanel === "redactions"}
            onClick={() => toggleRightPanel("redactions")}
          >
            <EyeOffGlyph className="size-4" />
          </PdfEditorToolButton>
          <PdfEditorToolButton
            label="Properties"
            active={rightPanel === "properties"}
            onClick={() => toggleRightPanel("properties")}
          >
            <SlidersGlyph className="size-4" />
          </PdfEditorToolButton>
        </div>
      </>
    )
  }

  let rightPanelContent: React.ReactNode = null

  switch (rightPanel) {
    case "properties":
      rightPanelContent = <PdfEditorPropertiesPanel documentId={documentId} />
      break
    case "comments":
      rightPanelContent = <PdfEditorCommentsPanel documentId={documentId} />
      break
    case "redactions":
      rightPanelContent = <PdfEditorRedactionsPanel documentId={documentId} />
      break
    case "stamps":
      rightPanelContent = <PdfEditorStampsPanel documentId={documentId} />
      break
    case "signatures":
      rightPanelContent = <PdfEditorSignaturesPanel documentId={documentId} />
      break
    case "forms":
      rightPanelContent = <PdfEditorFormsPanel documentId={documentId} />
      break
    default:
      rightPanelContent = null
  }

  let leftPanelContent: React.ReactNode = null

  switch (leftPanel) {
    case "thumbnails":
      leftPanelContent = (
        <PdfEditorThumbnailsPanel
          documentId={documentId}
          activePage={activePage}
          pageCount={numPages}
          onSelectPage={(pageNumber) => scrollToPage(pageNumber)}
        />
      )
      break
    case "outline":
      leftPanelContent = <PdfEditorOutlinePanel documentId={documentId} />
      break
    case "attachments":
      leftPanelContent = <PdfEditorAttachmentsPanel documentId={documentId} />
      break
    case "pages":
      leftPanelContent = (
        <PdfEditorPagesPanel documentId={documentId} activePage={activePage} />
      )
      break
    default:
      leftPanelContent = null
  }

  return (
    <PdfEditorContextProvider value={contextValue}>
      <ToastProvider
        limit={3}
        timeout={NOTICE_DURATION_MS}
        toastManager={editorToastManager}
        portalProps={{ container: toastContainer }}
        viewportProps={{ className: "absolute" }}
      >
        <div
          data-slot="pdf-editor"
          data-mode={mode}
          data-state={documentState}
          aria-busy={documentState === "loading"}
          data-fullscreen={fullscreenState.isFullscreen ? "" : undefined}
          className={cn(
            "flex h-full max-h-full min-h-0 w-full flex-col overflow-hidden bg-background",
            className,
            // The fullscreen plugin auto-mounts a wrapper around the EmbedPDF
            // tree; when that wrapper is fullscreen, fill it instead of the
            // consumer-provided height.
            fullscreenState.isFullscreen && "h-full max-h-full"
          )}
        >
          <div
            ref={setRootElement}
            tabIndex={-1}
            className="relative flex h-full min-h-0 flex-1 flex-col outline-none"
            onKeyDown={handleKeyDown}
            onPointerDownCapture={handlePointerDownCapture}
          >
            <input
              ref={uploadInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onUploadFile(file)
                event.currentTarget.value = ""
              }}
            />
            <input
              ref={annotationImportInputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void importAnnotationsFile(file)
                event.currentTarget.value = ""
              }}
            />

            {showToolbar ? (
              <TooltipProvider delay={TOOLTIP_DELAY_MS}>
                <fieldset disabled={controlsDisabled} className="contents">
                  <div
                    data-slot="pdf-editor-toolbar"
                    className={cn(
                      "flex min-h-12 flex-wrap items-center justify-between gap-2 border-b bg-background px-3 py-2",
                      compactToolbar && "gap-0 px-0 py-0"
                    )}
                  >
                    <div
                      className={cn(
                        "flex min-w-0 items-center gap-2",
                        compactToolbar && "w-full px-3 py-2"
                      )}
                    >
                      <PdfEditorToolButton
                        label="Pages sidebar"
                        active={leftPanel !== null}
                        disabled={controlsDisabled}
                        onClick={() => toggleLeftPanel("thumbnails")}
                      >
                        <PanelLeftGlyph className="size-4" />
                      </PdfEditorToolButton>
                      <PdfEditorPageControl
                        activePage={activePage}
                        numPages={numPages}
                        disabled={controlsDisabled}
                        onPageChange={(pageNumber) => scrollToPage(pageNumber)}
                      />
                    </div>
                    <ScrollArea
                      orientation="horizontal"
                      scrollFade
                      scrollbarOverflowOnly
                      className={cn(
                        "min-w-0 flex-1",
                        compactToolbar && "h-12 w-full flex-none border-t"
                      )}
                      viewportClassName={cn(compactToolbar && "px-3 py-2")}
                    >
                      <div
                        className={cn(
                          "flex w-max min-w-full items-center gap-1",
                          compactToolbar ? "justify-start" : "justify-end"
                        )}
                      >
                        <div className="flex items-center gap-0.5">
                          <PdfEditorToolButton
                            label="Undo"
                            shortcut="mod+Z"
                            disabled={!historyState.canUndo}
                            onClick={() => historyScope?.undo()}
                          >
                            <UndoGlyph className="size-4" />
                          </PdfEditorToolButton>
                          <PdfEditorToolButton
                            label="Redo"
                            shortcut="mod+shift+Z"
                            disabled={!historyState.canRedo}
                            onClick={() => historyScope?.redo()}
                          >
                            <RedoGlyph className="size-4" />
                          </PdfEditorToolButton>
                        </div>
                        <PdfEditorToolbarSeparator />
                        <PdfEditorZoomControl
                          documentId={documentId}
                          disabled={controlsDisabled}
                        />
                        <PdfEditorToolbarSeparator />
                        <div className="flex items-center gap-0.5">
                          <PdfEditorToolButton
                            label="Rotate counterclockwise"
                            disabled={controlsDisabled}
                            onClick={() => rotate?.rotateBackward()}
                          >
                            <RotateGlyph className="size-4 -scale-x-100" />
                          </PdfEditorToolButton>
                          <PdfEditorToolButton
                            label="Rotate clockwise"
                            disabled={controlsDisabled}
                            onClick={() => rotate?.rotateForward()}
                          >
                            <RotateGlyph className="size-4" />
                          </PdfEditorToolButton>
                        </div>
                        <PdfEditorToolbarSeparator />
                        <PdfEditorSearchControl
                          documentId={documentId}
                          disabled={controlsDisabled}
                          open={searchOpen}
                          onOpenChange={setSearchOpen}
                        />
                        <PdfEditorToolButton
                          label="Details panel"
                          active={rightPanel !== null}
                          disabled={controlsDisabled}
                          onClick={() => toggleRightPanel("properties")}
                        >
                          <PanelRightGlyph className="size-4" />
                        </PdfEditorToolButton>
                        {toolbarActions ? (
                          <>
                            <PdfEditorToolbarSeparator />
                            {toolbarActions}
                          </>
                        ) : null}
                        <PdfEditorToolbarSeparator />
                        {showDownload ? (
                          <PdfEditorToolButton
                            label="Download"
                            shortcut="mod+S"
                            disabled={controlsDisabled || isDownloading}
                            onClick={() => void downloadDocument()}
                          >
                            {isDownloading ? (
                              <Spinner className="size-4" />
                            ) : (
                              <DownloadGlyph className="size-4" />
                            )}
                          </PdfEditorToolButton>
                        ) : null}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="More actions"
                            >
                              <MoreGlyph className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-60">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="truncate">
                                {fileName}
                              </DropdownMenuLabel>
                              {showUpload ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    uploadInputRef.current?.click()
                                  }
                                >
                                  <UploadGlyph className="size-4" />
                                  Open PDF…
                                </DropdownMenuItem>
                              ) : null}
                              {showDownload ? (
                                <DropdownMenuItem
                                  disabled={controlsDisabled}
                                  onClick={() => void downloadDocument()}
                                >
                                  <DownloadGlyph className="size-4" />
                                  Download
                                  <DropdownMenuShortcut>
                                    ⌘S
                                  </DropdownMenuShortcut>
                                </DropdownMenuItem>
                              ) : null}
                              {features.print ? (
                                <DropdownMenuItem
                                  disabled={
                                    controlsDisabled || !permissions.canPrint
                                  }
                                  onClick={() => setDialog({ type: "print" })}
                                >
                                  <PrintGlyph className="size-4" />
                                  Print…
                                  <DropdownMenuShortcut>
                                    ⌘P
                                  </DropdownMenuShortcut>
                                </DropdownMenuItem>
                              ) : null}
                              {features.capture ? (
                                <DropdownMenuItem
                                  disabled={controlsDisabled}
                                  onClick={() =>
                                    capture?.toggleMarqueeCapture()
                                  }
                                >
                                  <CameraGlyph className="size-4" />
                                  Capture area as image
                                </DropdownMenuItem>
                              ) : null}
                              {features.fullscreen ? (
                                <DropdownMenuItem
                                  onClick={() => fullscreen?.toggleFullscreen()}
                                >
                                  {fullscreenState.isFullscreen ? (
                                    <ExitFullscreenGlyph className="size-4" />
                                  ) : (
                                    <FullscreenGlyph className="size-4" />
                                  )}
                                  {fullscreenState.isFullscreen
                                    ? "Exit full screen"
                                    : "Full screen"}
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                disabled={controlsDisabled}
                                onClick={() =>
                                  setDialog({ type: "properties" })
                                }
                              >
                                <InfoGlyph className="size-4" />
                                Document properties…
                              </DropdownMenuItem>
                              {features.security ? (
                                <DropdownMenuItem
                                  disabled={controlsDisabled}
                                  onClick={() =>
                                    setDialog({ type: "security" })
                                  }
                                >
                                  <ShieldGlyph className="size-4" />
                                  Security…
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                disabled={
                                  controlsDisabled ||
                                  !permissions.canModifyContents
                                }
                                onClick={flattenDocument}
                              >
                                <LayersGlyph className="size-4" />
                                Flatten annotations…
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                disabled={controlsDisabled}
                                onClick={exportAnnotationsJson}
                              >
                                <DownloadGlyph className="size-4" />
                                Export annotations (JSON)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={
                                  controlsDisabled ||
                                  !permissions.canModifyAnnotations
                                }
                                onClick={() =>
                                  annotationImportInputRef.current?.click()
                                }
                              >
                                <UploadGlyph className="size-4" />
                                Import annotations (JSON)…
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuLabel>Page layout</DropdownMenuLabel>
                              <DropdownMenuRadioGroup
                                value={spreadMode}
                                onValueChange={(value) =>
                                  spread?.setSpreadMode(
                                    String(value) as SpreadMode
                                  )
                                }
                              >
                                <DropdownMenuRadioItem value={SpreadMode.None}>
                                  Single page
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value={SpreadMode.Odd}>
                                  Two pages
                                </DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value={SpreadMode.Even}>
                                  Two pages, cover first
                                </DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDialog({ type: "shortcuts" })}
                            >
                              <KeyboardGlyph className="size-4" />
                              Keyboard shortcuts
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </ScrollArea>
                  </div>
                  <div
                    data-slot="pdf-editor-ribbon"
                    className="flex min-h-10 items-center gap-1 border-b bg-muted/30 px-3 py-1.5"
                  >
                    <PdfEditorModeSwitch
                      mode={mode}
                      features={features}
                      compact={compactToolbar}
                      onModeChange={setMode}
                    />
                    <PdfEditorToolbarSeparator className="mx-1.5" />
                    <ScrollArea
                      orientation="horizontal"
                      scrollFade
                      scrollbarOverflowOnly
                      className="min-w-0 flex-1 self-stretch"
                    >
                      <div className="flex w-max min-w-full items-center gap-0.5 py-0.5">
                        {ribbon}
                      </div>
                    </ScrollArea>
                  </div>
                </fieldset>
              </TooltipProvider>
            ) : null}

            <div
              ref={shellRef}
              className="relative flex min-h-0 flex-1 overflow-hidden bg-muted/30"
            >
              <PdfEditorWorkspace
                leftInline={leftInline}
                rightInline={rightInline}
                left={
                  leftPanel !== null ? (
                    <div className="flex h-full flex-col">
                      <PanelTabStrip
                        tabs={visibleLeftTabs}
                        value={leftPanel}
                        onChange={setLeftPanel}
                        onClose={() => setLeftPanel(null)}
                        label="Sidebar panels"
                        disabled={controlsDisabled}
                      />
                      <div className="min-h-0 flex-1">
                        {controlsDisabled ? null : leftPanelContent}
                      </div>
                    </div>
                  ) : null
                }
                right={
                  rightPanel !== null ? (
                    <div className="flex h-full flex-col">
                      <PanelTabStrip
                        tabs={visibleRightTabs}
                        value={rightPanel}
                        onChange={setRightPanel}
                        onClose={() => setRightPanel(null)}
                        label="Detail panels"
                        disabled={controlsDisabled}
                      />
                      <div className="min-h-0 flex-1 overflow-hidden">
                        {controlsDisabled ? null : rightPanel ===
                          "properties" ? (
                          <PdfEditorScrollArea
                            className="h-full w-full"
                            scrollbarGutter={false}
                          >
                            {rightPanelContent}
                          </PdfEditorScrollArea>
                        ) : (
                          rightPanelContent
                        )}
                      </div>
                    </div>
                  ) : null
                }
              >
                {controlsDisabled ? (
                  unavailableContent
                ) : (
                  <PdfEditorViewport
                    documentId={documentId}
                    className="relative h-full max-h-full min-h-0 min-w-0 flex-1"
                  >
                    <PdfEditorViewportBridge
                      viewportElementRef={viewportElementRef}
                    />
                    <GlobalPointerProvider documentId={documentId}>
                      <Scroller
                        documentId={documentId}
                        renderPage={renderPage}
                      />
                    </GlobalPointerProvider>
                    <CopyToClipboard />
                  </PdfEditorViewport>
                )}
              </PdfEditorWorkspace>
            </div>

            {!controlsDisabled ? (
              <>
                {features.capture ? (
                  <PdfEditorCaptureDialog documentId={documentId} />
                ) : null}
                <PdfEditorPrintDialog
                  documentId={documentId}
                  open={dialog?.type === "print"}
                  onOpenChange={(open) => {
                    if (!open) setDialog(null)
                  }}
                />
                <PdfEditorSecurityDialog
                  documentId={documentId}
                  open={dialog?.type === "security"}
                  onOpenChange={(open) => {
                    if (!open) setDialog(null)
                  }}
                />
                <PdfEditorPropertiesDialog
                  documentId={documentId}
                  open={dialog?.type === "properties"}
                  onOpenChange={(open) => {
                    if (!open) setDialog(null)
                  }}
                />
                <PdfEditorShortcutsDialog
                  open={dialog?.type === "shortcuts"}
                  onOpenChange={(open) => {
                    if (!open) setDialog(null)
                  }}
                />
                <PdfEditorSignatureDialog
                  open={dialog?.type === "signature"}
                  onOpenChange={(open) => {
                    if (!open) setDialog(null)
                  }}
                />
                <PdfEditorLinkDialog
                  documentId={documentId}
                  open={dialog?.type === "link"}
                  source={dialog?.type === "link" ? dialog.source : "selection"}
                  onOpenChange={(open) => {
                    if (!open) setDialog(null)
                  }}
                />
                <PdfEditorConfirmDialog
                  open={dialog?.type === "confirm"}
                  title={dialog?.type === "confirm" ? dialog.title : ""}
                  description={
                    dialog?.type === "confirm" ? dialog.description : undefined
                  }
                  confirmLabel={
                    dialog?.type === "confirm" ? dialog.confirmLabel : undefined
                  }
                  destructive={
                    dialog?.type === "confirm" ? dialog.destructive : false
                  }
                  onConfirm={() => {
                    if (dialog?.type === "confirm") dialog.onConfirm()
                  }}
                  onOpenChange={(open) => {
                    if (!open) setDialog(null)
                  }}
                />
              </>
            ) : null}
          </div>
        </div>
      </ToastProvider>
    </PdfEditorContextProvider>
  )
}

/* -------------------------------------------------------------------------- */
/* Document loader                                                            */
/* -------------------------------------------------------------------------- */

type PdfEditorDocumentLoaderProps = Omit<
  PdfEditorInnerProps,
  | "documentId"
  | "document"
  | "documentState"
  | "fileName"
  | "leftPanel"
  | "setLeftPanel"
  | "formDesignMode"
  | "setFormDesignMode"
  | "unavailableContent"
> & {
  source: EditorSource | null
  sourceLoading: boolean
  engineError?: string
  fileNameOverride?: string
  signatureStorageKey: string | null
  onDocumentLoadSuccess?: PDFEditorProps["onDocumentLoadSuccess"]
  onDocumentLoadError?: PDFEditorProps["onDocumentLoadError"]
}

function PdfEditorDocumentLoader({
  source,
  sourceLoading,
  engineError,
  fileNameOverride,
  signatureStorageKey,
  onDocumentLoadSuccess,
  onDocumentLoadError,
  ...innerProps
}: PdfEditorDocumentLoaderProps) {
  const registryState = useRegistry()
  const { provides: documentManager } = useDocumentManagerCapability()
  const { activeDocumentId, activeDocument } = useActiveDocument()
  const [loadError, setLoadError] = React.useState<{
    sourceKey: string
    message: string
  } | null>(null)
  const [requestedDocument, setRequestedDocument] = React.useState<{
    sourceKey: string
    documentId: string
  } | null>(null)
  const [leftPanel, setLeftPanel] = React.useState<PdfEditorLeftPanel | null>(
    null
  )
  const [formDesignMode, setFormDesignMode] = React.useState(false)
  const openedSourceRef = React.useRef<string | null>(null)
  const successRef = React.useRef(onDocumentLoadSuccess)
  const errorRef = React.useRef(onDocumentLoadError)

  React.useEffect(() => {
    successRef.current = onDocumentLoadSuccess
    errorRef.current = onDocumentLoadError
  })

  React.useEffect(() => {
    if (!documentManager || !source) return
    if (openedSourceRef.current === source.key) return

    openedSourceRef.current = source.key
    setLoadError(null)

    const previousIds = documentManager
      .getOpenDocuments()
      .map((item) => item.id)
    const fail = (message: string) => {
      if (openedSourceRef.current !== source.key) return

      setLoadError({ sourceKey: source.key, message })
      errorRef.current?.(message)
    }

    const task =
      source.kind === "url"
        ? documentManager.openDocumentUrl({
            url: source.url,
            name: source.name,
            mode: source.url.startsWith("blob:") ? "full-fetch" : "auto",
            autoActivate: previousIds.length === 0,
          })
        : documentManager.openDocumentBuffer({
            buffer: source.buffer.slice(0),
            name: source.name,
            autoActivate: previousIds.length === 0,
          })

    task.wait(
      (response) => {
        if (openedSourceRef.current !== source.key) return
        setRequestedDocument({
          sourceKey: source.key,
          documentId: response.documentId,
        })
        response.task.wait(
          (openedDocument) => {
            if (openedSourceRef.current !== source.key) return
            documentManager.setActiveDocument(response.documentId)
            successRef.current?.({
              numPages: openedDocument.pageCount,
              documentId: response.documentId,
              fileName: source.name,
            })
            previousIds.forEach((id) => {
              if (id !== response.documentId) {
                documentManager.closeDocument(id).wait(noop, noop)
              }
            })
          },
          (failure) => {
            // Password prompts are handled through the document state.
            if (failure?.reason?.code === PdfErrorCode.Password) {
              documentManager.setActiveDocument(response.documentId)
              return
            }
            fail(failure?.reason?.message ?? "The PDF could not be loaded.")
          }
        )
      },
      (failure) =>
        fail(failure?.reason?.message ?? "The PDF could not be loaded.")
    )
  }, [documentManager, source])

  const fileName = fileNameOverride
    ? getPdfFileName(fileNameOverride)
    : (source?.name ?? getPdfFileName(undefined))
  const isRequestedDocument =
    requestedDocument?.sourceKey === source?.key &&
    requestedDocument?.documentId === activeDocumentId
  const currentError =
    loadError?.sourceKey === source?.key ? loadError?.message : undefined
  const passwordRequired =
    isRequestedDocument &&
    activeDocument?.status === "error" &&
    activeDocument.errorCode === PdfErrorCode.Password
  const documentFailed =
    currentError !== undefined ||
    (isRequestedDocument &&
      activeDocument?.status === "error" &&
      !passwordRequired)

  const document =
    !sourceLoading &&
    !documentFailed &&
    !engineError &&
    isRequestedDocument &&
    activeDocument?.status === "loaded"
      ? activeDocument.document
      : null
  const status =
    engineError || documentFailed
      ? "error"
      : !source && !sourceLoading
        ? "empty"
        : "loading"

  return (
    <TooltipProvider delay={TOOLTIP_DELAY_MS}>
      <PdfEditorSignaturePersistence storageKey={signatureStorageKey} />
      <PDFContext.Provider
        value={document ? registryState : EMPTY_EDITOR_CONTEXT}
      >
        <PdfEditorInner
          {...innerProps}
          documentId={document ? activeDocumentId! : ""}
          document={document}
          documentState={
            document ? "ready" : passwordRequired ? "password" : status
          }
          fileName={fileName}
          leftPanel={leftPanel}
          setLeftPanel={setLeftPanel}
          formDesignMode={formDesignMode}
          setFormDesignMode={setFormDesignMode}
          unavailableContent={
            passwordRequired && activeDocument ? (
              <PDFContext.Provider value={registryState}>
                <PdfEditorPasswordPrompt documentState={activeDocument} />
              </PDFContext.Provider>
            ) : (
              <PdfEditorDocumentStatus
                state={status}
                errorMessage={
                  engineError ??
                  currentError ??
                  activeDocument?.error ??
                  undefined
                }
                onUploadFile={
                  innerProps.showUpload ? innerProps.onUploadFile : undefined
                }
              />
            )
          }
        />
      </PDFContext.Provider>
    </TooltipProvider>
  )
}

/* -------------------------------------------------------------------------- */
/* Root                                                                       */
/* -------------------------------------------------------------------------- */

export const PDFEditor = React.forwardRef<PDFEditorHandle, PDFEditorProps>(
  function PDFEditor(
    {
      className,
      src,
      fileName,
      defaultZoom = "fit-width",
      defaultMode = "view",
      annotationAuthor = DEFAULT_ANNOTATION_AUTHOR,
      colorPresets = PDF_EDITOR_DEFAULT_COLOR_PRESETS,
      features,
      showToolbar = true,
      showUpload = true,
      showDownload = true,
      toolbarActions,
      selectionActions,
      persistSignatures = true,
      stampManifests,
      signatureFontsStylesheetUrl = PDF_EDITOR_DEFAULT_SIGNATURE_FONTS_URL,
      resolveScrollAreaViewport,
      renderPageOverlay,
      onDocumentLoadSuccess,
      onDocumentLoadError,
      onActivePageChange,
      onModeChange,
      onAnnotationEvent,
      onAnnotationsChange,
      onFormValuesChange,
      onRedactionsApplied,
      onSave,
      onCapture,
      onPdfUpload,
      onToast,
      onSelectionAction,
    },
    ref
  ) {
    const { engine, error: engineError } = useSharedPdfEngine()
    const {
      source,
      loading: sourceLoading,
      replace,
    } = useEditorSource(src, fileName)
    const handleRef = React.useRef<EditorHandleImpl | null>(null)
    const resolvedFeatures = React.useMemo<PdfEditorResolvedFeatures>(
      () => ({ ...PDF_EDITOR_DEFAULT_FEATURES, ...features }),
      [features]
    )
    const resolvedSelectionActions = React.useMemo(
      () => selectionActions ?? [],
      [selectionActions]
    )
    const signatureStorageKey =
      persistSignatures === false
        ? null
        : typeof persistSignatures === "string"
          ? persistSignatures
          : DEFAULT_SIGNATURE_STORAGE_KEY

    const handleUploadFile = React.useCallback(
      (file: File) => {
        file.arrayBuffer().then((buffer) => {
          replace(buffer, getPdfFileName(file.name))
          onPdfUpload?.(file)
        })
      },
      [onPdfUpload, replace]
    )

    // Plugin registrations are created once per editor instance.
    const [plugins] = React.useState(() => [
      createPluginRegistration(DocumentManagerPluginPackage),
      createPluginRegistration(ViewportPluginPackage, {
        viewportGap: PAGE_GAP,
      }),
      createPluginRegistration(ScrollPluginPackage, {
        defaultPageGap: PAGE_GAP,
        defaultBufferSize: 2,
      }),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(TilingPluginPackage, {
        tileSize: 768,
        overlapPx: 2.5,
        extraRings: 0,
      }),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(SelectionPluginPackage, {
        menuHeight: SELECTION_MENU_HEIGHT,
      }),
      createPluginRegistration(SearchPluginPackage, { showAllResults: true }),
      createPluginRegistration(ThumbnailPluginPackage, {
        width: THUMBNAIL_WIDTH,
        gap: THUMBNAIL_GAP,
        imagePadding: THUMBNAIL_IMAGE_PADDING,
        labelHeight: THUMBNAIL_LABEL_HEIGHT,
        paddingY: THUMBNAIL_PANE_PADDING_Y,
        buffer: 3,
        autoScroll: true,
        scrollBehavior: "auto",
      }),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: toZoomLevel(defaultZoom),
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      }),
      createPluginRegistration(RotatePluginPackage),
      createPluginRegistration(SpreadPluginPackage, {
        defaultSpreadMode: SpreadMode.None,
      }),
      createPluginRegistration(PanPluginPackage, { defaultMode: "never" }),
      createPluginRegistration(HistoryPluginPackage),
      createPluginRegistration(AnnotationPluginPackage, {
        annotationAuthor,
        colorPresets,
        autoCommit: true,
        selectAfterCreate: true,
        deactivateToolAfterCreate: false,
        locked: { type: LockModeType.Include, categories: ["form"] },
      }),
      createPluginRegistration(FormPluginPackage),
      createPluginRegistration(RedactionPluginPackage, {
        drawBlackBoxes: true,
        useAnnotationMode: true,
      }),
      createPluginRegistration(StampPluginPackage, {
        defaultLibrary: {
          id: "custom",
          name: "Custom stamps",
          categories: ["custom", "sidebar"],
        },
        ...(stampManifests && stampManifests.length > 0
          ? {
              manifests: [
                {
                  url: PDF_EDITOR_DEFAULT_STAMP_MANIFEST_URL,
                  fallbackLocale: "en",
                },
                ...stampManifests.map((url) => ({ url })),
              ],
            }
          : {}),
      }),
      createPluginRegistration(SignaturePluginPackage, {
        mode: SignatureMode.SignatureAndInitials,
        defaultSize: { width: 160, height: 56 },
      }),
      createPluginRegistration(ExportPluginPackage, {
        defaultFileName: "document.pdf",
      }),
      createPluginRegistration(PrintPluginPackage),
      createPluginRegistration(CapturePluginPackage, {
        scale: 2,
        imageType: "image/png",
        withAnnotations: true,
      }),
      createPluginRegistration(FullscreenPluginPackage),
      createPluginRegistration(BookmarkPluginPackage),
      createPluginRegistration(AttachmentPluginPackage),
    ])

    React.useImperativeHandle(
      ref,
      () => ({
        getDocumentBuffer: () =>
          handleRef.current?.getDocumentBuffer() ??
          Promise.reject(new Error("The document is not ready.")),
        download: (name) =>
          handleRef.current?.download(name) ?? Promise.resolve(),
        print: (options) =>
          handleRef.current?.print(options) ?? Promise.resolve(),
        exportAnnotations: () =>
          handleRef.current?.exportAnnotations() ?? Promise.resolve([]),
        importAnnotations: (items) =>
          handleRef.current?.importAnnotations(items),
        getFormValues: () => handleRef.current?.getFormValues() ?? {},
        setFormValues: (values) =>
          handleRef.current?.setFormValues(values) ?? Promise.resolve(),
        applyRedactions: () =>
          handleRef.current?.applyRedactions() ?? Promise.resolve(),
        setMode: (mode) => handleRef.current?.setMode(mode),
        setActiveTool: (toolId) => handleRef.current?.setActiveTool(toolId),
        scrollToPage: (pageNumber, options) =>
          handleRef.current?.scrollToPage(pageNumber, options),
        undo: () => handleRef.current?.undo(),
        redo: () => handleRef.current?.redo(),
        getViewportElement: () =>
          handleRef.current?.getViewportElement() ?? null,
      }),
      []
    )

    const editor = (
      <PdfEditorDocumentLoader
        engineError={
          engineError ? "The PDF engine could not be loaded." : undefined
        }
        source={source}
        sourceLoading={sourceLoading}
        fileNameOverride={fileName}
        signatureStorageKey={signatureStorageKey}
        className={className}
        defaultZoom={defaultZoom}
        defaultMode={defaultMode}
        annotationAuthor={annotationAuthor}
        features={resolvedFeatures}
        showToolbar={showToolbar}
        showUpload={showUpload}
        showDownload={showDownload}
        toolbarActions={toolbarActions}
        selectionActions={resolvedSelectionActions}
        signatureFontsStylesheetUrl={signatureFontsStylesheetUrl}
        renderPageOverlay={renderPageOverlay}
        handleRef={handleRef}
        onReplaceDocument={replace}
        onUploadFile={handleUploadFile}
        onDocumentLoadSuccess={onDocumentLoadSuccess}
        onDocumentLoadError={onDocumentLoadError}
        onActivePageChange={onActivePageChange}
        onModeChange={onModeChange}
        onAnnotationEvent={onAnnotationEvent}
        onAnnotationsChange={onAnnotationsChange}
        onFormValuesChange={onFormValuesChange}
        onRedactionsApplied={onRedactionsApplied}
        onSave={onSave}
        onCapture={onCapture}
        onToast={onToast}
        onSelectionAction={onSelectionAction}
      />
    )
    return (
      <PDFContext.Provider value={EMPTY_EDITOR_CONTEXT}>
        <PdfEditorScrollAreaResolverContext.Provider
          value={resolveScrollAreaViewport ?? resolveDefaultScrollAreaViewport}
        >
          {engine ? (
            <EmbedPDF engine={engine} plugins={plugins}>
              {editor}
            </EmbedPDF>
          ) : (
            editor
          )}
        </PdfEditorScrollAreaResolverContext.Provider>
      </PDFContext.Provider>
    )
  }
)
