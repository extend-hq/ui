"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { IconPlaceholder } from "@/components/icon-placeholder"

const COLOR_PICKER_PRESETS = [
  "#111827",
  "#52525b",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
  "#2563eb",
  "#4f46e5",
  "#9333ea",
  "#db2777",
  "#ffffff",
] as const
const COLOR_PICKER_FORMATS = ["hex", "rgb", "css", "hsl"] as const

type ColorPickerFormat = (typeof COLOR_PICKER_FORMATS)[number]
type HslColor = [number, number, number]
type HsvColor = [number, number, number]

function normalizeHexColor(value?: string, fallback = "#111827") {
  if (!value) return fallback

  const trimmed = value.trim()
  const threeDigit = /^#([0-9a-f]{3})$/i.exec(trimmed)
  if (threeDigit?.[1]) {
    const [red, green, blue] = threeDigit[1].split("")
    return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase()
  }

  const sixDigit = /^#([0-9a-f]{6})$/i.exec(trimmed)
  if (sixDigit?.[1]) {
    return `#${sixDigit[1].toLowerCase()}`
  }

  return fallback
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function normalizeHue(value: number) {
  return ((value % 360) + 360) % 360
}

function clampPercent(value: number) {
  return clampNumber(value, 0, 100)
}

function clampByte(value: number) {
  return clampNumber(Math.round(value), 0, 255)
}

function parseHexToRgb(value: string): [number, number, number] | undefined {
  const hex = normalizeHexColor(value, "")
  const match = /^#([0-9a-f]{6})$/i.exec(hex)
  if (!match?.[1]) return undefined

  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16),
  ]
}

function rgbToHsl(red: number, green: number, blue: number): HslColor {
  const r = clampByte(red) / 255
  const g = clampByte(green) / 255
  const b = clampByte(blue) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const delta = max - min
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === r) {
      h = (g - b) / delta + (g < b ? 6 : 0)
    } else if (max === g) {
      h = (b - r) / delta + 2
    } else {
      h = (r - g) / delta + 4
    }
    h /= 6
  }

  return [
    normalizeHue(h * 360),
    clampNumber(s * 100, 0, 100),
    clampNumber(l * 100, 0, 100),
  ]
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const h = normalizeHue(hue) / 360
  const s = clampPercent(saturation) / 100
  const l = clampPercent(lightness) / 100

  if (s === 0) {
    const channel = clampByte(l * 255)
    return [channel, channel, channel] as const
  }

  const hueToRgb = (p: number, q: number, value: number) => {
    let t = value
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  return [
    clampByte(hueToRgb(p, q, h + 1 / 3) * 255),
    clampByte(hueToRgb(p, q, h) * 255),
    clampByte(hueToRgb(p, q, h - 1 / 3) * 255),
  ] as const
}

function hslToHex([h, s, l]: HslColor) {
  return `#${hslToRgb(h, s, l)
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`
}

function hslToHsv([hue, saturation, lightness]: HslColor): HsvColor {
  const s = clampPercent(saturation) / 100
  const l = clampPercent(lightness) / 100
  const value = l + s * Math.min(l, 1 - l)
  const hsvSaturation = value === 0 ? 0 : 2 * (1 - l / value)

  return [
    normalizeHue(hue),
    clampPercent(hsvSaturation * 100),
    clampPercent(value * 100),
  ]
}

function hsvToHsl([hue, saturation, value]: HsvColor): HslColor {
  const s = clampPercent(saturation) / 100
  const v = clampPercent(value) / 100
  const lightness = v * (1 - s / 2)
  const hslSaturation =
    lightness === 0 || lightness === 1
      ? 0
      : (v - lightness) / Math.min(lightness, 1 - lightness)

  return [
    normalizeHue(hue),
    clampPercent(hslSaturation * 100),
    clampPercent(lightness * 100),
  ]
}

function normalizeHslColor([hue, saturation, lightness]: HslColor): HslColor {
  return [normalizeHue(hue), clampPercent(saturation), clampPercent(lightness)]
}

function normalizeHsvColor([hue, saturation, value]: HsvColor): HsvColor {
  return [normalizeHue(hue), clampPercent(saturation), clampPercent(value)]
}

function parseColor(value: string): HslColor | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined

  const rgbFromHex = parseHexToRgb(trimmed)
  if (rgbFromHex) return rgbToHsl(...rgbFromHex)

  const rgbMatch = /^rgba?\(([^)]+)\)$/i.exec(trimmed)
  if (rgbMatch?.[1]) {
    const values = rgbMatch[1].match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
    if (values.length >= 3) return rgbToHsl(values[0], values[1], values[2])
  }

  const hslMatch = /^hsla?\(([^)]+)\)$/i.exec(trimmed)
  if (hslMatch?.[1]) {
    const values = hslMatch[1].match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? []
    if (values.length >= 3) {
      return [
        normalizeHue(values[0]),
        clampPercent(values[1]),
        clampPercent(values[2]),
      ]
    }
  }

  return undefined
}

function formatColor(color: HslColor, format: ColorPickerFormat) {
  const [h, s, l] = color
  const [red, green, blue] = hslToRgb(h, s, l)

  if (format === "rgb") return `rgb(${red}, ${green}, ${blue})`
  if (format === "css") return `rgba(${red}, ${green}, ${blue}, 1)`
  if (format === "hsl") {
    return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`
  }

  return hslToHex(color)
}

function ColorPickerTooltip({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  )
}

export function ColorPicker({
  color,
  disabled,
  icon: IconComponent,
  label,
  onTriggerMouseDown,
  onTriggerPointerDown,
  onChange,
}: {
  color: string
  disabled?: boolean
  icon: React.ComponentType<React.ComponentProps<"svg">>
  label: string
  onTriggerMouseDown?: React.MouseEventHandler<HTMLButtonElement>
  onTriggerPointerDown?: React.PointerEventHandler<HTMLButtonElement>
  onChange: (color: string) => void
}) {
  const [open, setOpen] = React.useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <ColorPickerTooltip label={label}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={label}
            className="relative"
            onMouseDown={onTriggerMouseDown}
            onPointerDown={onTriggerPointerDown}
          >
            <IconComponent className="size-4" />
            <span
              className="absolute right-1 bottom-1 h-1 w-4 rounded-full border border-background"
              style={{ backgroundColor: color }}
            />
          </Button>
        </PopoverTrigger>
      </ColorPickerTooltip>
      <PopoverContent align="start" className="z-40 w-72 p-1">
        <ColorPickerPanel color={color} label={label} onChange={onChange} />
      </PopoverContent>
    </Popover>
  )
}

export function ColorPickerPanel({
  className,
  color,
  label,
  onChange,
}: {
  className?: string
  color: string
  label: string
  onChange: (color: string) => void
}) {
  const parsedColor = React.useMemo(
    () => parseColor(color) ?? parseColor("#111827")!,
    [color]
  )
  const parsedFieldColor = React.useMemo(
    () => hslToHsv(parsedColor),
    [parsedColor]
  )
  const [format, setFormat] = React.useState<ColorPickerFormat>("hex")
  const [hsl, setHsl] = React.useState<HslColor>(parsedColor)
  const [fieldHsv, setFieldHsv] = React.useState<HsvColor>(parsedFieldColor)
  const [inputValue, setInputValue] = React.useState(() =>
    formatColor(parsedColor, "hex")
  )

  React.useEffect(() => {
    setHsl(parsedColor)
    setFieldHsv(parsedFieldColor)
    setInputValue(formatColor(parsedColor, format))
  }, [format, parsedColor, parsedFieldColor])

  function applyColor(nextColor: HslColor, nextFieldColor?: HsvColor) {
    const normalizedColor = normalizeHslColor(nextColor)
    const normalizedFieldColor = normalizeHsvColor(
      nextFieldColor ?? hslToHsv(normalizedColor)
    )
    setHsl(normalizedColor)
    setFieldHsv(normalizedFieldColor)
    setInputValue(formatColor(normalizedColor, format))
    onChange(hslToHex(normalizedColor))
  }

  function updateColorField(
    event: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>
  ) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = clampNumber(event.clientX - rect.left, 0, rect.width)
    const y = clampNumber(event.clientY - rect.top, 0, rect.height)
    const nextFieldColor: HsvColor = [
      fieldHsv[0],
      Math.round((x / rect.width) * 100),
      Math.round(100 - (y / rect.height) * 100),
    ]

    applyColor(hsvToHsl(nextFieldColor), nextFieldColor)
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value
    setInputValue(nextValue)

    const parsed = parseColor(nextValue)
    if (parsed) {
      setHsl(parsed)
      setFieldHsv(hslToHsv(parsed))
      onChange(hslToHex(parsed))
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex justify-end">
        <Select
          value={format}
          onValueChange={(value) => {
            const nextFormat = value as ColorPickerFormat
            setFormat(nextFormat)
            setInputValue(formatColor(hsl, nextFormat))
          }}
        >
          <SelectTrigger
            size="sm"
            className="h-7 w-24 text-xs"
            aria-label="Color format"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" alignItemWithTrigger={false}>
            {COLOR_PICKER_FORMATS.map((option) => (
              <SelectItem key={option} value={option}>
                {option.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div
        className="relative h-32 cursor-crosshair overflow-hidden rounded-lg"
        style={{
          background: `
                linear-gradient(to top, rgb(0 0 0), transparent),
                linear-gradient(to right, rgb(255 255 255), rgb(255 255 255 / 0)),
                hsl(${hsl[0]} 100% 50%)
              `,
        }}
        onPointerDown={(event) => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          updateColorField(event)
        }}
        onPointerMove={(event) => {
          if (event.buttons !== 1) return
          updateColorField(event)
        }}
      >
        <span
          className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_1px_4px_rgb(0_0_0/0.45)] ring-1 ring-black/20"
          style={{
            left: `${fieldHsv[1]}%`,
            top: `${100 - fieldHsv[2]}%`,
            backgroundColor: hslToHex(hsl),
          }}
        />
      </div>

      <input
        type="range"
        min={0}
        max={359}
        value={hsl[0]}
        aria-label="Hue"
        className="h-3 w-full cursor-pointer appearance-none rounded-full border border-border bg-transparent accent-foreground"
        style={{
          background:
            "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))",
        }}
        onChange={(event) =>
          applyColor(
            hsvToHsl([Number(event.target.value), fieldHsv[1], fieldHsv[2]]),
            [Number(event.target.value), fieldHsv[1], fieldHsv[2]]
          )
        }
      />

      <Input
        value={inputValue}
        aria-label={`${label} value`}
        className="h-8 w-full font-mono text-xs"
        spellCheck={false}
        onChange={handleInputChange}
        onBlur={() => setInputValue(formatColor(hsl, format))}
      />

      <div className="grid grid-cols-6 gap-1.5">
        {COLOR_PICKER_PRESETS.map((preset) => {
          const selected = hslToHex(hsl) === preset

          return (
            <button
              key={preset}
              type="button"
              className={cn(
                "grid size-6 place-items-center rounded-full border shadow-xs transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected && "ring-2 ring-ring ring-offset-2"
              )}
              style={{ backgroundColor: preset }}
              aria-label={`Use ${preset}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                const parsedPreset = parseColor(preset)
                if (parsedPreset) applyColor(parsedPreset)
              }}
            >
              {selected ? (
                <IconPlaceholder
                  lucide="Check"
                  tabler="IconCheck"
                  hugeicons="CheckIcon"
                  phosphor="CheckIcon"
                  remixicon="RiCheckLine"
                  className={cn(
                    "size-3.5",
                    preset === "#ffffff" ? "text-foreground" : "text-white"
                  )}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
