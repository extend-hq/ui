export type ColorFormat = "oklch" | "hsl" | "rgb" | "hex"

/** 0-255 floats. */
export interface RgbColor {
  r: number
  g: number
  b: number
}

/** h in 0-360, s/l in 0-100. */
export interface HslColor {
  h: number
  s: number
  l: number
}

/** h in 0-360, s/v in 0-100. */
export interface HsvColor {
  h: number
  s: number
  v: number
}

/** L: 0-1; C: >= 0; H: 0-360. */
export interface OklchColor {
  l: number
  c: number
  h: number
}

export interface ParsedColor {
  rgb: RgbColor
  alpha: number | null
  format: ColorFormat | null
}

export interface ColorParts {
  rgb: RgbColor
  hsl: HslColor
  oklch: OklchColor
  alpha: number
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function normalizeHue(value: number): number {
  return ((value % 360) + 360) % 360
}

export function hsvToRgb({ h, s, v }: HsvColor): RgbColor {
  const hue = normalizeHue(h) / 60
  const sat = clamp(s, 0, 100) / 100
  const val = clamp(v, 0, 100) / 100
  const sector = Math.floor(hue) % 6
  const f = hue - Math.floor(hue)
  const p = val * (1 - sat)
  const q = val * (1 - f * sat)
  const t = val * (1 - (1 - f) * sat)
  const pick: [number, number, number] =
    sector === 0
      ? [val, t, p]
      : sector === 1
        ? [q, val, p]
        : sector === 2
          ? [p, val, t]
          : sector === 3
            ? [p, q, val]
            : sector === 4
              ? [t, p, val]
              : [val, p, q]

  return { r: pick[0] * 255, g: pick[1] * 255, b: pick[2] * 255 }
}

export function rgbToHsv(rgb: RgbColor, fallbackHue = 0): HsvColor {
  const r = clamp(rgb.r, 0, 255) / 255
  const g = clamp(rgb.g, 0, 255) / 255
  const b = clamp(rgb.b, 0, 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const v = max * 100
  const s = max === 0 ? 0 : (delta / max) * 100

  if (delta === 0) return { h: normalizeHue(fallbackHue), s, v }

  let h: number
  if (max === r) h = (g - b) / delta + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4

  return { h: normalizeHue(h * 60), s, v }
}

export function hsvToHsl({ h, s, v }: HsvColor): HslColor {
  const sat = clamp(s, 0, 100) / 100
  const val = clamp(v, 0, 100) / 100
  const l = val * (1 - sat / 2)
  const hslSat = l === 0 || l === 1 ? 0 : (val - l) / Math.min(l, 1 - l)

  return {
    h: normalizeHue(h),
    s: clamp(hslSat * 100, 0, 100),
    l: clamp(l * 100, 0, 100),
  }
}

export function hslToHsv({ h, s, l }: HslColor): HsvColor {
  const sat = clamp(s, 0, 100) / 100
  const light = clamp(l, 0, 100) / 100
  const v = light + sat * Math.min(light, 1 - light)
  const hsvSat = v === 0 ? 0 : 2 * (1 - light / v)

  return {
    h: normalizeHue(h),
    s: clamp(hsvSat * 100, 0, 100),
    v: clamp(v * 100, 0, 100),
  }
}

export function hslToRgb(hsl: HslColor): RgbColor {
  return hsvToRgb(hslToHsv(hsl))
}

function srgbToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function linearToSrgb(channel: number): number {
  const c =
    channel <= 0.0031308
      ? channel * 12.92
      : 1.055 * Math.pow(channel, 1 / 2.4) - 0.055
  return c * 255
}

interface OklabColor {
  l: number
  a: number
  b: number
}

function rgbToOklab(rgb: RgbColor): OklabColor {
  const r = srgbToLinear(clamp(rgb.r, 0, 255))
  const g = srgbToLinear(clamp(rgb.g, 0, 255))
  const b = srgbToLinear(clamp(rgb.b, 0, 255))

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)

  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

function oklchToOklab({ l, c, h }: OklchColor): OklabColor {
  const hueRad = (normalizeHue(h) * Math.PI) / 180
  return { l, a: c * Math.cos(hueRad), b: c * Math.sin(hueRad) }
}

export function rgbToOklch(rgb: RgbColor, fallbackHue = 0): OklchColor {
  const lab = rgbToOklab(rgb)
  const c = Math.sqrt(lab.a * lab.a + lab.b * lab.b)
  if (c < 1e-6)
    return { l: clamp(lab.l, 0, 1), c: 0, h: normalizeHue(fallbackHue) }

  return {
    l: clamp(lab.l, 0, 1),
    c,
    h: normalizeHue((Math.atan2(lab.b, lab.a) * 180) / Math.PI),
  }
}

function oklabToLinearSrgb({ l, a, b }: OklabColor): {
  r: number
  g: number
  b: number
} {
  const lp = l + 0.3963377774 * a + 0.2158037573 * b
  const mp = l - 0.1055613458 * a - 0.0638541728 * b
  const sp = l - 0.0894841775 * a - 1.291485548 * b

  const lc = lp * lp * lp
  const mc = mp * mp * mp
  const sc = sp * sp * sp

  return {
    r: 4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc,
    g: -1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc,
    b: -0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc,
  }
}

function oklabToRgbRaw(lab: OklabColor): RgbColor {
  const linear = oklabToLinearSrgb(lab)
  return {
    r: linearToSrgb(linear.r),
    g: linearToSrgb(linear.g),
    b: linearToSrgb(linear.b),
  }
}

function oklchToRgbRaw(oklch: OklchColor): RgbColor {
  return oklabToRgbRaw(oklchToOklab(oklch))
}

function isInSrgbGamut(rgb: RgbColor): boolean {
  const eps = 0.001
  return (
    rgb.r >= -eps &&
    rgb.r <= 255 + eps &&
    rgb.g >= -eps &&
    rgb.g <= 255 + eps &&
    rgb.b >= -eps &&
    rgb.b <= 255 + eps
  )
}

function clampRgb(rgb: RgbColor): RgbColor {
  return {
    r: clamp(rgb.r, 0, 255),
    g: clamp(rgb.g, 0, 255),
    b: clamp(rgb.b, 0, 255),
  }
}

function deltaEok(first: OklabColor, second: OklabColor): number {
  const dl = first.l - second.l
  const da = first.a - second.a
  const db = first.b - second.b
  return Math.sqrt(dl * dl + da * da + db * db)
}

/** CSS Color 4 local-MINDE gamut mapping. */
export function oklchToRgb(oklch: OklchColor): RgbColor {
  const target: OklchColor = {
    l: clamp(oklch.l, 0, 1),
    c: Math.max(0, oklch.c),
    h: oklch.h,
  }
  if (target.l >= 1) return { r: 255, g: 255, b: 255 }
  if (target.l <= 0) return { r: 0, g: 0, b: 0 }

  const raw = oklchToRgbRaw(target)
  if (isInSrgbGamut(raw)) return clampRgb(raw)

  const jnd = 0.02
  const epsilon = 0.0001

  let clipped = clampRgb(raw)
  if (deltaEok(rgbToOklab(clipped), oklchToOklab(target)) < jnd) return clipped

  let min = 0
  let max = target.c
  let minInGamut = true

  while (max - min > epsilon) {
    const chroma = (min + max) / 2
    const candidate: OklchColor = { ...target, c: chroma }
    const candidateRaw = oklchToRgbRaw(candidate)

    if (minInGamut && isInSrgbGamut(candidateRaw)) {
      min = chroma
      continue
    }

    clipped = clampRgb(candidateRaw)
    const distance = deltaEok(rgbToOklab(clipped), oklchToOklab(candidate))
    if (distance < jnd) {
      if (jnd - distance < epsilon) return clipped
      minInGamut = false
      min = chroma
    } else {
      max = chroma
    }
  }

  return clipped
}

// OKHSV cusp math: https://bottosson.github.io/posts/colorpicker/

function computeMaxSaturation(a: number, b: number): number {
  let k0: number, k1: number, k2: number, k3: number, k4: number
  let wl: number, wm: number, ws: number

  if (-1.88170328 * a - 0.80936493 * b > 1) {
    k0 = 1.19086277
    k1 = 1.76576728
    k2 = 0.59662641
    k3 = 0.75515197
    k4 = 0.56771245
    wl = 4.0767416621
    wm = -3.3077115913
    ws = 0.2309699292
  } else if (1.81444104 * a - 1.19445276 * b > 1) {
    k0 = 0.73956515
    k1 = -0.45954404
    k2 = 0.08285427
    k3 = 0.1254107
    k4 = 0.14503204
    wl = -1.2684380046
    wm = 2.6097574011
    ws = -0.3413193965
  } else {
    k0 = 1.35733652
    k1 = -0.00915799
    k2 = -1.1513021
    k3 = -0.50559606
    k4 = 0.00692167
    wl = -0.0041960863
    wm = -0.7034186147
    ws = 1.707614701
  }

  let s = k0 + k1 * a + k2 * b + k3 * a * a + k4 * a * b

  // Refine the gamut boundary.
  const kl = 0.3963377774 * a + 0.2158037573 * b
  const km = -0.1055613458 * a - 0.0638541728 * b
  const ks = -0.0894841775 * a - 1.291485548 * b
  const lp = 1 + s * kl
  const mp = 1 + s * km
  const sp = 1 + s * ks
  const l = lp * lp * lp
  const m = mp * mp * mp
  const s3 = sp * sp * sp
  const lds = 3 * kl * lp * lp
  const mds = 3 * km * mp * mp
  const sds = 3 * ks * sp * sp
  const lds2 = 6 * kl * kl * lp
  const mds2 = 6 * km * km * mp
  const sds2 = 6 * ks * ks * sp
  const f = wl * l + wm * m + ws * s3
  const f1 = wl * lds + wm * mds + ws * sds
  const f2 = wl * lds2 + wm * mds2 + ws * sds2
  s = s - (f * f1) / (f1 * f1 - 0.5 * f * f2)

  return s
}

function findCusp(a: number, b: number): { l: number; c: number } {
  const sCusp = computeMaxSaturation(a, b)
  const rgbAtMax = oklabToLinearSrgb({ l: 1, a: sCusp * a, b: sCusp * b })
  const lCusp = Math.cbrt(1 / Math.max(rgbAtMax.r, rgbAtMax.g, rgbAtMax.b))
  return { l: lCusp, c: lCusp * sCusp }
}

export function maxChromaForHue(hue: number): number {
  const hueRad = (normalizeHue(hue) * Math.PI) / 180
  return findCusp(Math.cos(hueRad), Math.sin(hueRad)).c
}

export function cuspColorForHue(hue: number): RgbColor {
  const hueRad = (normalizeHue(hue) * Math.PI) / 180
  const aUnit = Math.cos(hueRad)
  const bUnit = Math.sin(hueRad)
  const cusp = findCusp(aUnit, bUnit)
  return clampRgb(
    oklabToRgbRaw({ l: cusp.l, a: cusp.c * aUnit, b: cusp.c * bUnit })
  )
}

// Lift saturated dark colors above black.
const PLANE_MIN_L = 0.25

function planeLightnessFloor(chromaFraction: number): number {
  return PLANE_MIN_L * chromaFraction
}

export function oklchPlaneToRgb({ h, s, v }: HsvColor): RgbColor {
  const s01 = clamp(s, 0, 100) / 100
  const floor = planeLightnessFloor(s01)
  const lightness = floor + (clamp(v, 0, 100) / 100) * (1 - floor)
  return clampRgb(
    oklchToRgbRaw({ l: lightness, c: s01 * maxChromaForHue(h), h })
  )
}

export function rgbToOklchPlane(rgb: RgbColor, fallbackHue = 0): HsvColor {
  const oklch = rgbToOklch(rgb, fallbackHue)
  // Preserve hue below the reliable chroma threshold.
  const hue = oklch.c < 0.004 ? normalizeHue(fallbackHue) : oklch.h
  const cMax = maxChromaForHue(hue)
  const s01 = cMax > 0 ? clamp(oklch.c / cMax, 0, 1) : 0
  const floor = planeLightnessFloor(s01)
  return {
    h: hue,
    s: s01 * 100,
    v: clamp((oklch.l - floor) / (1 - floor), 0, 1) * 100,
  }
}

/** RGBA pixels for the picker plane. */
export function getOklchPlanePixels(
  width: number,
  height: number,
  hue: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  const hueRad = (normalizeHue(hue) * Math.PI) / 180
  const aUnit = Math.cos(hueRad)
  const bUnit = Math.sin(hueRad)
  const cMax = findCusp(aUnit, bUnit).c

  for (let x = 0; x < width; x += 1) {
    const s01 = width === 1 ? 0 : x / (width - 1)
    const chroma = s01 * cMax
    const aChroma = chroma * aUnit
    const bChroma = chroma * bUnit
    const floor = planeLightnessFloor(s01)
    for (let y = 0; y < height; y += 1) {
      const v01 = height === 1 ? 1 : 1 - y / (height - 1)
      const linear = oklabToLinearSrgb({
        l: floor + v01 * (1 - floor),
        a: aChroma,
        b: bChroma,
      })
      const i = (y * width + x) * 4
      data[i] = linearToSrgb(linear.r)
      data[i + 1] = linearToSrgb(linear.g)
      data[i + 2] = linearToSrgb(linear.b)
      data[i + 3] = 255
    }
  }

  return data
}

export function formatNumber(value: number, maxDecimals: number): string {
  const fixed = value.toFixed(maxDecimals)
  if (!fixed.includes(".")) return fixed
  const trimmed = fixed.replace(/0+$/, "").replace(/\.$/, "")
  return trimmed === "-0" ? "0" : trimmed
}

function toHexPair(channel: number): string {
  return clamp(Math.round(channel), 0, 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase()
}

export function rgbaToHex(rgb: RgbColor, alpha = 1): string {
  const base = `#${toHexPair(rgb.r)}${toHexPair(rgb.g)}${toHexPair(rgb.b)}`
  return alpha >= 1 ? base : `${base}${toHexPair(alpha * 255)}`
}

export function formatColorValue(
  format: ColorFormat,
  parts: ColorParts
): string {
  const { rgb, hsl, oklch } = parts
  switch (format) {
    case "hex":
      return rgbaToHex(rgb).slice(1)
    case "rgb":
      return `${Math.round(clamp(rgb.r, 0, 255))} ${Math.round(clamp(rgb.g, 0, 255))} ${Math.round(
        clamp(rgb.b, 0, 255)
      )}`
    case "hsl":
      return `${formatNumber(hsl.h, 1)}° ${formatNumber(hsl.s, 1)}% ${formatNumber(hsl.l, 1)}%`
    case "oklch":
      return `${formatNumber(oklch.l * 100, 1)}% ${formatNumber(oklch.c, 3)} ${formatNumber(oklch.h, 1)}`
  }
}

export function formatCssColor(
  format: ColorFormat,
  parts: ColorParts,
  options?: { includeAlpha?: boolean }
): string {
  const includeAlpha = (options?.includeAlpha ?? true) && parts.alpha < 1
  const alphaNumber = formatNumber(clamp(parts.alpha, 0, 1), 3)

  switch (format) {
    case "hex":
      return rgbaToHex(parts.rgb, includeAlpha ? parts.alpha : 1)
    case "rgb": {
      const channels = `${Math.round(clamp(parts.rgb.r, 0, 255))}, ${Math.round(
        clamp(parts.rgb.g, 0, 255)
      )}, ${Math.round(clamp(parts.rgb.b, 0, 255))}`
      return includeAlpha
        ? `rgba(${channels}, ${alphaNumber})`
        : `rgb(${channels})`
    }
    case "hsl": {
      const channels = `${formatNumber(parts.hsl.h, 2)}, ${formatNumber(parts.hsl.s, 2)}%, ${formatNumber(
        parts.hsl.l,
        2
      )}%`
      return includeAlpha
        ? `hsla(${channels}, ${alphaNumber})`
        : `hsl(${channels})`
    }
    case "oklch": {
      const channels = `${formatNumber(parts.oklch.l * 100, 2)}% ${formatNumber(parts.oklch.c, 4)} ${formatNumber(
        parts.oklch.h,
        2
      )}`
      return includeAlpha
        ? `oklch(${channels} / ${alphaNumber})`
        : `oklch(${channels})`
    }
  }
}

interface NumericToken {
  value: number
  percent: boolean
}

function parseNumericToken(token: string): NumericToken | null {
  const match = /^([+-]?\d*\.?\d+)(%|deg|°)?$/i.exec(token.trim())
  if (!match) return null
  const value = Number.parseFloat(match[1] ?? "")
  if (!Number.isFinite(value)) return null
  return { value, percent: match[2] === "%" }
}

function parseAlphaToken(token: string): number | null {
  const parsed = parseNumericToken(token)
  if (!parsed) return null
  const value =
    parsed.percent || parsed.value > 1 ? parsed.value / 100 : parsed.value
  return clamp(value, 0, 1)
}

function rgbFromTokens(
  tokens: NumericToken[],
  allowUnitScale: boolean
): RgbColor | null {
  if (tokens.length !== 3) return null
  const scaleUnit =
    allowUnitScale &&
    tokens.every(
      (token) => !token.percent && token.value >= 0 && token.value <= 1
    )
  const channels = tokens.map((token) => {
    if (token.percent) return (token.value / 100) * 255
    return scaleUnit ? token.value * 255 : token.value
  })

  return clampRgb({
    r: channels[0] ?? 0,
    g: channels[1] ?? 0,
    b: channels[2] ?? 0,
  })
}

function hslFromTokens(tokens: NumericToken[]): RgbColor | null {
  if (tokens.length !== 3) return null
  return hslToRgb({
    h: normalizeHue(tokens[0]?.value ?? 0),
    s: clamp(tokens[1]?.value ?? 0, 0, 100),
    l: clamp(tokens[2]?.value ?? 0, 0, 100),
  })
}

function oklchFromTokens(tokens: NumericToken[]): RgbColor | null {
  if (tokens.length !== 3) return null
  const [lToken, cToken, hToken] = tokens
  if (!lToken || !cToken || !hToken) return null
  const l =
    lToken.percent || lToken.value > 1 ? lToken.value / 100 : lToken.value
  const c = cToken.percent ? (cToken.value / 100) * 0.4 : cToken.value

  return oklchToRgb({
    l: clamp(l, 0, 1),
    c: Math.max(0, c),
    h: normalizeHue(hToken.value),
  })
}

function splitAlpha(
  body: string
): { main: string; alpha: number | null } | null {
  const slashParts = body.split("/")
  if (slashParts.length > 2) return null
  if (slashParts.length === 2) {
    const alpha = parseAlphaToken(slashParts[1] ?? "")
    if (alpha === null) return null
    return { main: slashParts[0] ?? "", alpha }
  }
  return { main: body, alpha: null }
}

function tokenize(main: string): NumericToken[] | null {
  const rawTokens = main
    .split(/[\s,]+/)
    .map((token) => token.trim())
    .filter(Boolean)
  const tokens: NumericToken[] = []
  for (const raw of rawTokens) {
    const parsed = parseNumericToken(raw)
    if (!parsed) return null
    tokens.push(parsed)
  }
  return tokens
}

function parseHexBody(raw: string): ParsedColor | null {
  const body = raw.startsWith("#") ? raw.slice(1) : raw
  if (!/^[0-9a-f]+$/i.test(body)) return null

  let expanded: string
  if (body.length === 3 || body.length === 4) {
    expanded = body
      .split("")
      .map((char) => char + char)
      .join("")
  } else if (body.length === 6 || body.length === 8) {
    expanded = body
  } else {
    return null
  }

  const channels: number[] = []
  for (let i = 0; i < expanded.length; i += 2) {
    channels.push(Number.parseInt(expanded.slice(i, i + 2), 16))
  }

  return {
    rgb: { r: channels[0] ?? 0, g: channels[1] ?? 0, b: channels[2] ?? 0 },
    alpha: channels.length === 4 ? (channels[3] ?? 255) / 255 : null,
    format: "hex",
  }
}

function parseFunctional(name: string, body: string): ParsedColor | null {
  const withAlpha = splitAlpha(body)
  if (!withAlpha) return null
  const tokens = tokenize(withAlpha.main)
  if (!tokens) return null

  let alpha = withAlpha.alpha
  let componentTokens = tokens
  if (tokens.length === 4 && alpha === null) {
    componentTokens = tokens.slice(0, 3)
    const last = tokens[3]
    if (!last) return null
    alpha = clamp(last.percent ? last.value / 100 : last.value, 0, 1)
  }

  let rgb: RgbColor | null = null
  let format: ColorFormat | null = null
  if (name === "rgb" || name === "rgba") {
    rgb = rgbFromTokens(componentTokens, false)
    format = "rgb"
  } else if (name === "hsl" || name === "hsla") {
    rgb = hslFromTokens(componentTokens)
    format = "hsl"
  } else if (name === "oklch") {
    rgb = oklchFromTokens(componentTokens)
    format = "oklch"
  }

  return rgb ? { rgb, alpha, format } : null
}

let cssParserContext: CanvasRenderingContext2D | null | undefined

function parseWithBrowser(raw: string): ParsedColor | null {
  if (typeof document === "undefined") return null
  if (cssParserContext === undefined) {
    try {
      cssParserContext = document.createElement("canvas").getContext("2d")
    } catch {
      cssParserContext = null
    }
  }
  if (!cssParserContext) return null

  const sentinels = ["#010203", "#030201"]
  let normalized: string | null = null
  for (const sentinel of sentinels) {
    cssParserContext.fillStyle = sentinel
    cssParserContext.fillStyle = raw
    const result = cssParserContext.fillStyle
    if (typeof result !== "string" || result === sentinel) return null
    normalized = result
  }
  if (!normalized) return null

  // Browser fallback should not change the selected format.
  if (normalized.startsWith("#")) {
    const hex = parseHexBody(normalized)
    return hex ? { ...hex, format: null } : null
  }
  const functional = /^(rgba?)\(\s*(.+?)\s*\)$/i.exec(normalized)
  if (functional) {
    const parsed = parseFunctional(
      (functional[1] ?? "").toLowerCase(),
      functional[2] ?? ""
    )
    return parsed ? { ...parsed, format: null } : null
  }
  return null
}

/** Parses supported color syntax, then falls back to the browser parser. */
export function parseColorInput(
  input: string,
  assumeFormat: ColorFormat = "hex"
): ParsedColor | null {
  const raw = input.trim()
  if (!raw) return null

  const functional = /^([a-z]+)\(\s*(.+?)\s*\)$/i.exec(raw)
  if (functional) {
    const name = (functional[1] ?? "").toLowerCase()
    if (["rgb", "rgba", "hsl", "hsla", "oklch"].includes(name)) {
      return parseFunctional(name, functional[2] ?? "")
    }
    return parseWithBrowser(raw)
  }

  const withAlpha = splitAlpha(raw)
  if (withAlpha) {
    const main = withAlpha.main.trim()

    if (/^#?[0-9a-f]{3,8}$/i.test(main)) {
      const hex = parseHexBody(main)
      if (hex)
        return {
          rgb: hex.rgb,
          alpha: withAlpha.alpha ?? hex.alpha,
          format: "hex",
        }
    }

    const tokens = tokenize(main)
    if (tokens && tokens.length === 3) {
      let rgb: RgbColor | null = null
      if (assumeFormat === "hsl") rgb = hslFromTokens(tokens)
      else if (assumeFormat === "oklch") rgb = oklchFromTokens(tokens)
      else rgb = rgbFromTokens(tokens, true)
      if (rgb) return { rgb, alpha: withAlpha.alpha, format: null }
    }
  }

  return parseWithBrowser(raw)
}

export function rgbTupleToHex(tuple: [number, number, number]): string {
  return rgbaToHex({ r: tuple[0], g: tuple[1], b: tuple[2] })
}

export function hexToRgbTuple(value: string): [number, number, number] | null {
  const parsed = parseColorInput(value, "hex")
  if (!parsed) return null
  return [
    Math.round(parsed.rgb.r),
    Math.round(parsed.rgb.g),
    Math.round(parsed.rgb.b),
  ]
}
