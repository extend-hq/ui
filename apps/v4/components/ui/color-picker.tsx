"use client"

import * as React from "react"

import {
  clamp,
  cuspColorForHue,
  formatColorValue,
  formatCssColor,
  getOklchPlanePixels,
  hslToRgb,
  hsvToHsl,
  normalizeHue,
  oklchPlaneToRgb,
  oklchToRgb,
  parseColorInput,
  rgbaToHex,
  rgbToHsv,
  rgbToOklch,
  rgbToOklchPlane,
  type ColorFormat,
  type ColorParts,
  type HslColor,
  type HsvColor,
  type OklchColor,
  type RgbColor,
} from "@/lib/color-picker-utils"
import type { RegistryIconProps } from "@/lib/registry-icon-props"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPrimitive,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { IconPlaceholder } from "@/components/icon-placeholder"

const cossInputKeyboardFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
const cossInputWrapperFocusRing =
  "focus-within:border-input-focus focus-within:ring-1 focus-within:ring-input-focus/24 focus-within:ring-offset-0 dark:focus-within:border-input-focus dark:focus-within:ring-input-focus/24"
const cossOutlineEdge =
  "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]"
const cossOutlineEdgeHighlight =
  "before:shadow-[0_1px_--theme(--color-black/4%)] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]"

interface HsvaColor {
  h: number
  s: number
  v: number
  a: number
}

type EyeDropperConstructor = new () => {
  open: () => Promise<{ sRGBHex: string }>
}

declare global {
  interface Window {
    EyeDropper?: EyeDropperConstructor
  }
}

const COLOR_FORMAT_OPTIONS: Array<{ value: ColorFormat; label: string }> = [
  { value: "oklch", label: "OKLCH" },
  { value: "hsl", label: "HSL" },
  { value: "rgb", label: "RGB" },
  { value: "hex", label: "Hex" },
]

const OK_HUE_TRACK = `linear-gradient(to bottom, ${Array.from(
  { length: 25 },
  (_, i) => rgbaToHex(cuspColorForHue(i * 15))
).join(", ")})`

// Ignore hue noise from RGB round trips.
function withHueContinuity<T extends { h: number }>(
  next: T,
  previousHue: number,
  chromaFraction: number
): T {
  const delta = Math.abs(next.h - previousHue) % 360
  const angular = Math.min(delta, 360 - delta)
  const tolerance = Math.min(10, 1.5 / Math.max(chromaFraction, 0.15))
  return angular < tolerance ? { ...next, h: previousHue } : next
}

const triggerGroupClass =
  "relative flex h-10 w-full min-w-0 items-center rounded-md border border-input bg-popover not-dark:bg-clip-padding text-base text-foreground shadow-xs/5 ring-input-focus/32 transition-shadow before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] not-has-disabled:not-has-focus-visible:before:shadow-[0_1px_--theme(--color-black/4%)] has-focus-visible:border-input-focus has-focus-visible:ring-[3px] has-disabled:opacity-64 has-[:disabled,:focus-visible]:shadow-none dark:bg-input/32 dark:ring-input-focus/32 dark:has-focus-visible:border-input-focus dark:not-has-focus-visible:border-white/[0.08] dark:not-has-disabled:before:shadow-[0_-1px_--theme(--color-white/2%)] dark:not-has-disabled:not-has-focus-visible:before:shadow-[0_-1px_--theme(--color-white/6%)]"

const fieldSurfaceClass = cn(
  "relative rounded-md border border-input bg-popover text-foreground shadow-xs/5 transition-shadow not-dark:bg-clip-padding dark:border-white/[0.08] dark:bg-input/32",
  cossOutlineEdge,
  cossOutlineEdgeHighlight,
  cossInputWrapperFocusRing
)

const channelInputClass =
  "h-full w-full min-w-0 border-0 bg-transparent px-1 py-0 text-center text-sm leading-none tabular-nums text-foreground outline-none [transition:background-color_5000000s_ease-in-out_0s] placeholder:text-muted-foreground/72 focus:border-0 focus:outline-none focus:ring-0"

const thumbShadow = "shadow-[0_0_0_1px_rgb(0_0_0/24%),0_1px_2px_rgb(0_0_0/32%)]"

function Checkerboard({
  className,
  size = 8,
}: {
  className?: string
  size?: number
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 bg-white [--checker:#00000024] dark:bg-neutral-700 dark:[--checker:#ffffff2e]",
        className
      )}
      style={{
        backgroundImage:
          "conic-gradient(var(--checker) 0 25%, transparent 0 50%, var(--checker) 0 75%, transparent 0)",
        backgroundSize: `${size}px ${size}px`,
      }}
    />
  )
}

interface DraftInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange"
  > {
  value: string
  onCommitText: (text: string) => void
  onStep?: (direction: 1 | -1, big: boolean) => void
  copyValue?: () => string
  inputRef?: React.MutableRefObject<HTMLInputElement | null>
}

function DraftInput({
  value,
  onCommitText,
  onStep,
  copyValue,
  inputRef,
  ...props
}: DraftInputProps) {
  const [draft, setDraft] = React.useState<string | null>(null)
  const internalRef = React.useRef<HTMLInputElement | null>(null)
  // Keep mouseup from clearing the focus selection.
  const keepSelectionRef = React.useRef(false)

  const setRefs = (node: HTMLInputElement | null) => {
    internalRef.current = node
    if (inputRef) inputRef.current = node
  }

  const commitDraft = () => {
    if (draft !== null && draft.trim() !== value) onCommitText(draft)
    setDraft(null)
  }

  const reselect = () => {
    requestAnimationFrame(() => internalRef.current?.select())
  }

  return (
    <input
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      type="text"
      {...props}
      ref={setRefs}
      value={draft ?? value}
      onFocus={(event) => {
        setDraft(event.currentTarget.value)
        event.currentTarget.select()
        keepSelectionRef.current = true
      }}
      onMouseUp={(event) => {
        if (keepSelectionRef.current) {
          event.preventDefault()
          keepSelectionRef.current = false
        }
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commitDraft}
      onCopy={(event) => {
        if (!copyValue) return
        const input = event.currentTarget
        const fullySelected =
          input.value.length > 0 &&
          input.selectionStart === 0 &&
          input.selectionEnd === input.value.length
        if (!fullySelected) return
        event.preventDefault()
        event.clipboardData.setData("text/plain", copyValue())
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          commitDraft()
          reselect()
        } else if (event.key === "Escape") {
          if (draft !== null) {
            event.stopPropagation()
            setDraft(null)
          }
        } else if (
          onStep &&
          (event.key === "ArrowUp" || event.key === "ArrowDown")
        ) {
          event.preventDefault()
          setDraft(null)
          onStep(event.key === "ArrowUp" ? 1 : -1, event.shiftKey)
          reselect()
        }
      }}
    />
  )
}

interface ChannelSpec {
  key: string
  label: string
  ariaLabel: string
  value: string
  numericValue: number
  step: number
  bigStep: number
  commit: (next: number) => void
}

function parseChannelText(text: string): number | null {
  const numeric = Number.parseFloat(text.replace(/[%°]/g, "").trim())
  return Number.isFinite(numeric) ? numeric : null
}

function ChannelGroup({
  channels,
  copyValue,
  disabled,
}: {
  channels: ChannelSpec[]
  copyValue: string
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-1.5">
      <div className="min-w-0 flex-1">
        <div className={cn(fieldSurfaceClass, "grid h-8 grid-cols-3")}>
          {channels.map((channel) => (
            <DraftInput
              key={channel.key}
              aria-label={channel.ariaLabel}
              className={channelInputClass}
              disabled={disabled}
              inputMode="decimal"
              value={channel.value}
              onCommitText={(text) => {
                const numeric = parseChannelText(text)
                if (numeric !== null) channel.commit(numeric)
              }}
              onStep={(direction, big) =>
                channel.commit(
                  channel.numericValue +
                    direction * (big ? channel.bigStep : channel.step)
                )
              }
            />
          ))}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-input dark:bg-white/[0.08]"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-input dark:bg-white/[0.08]"
          />
        </div>
        <div className="mt-1 grid h-4 grid-cols-3 items-center text-center text-xs font-medium text-muted-foreground">
          {channels.map((channel) => (
            <span key={channel.key}>{channel.label}</span>
          ))}
        </div>
      </div>
      <CopyColorButton text={copyValue} />
    </div>
  )
}

function SaturationValueArea({
  hue,
  s,
  v,
  color,
  onMove,
}: {
  hue: number
  s: number
  v: number
  color: string
  onMove: (s: number, v: number) => void
}) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  // Avoid redraws for imperceptible hue changes.
  const quantizedHue = Math.round(normalizeHue(hue) * 2) / 2

  React.useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return
    const image = context.createImageData(canvas.width, canvas.height)
    image.data.set(
      getOklchPlanePixels(canvas.width, canvas.height, quantizedHue)
    )
    context.putImageData(image, 0, 0)
  }, [quantizedHue])

  const update = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const inset = 7
    onMove(
      clamp(
        ((event.clientX - rect.left - inset) / (rect.width - inset * 2)) * 100,
        0,
        100
      ),
      clamp(
        100 -
          ((event.clientY - rect.top - inset) / (rect.height - inset * 2)) *
            100,
        0,
        100
      )
    )
  }

  return (
    <button
      type="button"
      aria-label="Chroma and lightness"
      className={cn(
        "relative size-53 shrink-0 cursor-crosshair touch-none rounded-lg",
        cossInputKeyboardFocusRing
      )}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        event.currentTarget.focus()
        update(event)
      }}
      onPointerMove={(event) => {
        if ((event.buttons & 1) === 0) return
        update(event)
      }}
      onKeyDown={(event) => {
        const delta = event.shiftKey ? 10 : 1
        let next: [number, number] | null = null
        if (event.key === "ArrowLeft") next = [s - delta, v]
        if (event.key === "ArrowRight") next = [s + delta, v]
        if (event.key === "ArrowUp") next = [s, v + delta]
        if (event.key === "ArrowDown") next = [s, v - delta]
        if (next) {
          event.preventDefault()
          onMove(clamp(next[0], 0, 100), clamp(next[1], 0, 100))
        }
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        width={168}
        height={168}
        className="pointer-events-none absolute inset-0 size-full rounded-[inherit]"
      />
      <span
        className={cn(
          "pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-white",
          thumbShadow
        )}
        style={{
          left: `calc(7px + (100% - 14px) * ${clamp(s, 0, 100) / 100})`,
          top: `calc(7px + (100% - 14px) * ${clamp(100 - v, 0, 100) / 100})`,
          backgroundColor: color,
        }}
      />
    </button>
  )
}

function VerticalSlider({
  ariaLabel,
  ariaValueMax,
  ariaValueNow,
  ariaValueText,
  fraction,
  onFraction,
  onStep,
  track,
}: {
  ariaLabel: string
  ariaValueMax: number
  ariaValueNow: number
  ariaValueText?: string
  fraction: number
  onFraction: (fraction: number) => void
  onStep: (direction: 1 | -1, big: boolean) => void
  track: React.ReactNode
}) {
  const update = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const inset = 2.5
    onFraction(
      clamp(
        (event.clientY - rect.top - inset) / (rect.height - inset * 2),
        0,
        1
      )
    )
  }

  return (
    <button
      type="button"
      role="slider"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={ariaValueMax}
      aria-valuenow={ariaValueNow}
      aria-valuetext={ariaValueText}
      className={cn(
        "relative w-3 shrink-0 touch-none self-stretch rounded-full",
        cossInputKeyboardFocusRing
      )}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        event.currentTarget.focus()
        update(event)
      }}
      onPointerMove={(event) => {
        if ((event.buttons & 1) === 0) return
        update(event)
      }}
      onKeyDown={(event) => {
        let direction: 1 | -1 | null = null
        if (event.key === "ArrowUp" || event.key === "ArrowRight") direction = 1
        if (event.key === "ArrowDown" || event.key === "ArrowLeft")
          direction = -1
        if (direction) {
          event.preventDefault()
          onStep(direction, event.shiftKey)
        }
      }}
    >
      <span className="absolute inset-0 overflow-hidden rounded-full ring-1 ring-black/8 ring-inset dark:ring-white/12">
        {track}
      </span>
      <span
        className="pointer-events-none absolute left-1/2 h-[5px] w-[calc(100%+3px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/20%),0_1px_2px_rgb(0_0_0/24%)]"
        style={{ top: `calc(2.5px + (100% - 5px) * ${clamp(fraction, 0, 1)})` }}
      />
    </button>
  )
}

function CopyColorButton({
  text,
  label = "Copy color",
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Clipboard access can be unavailable outside secure browser contexts.
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={label}
            className="size-8! shrink-0"
            onClick={handleCopy}
          />
        }
      >
        {copied ? (
          <IconPlaceholder
            lucide="Check"
            tabler="IconCheck"
            hugeicons="Tick02Icon"
            phosphor="CheckIcon"
            remixicon="RiCheckLine"
            className="size-4"
          />
        ) : (
          <IconPlaceholder
            lucide="Copy"
            tabler="IconCopy"
            hugeicons="Copy01Icon"
            phosphor="CopyIcon"
            remixicon="RiFileCopyLine"
            className="size-4"
          />
        )}
      </TooltipTrigger>
      <TooltipContent side="top">{copied ? "Copied" : "Copy"}</TooltipContent>
    </Tooltip>
  )
}

function AlphaScrubField({
  alphaPercent,
  disabled,
  onCommit,
  scrubbable = true,
  className,
  inputClassName,
  suffixClassName,
}: {
  alphaPercent: number
  disabled?: boolean
  onCommit: (percent: number) => void
  scrubbable?: boolean
  className?: string
  inputClassName?: string
  suffixClassName?: string
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const scrubRef = React.useRef<{
    startX: number
    startPercent: number
    scrubbed: boolean
  } | null>(null)
  const rounded = Math.round(alphaPercent)

  const scrubHandlers: React.HTMLAttributes<HTMLDivElement> = scrubbable
    ? {
        onPointerDown: (event) => {
          if (disabled) return
          if (document.activeElement === inputRef.current) return
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          scrubRef.current = {
            startX: event.clientX,
            startPercent: alphaPercent,
            scrubbed: false,
          }
        },
        onPointerMove: (event) => {
          const scrub = scrubRef.current
          if (!scrub || (event.buttons & 1) === 0) return
          const dx = event.clientX - scrub.startX
          if (!scrub.scrubbed && Math.abs(dx) < 3) return
          scrub.scrubbed = true
          onCommit(clamp(scrub.startPercent + dx / 2, 0, 100))
        },
        onPointerUp: () => {
          const scrub = scrubRef.current
          scrubRef.current = null
          if (scrub && !scrub.scrubbed) inputRef.current?.focus()
        },
        onPointerCancel: () => {
          scrubRef.current = null
        },
      }
    : {}

  return (
    <div
      className={cn(
        "flex h-full shrink-0 items-center gap-0.5",
        scrubbable && "cursor-ew-resize touch-none select-none",
        className
      )}
      {...scrubHandlers}
    >
      <DraftInput
        aria-label="Opacity"
        className={cn(
          "border-0 bg-transparent p-0 text-right tabular-nums outline-none focus:border-0 focus:ring-0",
          inputClassName ?? "w-8 text-base"
        )}
        disabled={disabled}
        inputMode="decimal"
        inputRef={inputRef}
        value={String(rounded)}
        onCommitText={(text) => {
          const numeric = parseChannelText(text)
          if (numeric !== null) onCommit(clamp(numeric, 0, 100))
        }}
        onStep={(direction, big) =>
          onCommit(clamp(alphaPercent + direction * (big ? 10 : 1), 0, 100))
        }
      />
      <span
        className={cn("text-muted-foreground", suffixClassName ?? "text-base")}
      >
        %
      </span>
    </div>
  )
}

export type ColorPickerProps = {
  value?: string
  color?: string
  onChange?: (value: string) => void
  label?: string
  disabled?: boolean
  showAlpha?: boolean
  defaultFormat?: ColorFormat
  variant?: "input" | "swatch" | "panel"
  className?: string
  icon?: React.ComponentType<RegistryIconProps>
  rainbowTrigger?: boolean
  onTriggerMouseDown?: React.MouseEventHandler<HTMLButtonElement>
  onTriggerPointerDown?: React.PointerEventHandler<HTMLButtonElement>
}

export function ColorPicker({
  value: valueProp,
  color,
  onChange,
  label = "Choose color",
  disabled = false,
  showAlpha = false,
  defaultFormat = "hex",
  variant,
  className,
  icon: IconComponent,
  rainbowTrigger = false,
  onTriggerMouseDown,
  onTriggerPointerDown,
}: ColorPickerProps) {
  const value = valueProp ?? color ?? "#111827"
  const resolvedVariant = variant ?? (color !== undefined ? "swatch" : "input")
  const [open, setOpen] = React.useState(false)

  // Keep drag coordinates independent from exact typed RGB values.
  const [picker, setPicker] = React.useState<{
    plane: HsvColor
    rgb: RgbColor
    a: number
  }>(() => {
    const parsed = parseColorInput(value, "hex")
    if (!parsed)
      return { plane: { h: 0, s: 0, v: 0 }, rgb: { r: 0, g: 0, b: 0 }, a: 1 }
    return {
      plane: rgbToOklchPlane(parsed.rgb),
      rgb: parsed.rgb,
      a: showAlpha ? (parsed.alpha ?? 1) : 1,
    }
  })
  const [format, setFormat] = React.useState<ColorFormat>(defaultFormat)
  const lastCommitAtRef = React.useRef(0)
  const triggerGroupRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!value) return
    // User input wins over delayed controlled-value echoes.
    if (Date.now() - lastCommitAtRef.current < 400) return
    const parsed = parseColorInput(value, "hex")
    if (!parsed) return
    setPicker((prev) => {
      // Preserve opacity when the parent stores only RGB.
      const alpha = showAlpha ? (parsed.alpha ?? prev.a) : 1
      // Preserve unrounded channel precision.
      if (rgbaToHex(prev.rgb, prev.a) === rgbaToHex(parsed.rgb, alpha))
        return prev
      const derived = rgbToOklchPlane(parsed.rgb, prev.plane.h)
      return {
        plane: withHueContinuity(derived, prev.plane.h, derived.s / 100),
        rgb: parsed.rgb,
        a: alpha,
      }
    })
  }, [value, showAlpha])

  const applyState = (next: { plane: HsvColor; rgb: RgbColor; a: number }) => {
    setPicker(next)
    lastCommitAtRef.current = Date.now()
    const hex = rgbaToHex(next.rgb, next.a)
    onChange?.(hex)
  }

  const commitHsva = (next: HsvaColor) => {
    const plane: HsvColor = {
      h: clamp(next.h, 0, 360),
      s: clamp(next.s, 0, 100),
      v: clamp(next.v, 0, 100),
    }
    applyState({
      plane,
      rgb: oklchPlaneToRgb(plane),
      a: showAlpha ? clamp(next.a, 0, 1) : 1,
    })
  }

  const hsva: HsvaColor = { ...picker.plane, a: picker.a }
  const rgb = picker.rgb
  // Preserve hue for achromatic colors.
  const srgbHueRef = React.useRef(0)
  const displayHsv = rgbToHsv(rgb, srgbHueRef.current)
  srgbHueRef.current = displayHsv.h
  const hsl = hsvToHsl(displayHsv)
  const rawOklch = rgbToOklch(rgb, hsva.h)
  const oklch = withHueContinuity(rawOklch, hsva.h, rawOklch.c / 0.33)
  const parts: ColorParts = { rgb, hsl, oklch, alpha: hsva.a }
  const opaqueColor = `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)})`
  const currentColor = `rgb(${Math.round(rgb.r)} ${Math.round(rgb.g)} ${Math.round(rgb.b)} / ${hsva.a})`

  const commitRgb = (
    nextRgb: RgbColor,
    alpha?: number | null,
    intendedHue?: number
  ) => {
    const exact: RgbColor = {
      r: clamp(nextRgb.r, 0, 255),
      g: clamp(nextRgb.g, 0, 255),
      b: clamp(nextRgb.b, 0, 255),
    }
    const targetHue = intendedHue ?? picker.plane.h
    const derived = rgbToOklchPlane(exact, targetHue)
    applyState({
      plane: withHueContinuity(derived, targetHue, derived.s / 100),
      rgb: exact,
      a: showAlpha ? clamp(alpha ?? picker.a, 0, 1) : 1,
    })
  }
  const commitHsl = (nextHsl: HslColor) => commitRgb(hslToRgb(nextHsl))
  const commitOklch = (nextOklch: OklchColor) =>
    commitRgb(oklchToRgb(nextOklch), undefined, normalizeHue(nextOklch.h))
  const commitText = (text: string) => {
    const parsed = parseColorInput(text, format)
    if (!parsed) return
    if (parsed.format && parsed.format !== format) setFormat(parsed.format)
    commitRgb(parsed.rgb, parsed.alpha)
  }

  const cssColor = formatCssColor(format, parts, { includeAlpha: showAlpha })
  const portalContainer =
    typeof document === "undefined" ? undefined : document.body
  const supportsEyeDropper =
    typeof window !== "undefined" && window.EyeDropper !== undefined

  const handleEyeDropper = () => {
    const eyeDropperCtor = window.EyeDropper
    if (!eyeDropperCtor) return
    new eyeDropperCtor()
      .open()
      .then((result) => {
        const parsed = parseColorInput(result.sRGBHex, "hex")
        if (parsed) commitRgb(parsed.rgb)
      })
      .catch(() => {})
  }

  const oklchChannels: ChannelSpec[] = [
    {
      key: "l",
      label: "L",
      ariaLabel: "OKLCH lightness",
      value: (oklch.l * 100).toFixed(1),
      numericValue: oklch.l * 100,
      step: 1,
      bigStep: 10,
      commit: (next) => commitOklch({ ...oklch, l: clamp(next, 0, 100) / 100 }),
    },
    {
      key: "c",
      label: "C",
      ariaLabel: "OKLCH chroma",
      value: oklch.c.toFixed(3),
      numericValue: oklch.c,
      step: 0.01,
      bigStep: 0.05,
      commit: (next) => commitOklch({ ...oklch, c: Math.max(0, next) }),
    },
    {
      key: "h",
      label: "H",
      ariaLabel: "OKLCH hue",
      value: oklch.h.toFixed(1),
      numericValue: oklch.h,
      step: 1,
      bigStep: 10,
      commit: (next) => commitOklch({ ...oklch, h: normalizeHue(next) }),
    },
  ]

  const hslChannels: ChannelSpec[] = [
    {
      key: "h",
      label: "H",
      ariaLabel: "HSL hue",
      value: hsl.h.toFixed(1),
      numericValue: hsl.h,
      step: 1,
      bigStep: 10,
      commit: (next) => commitHsl({ ...hsl, h: normalizeHue(next) }),
    },
    {
      key: "s",
      label: "S",
      ariaLabel: "HSL saturation",
      value: hsl.s.toFixed(1),
      numericValue: hsl.s,
      step: 1,
      bigStep: 10,
      commit: (next) => commitHsl({ ...hsl, s: clamp(next, 0, 100) }),
    },
    {
      key: "l",
      label: "L",
      ariaLabel: "HSL lightness",
      value: hsl.l.toFixed(1),
      numericValue: hsl.l,
      step: 1,
      bigStep: 10,
      commit: (next) => commitHsl({ ...hsl, l: clamp(next, 0, 100) }),
    },
  ]

  const rgbChannels: ChannelSpec[] = (["r", "g", "b"] as const).map(
    (channel) => ({
      key: channel,
      label: channel.toUpperCase(),
      ariaLabel: { r: "Red", g: "Green", b: "Blue" }[channel],
      value: String(Math.round(rgb[channel])),
      numericValue: rgb[channel],
      step: 1,
      bigStep: 10,
      commit: (next) => commitRgb({ ...rgb, [channel]: clamp(next, 0, 255) }),
    })
  )

  const panel = (
    <div
      className={cn(
        "flex items-stretch gap-3",
        resolvedVariant === "panel" && className
      )}
    >
      <SaturationValueArea
        hue={hsva.h}
        s={hsva.s}
        v={hsva.v}
        color={opaqueColor}
        onMove={(s, v) => commitHsva({ ...hsva, s, v })}
      />

      <div className="flex shrink-0 flex-col items-center gap-1.5 self-stretch">
        <div className="flex min-h-0 flex-1 items-stretch gap-2">
          {showAlpha && (
            <VerticalSlider
              ariaLabel="Opacity"
              ariaValueMax={100}
              ariaValueNow={Math.round(hsva.a * 100)}
              ariaValueText={`${Math.round(hsva.a * 100)}%`}
              fraction={1 - hsva.a}
              onFraction={(fraction) =>
                commitHsva({ ...hsva, a: 1 - fraction })
              }
              onStep={(direction, big) =>
                commitHsva({
                  ...hsva,
                  a: clamp(hsva.a + direction * (big ? 0.1 : 0.01), 0, 1),
                })
              }
              track={
                <>
                  <Checkerboard size={6} />
                  <span
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(to bottom, ${opaqueColor}, transparent)`,
                    }}
                  />
                </>
              }
            />
          )}

          <VerticalSlider
            ariaLabel="Hue"
            ariaValueMax={360}
            ariaValueNow={Math.round(hsva.h)}
            fraction={clamp(hsva.h, 0, 360) / 360}
            onFraction={(fraction) =>
              commitHsva({ ...hsva, h: fraction * 360 })
            }
            onStep={(direction, big) =>
              commitHsva({
                ...hsva,
                h: clamp(hsva.h - direction * (big ? 10 : 1), 0, 360),
              })
            }
            track={
              <span
                className="absolute inset-0"
                style={{ background: OK_HUE_TRACK }}
              />
            }
          />
        </div>
        {supportsEyeDropper ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Pick color from screen"
                  className="size-8! shrink-0"
                  onClick={handleEyeDropper}
                />
              }
            >
              <IconPlaceholder
                lucide="Pipette"
                tabler="IconColorPicker"
                hugeicons="ColorPickerIcon"
                phosphor="EyedropperIcon"
                remixicon="RiDropperLine"
                className="size-4"
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="whitespace-nowrap">
              Pick color from screen
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <div className="flex w-64 shrink-0 flex-col gap-2">
        <ChannelGroup
          channels={oklchChannels}
          copyValue={formatCssColor("oklch", parts, {
            includeAlpha: showAlpha,
          })}
          disabled={disabled}
        />
        <ChannelGroup
          channels={hslChannels}
          copyValue={formatCssColor("hsl", parts, { includeAlpha: showAlpha })}
          disabled={disabled}
        />
        <ChannelGroup
          channels={rgbChannels}
          copyValue={formatCssColor("rgb", parts, { includeAlpha: showAlpha })}
          disabled={disabled}
        />

        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              fieldSurfaceClass,
              "flex h-8 min-w-0 flex-1 items-center"
            )}
          >
            <DraftInput
              aria-label="Color value"
              className="h-full min-w-0 flex-1 rounded-[inherit] border-0 bg-transparent px-2 py-0 text-center text-sm leading-none tabular-nums outline-none focus:border-0 focus:ring-0"
              copyValue={() => cssColor}
              value={formatColorValue(format, parts)}
              onCommitText={commitText}
            />
            {showAlpha && (
              <AlphaScrubField
                alphaPercent={hsva.a * 100}
                disabled={disabled}
                scrubbable={false}
                className="gap-0.5 pr-2 pl-0.5"
                inputClassName="w-8 text-sm"
                suffixClassName="text-sm"
                onCommit={(percent) =>
                  commitHsva({ ...hsva, a: percent / 100 })
                }
              />
            )}
          </div>
          <Select
            value={format}
            onValueChange={(next) => {
              if (
                COLOR_FORMAT_OPTIONS.some((option) => option.value === next)
              ) {
                setFormat(next as ColorFormat)
              }
            }}
          >
            <SelectPrimitive.Trigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label="Color format"
                  className="size-8! shrink-0"
                />
              }
            >
              <IconPlaceholder
                lucide="ChevronsUpDown"
                tabler="IconSelector"
                hugeicons="UnfoldMoreIcon"
                phosphor="CaretUpDownIcon"
                remixicon="RiExpandUpDownLine"
                className="size-3.5"
              />
            </SelectPrimitive.Trigger>
            <SelectContent
              alignItemWithTrigger={false}
              align="end"
              className="min-w-28"
              portalProps={{ container: portalContainer }}
            >
              {COLOR_FORMAT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )

  if (resolvedVariant === "panel") return panel

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {resolvedVariant === "swatch" ? (
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant={IconComponent || rainbowTrigger ? "ghost" : "outline"}
              size="icon-sm"
              aria-label={label}
              disabled={disabled}
              data-color-picker-trigger=""
              className={cn("relative shrink-0", className)}
              onMouseDown={onTriggerMouseDown}
              onPointerDown={onTriggerPointerDown}
            />
          }
        >
          {rainbowTrigger ? (
            <span
              aria-hidden="true"
              className="size-5 shrink-0 rounded-full bg-[conic-gradient(from_90deg,#ff3b30,#ffcc00,#34c759,#00c7be,#007aff,#af52de,#ff2d55,#ff3b30)] shadow-[0_0_0_1px_rgb(0_0_0/10%)]"
            />
          ) : IconComponent ? (
            <>
              <IconComponent className="size-4" />
              <span
                aria-hidden="true"
                className="absolute right-1 bottom-1 h-1 w-4 rounded-full border border-background"
                style={{ backgroundColor: currentColor }}
              />
            </>
          ) : (
            <span className="relative size-4 shrink-0 overflow-hidden rounded-[4px]">
              <Checkerboard size={4} />
              <span
                aria-hidden="true"
                className="absolute inset-0"
                style={{ backgroundColor: currentColor }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-[inherit] ring-1 ring-black/12 ring-inset dark:ring-white/16"
              />
            </span>
          )}
        </PopoverTrigger>
      ) : (
        <div
          ref={triggerGroupRef}
          data-color-picker-trigger=""
          data-slot="color-picker"
          className={cn(triggerGroupClass, className)}
        >
          <PopoverTrigger
            render={
              <button
                type="button"
                aria-label={label}
                disabled={disabled}
                className={cn(
                  "relative ml-2 size-6 shrink-0 overflow-hidden rounded-[calc(var(--radius-md)-2px)]",
                  cossInputKeyboardFocusRing
                )}
              />
            }
          >
            <Checkerboard size={6} />
            <span
              aria-hidden="true"
              className="absolute inset-0"
              style={{ backgroundColor: currentColor }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-[inherit] ring-1 ring-black/12 ring-inset dark:ring-white/16"
            />
          </PopoverTrigger>
          <DraftInput
            aria-label={`${label} value`}
            className="h-full w-full min-w-0 grow border-0 bg-transparent px-[calc(--spacing(2.5)-1px)] text-base tabular-nums outline-none [transition:background-color_5000000s_ease-in-out_0s] placeholder:text-muted-foreground/72 focus:border-0 focus:ring-0"
            copyValue={() => cssColor}
            disabled={disabled}
            value={formatColorValue(format, parts)}
            onCommitText={commitText}
          />
          {showAlpha && (
            <AlphaScrubField
              alphaPercent={hsva.a * 100}
              disabled={disabled}
              className="pr-[calc(--spacing(3)-1px)] pl-1"
              onCommit={(percent) => commitHsva({ ...hsva, a: percent / 100 })}
            />
          )}
        </div>
      )}
      <PopoverContent
        anchor={resolvedVariant === "swatch" ? undefined : triggerGroupRef}
        align={resolvedVariant === "swatch" ? "end" : "start"}
        sideOffset={8}
        portalProps={{ container: portalContainer }}
        className="w-auto p-0 [&>[data-slot=popover-viewport]]:p-3.5!"
      >
        {panel}
      </PopoverContent>
    </Popover>
  )
}

export function ColorPickerPanel({
  className,
  color,
  label,
  onChange,
  showAlpha = false,
}: {
  className?: string
  color: string
  label: string
  onChange: (color: string) => void
  showAlpha?: boolean
}) {
  return (
    <ColorPicker
      className={className}
      value={color}
      label={label}
      onChange={onChange}
      showAlpha={showAlpha}
      variant="panel"
    />
  )
}
