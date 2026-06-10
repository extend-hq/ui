"use client"

import * as React from "react"
import { GemSmoke, type GemSmokeProps } from "@paper-design/shaders-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { withUiBasePath } from "@/lib/zone-path"
import { useMediaQuery } from "@/hooks/use-media-query"

const SMOKE_COLORS = ["#004CFF", "#FF8C00", "#FFB066", "#FFD29A"]

const smokeLayerClassName =
  "absolute inset-0 mx-auto h-full w-full max-w-none [mask-image:linear-gradient(to_bottom,transparent_0%,rgba(0,0,0,0.28)_12%,black_24%,black_34%,rgba(0,0,0,0.22)_48%,rgba(0,0,0,0.06)_58%,transparent_68%)] md:max-w-[560px]"

export function RootLiquidLogo({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme()
  const isMobileViewport = useMediaQuery("max-md")
  const isCoarsePointer = useMediaQuery({ pointer: "coarse" })
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)")
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const isDarkMode = isMounted && resolvedTheme === "dark"
  const shouldUseLayeredBloom =
    isDarkMode && !isMobileViewport && !isCoarsePointer && !prefersReducedMotion
  const shouldUseCheapBloom =
    isDarkMode && (isMobileViewport || isCoarsePointer || prefersReducedMotion)
  const colorInner = isDarkMode ? "#000000" : "#ffffff"
  const smokeProps = {
    width: "100%",
    height: "100%",
    image: withUiBasePath("/extend-logo.svg"),
    colors: SMOKE_COLORS,
    colorBack: "#00000000",
    colorInner,
    shape: undefined,
    innerDistortion: isDarkMode ? 0.58 : 0.48,
    outerDistortion: isDarkMode ? 0.2 : 0,
    outerGlow: isDarkMode ? 0.34 : 0.22,
    innerGlow: 1,
    offset: 0.9,
    angle: 0,
    size: isDarkMode ? 1.04 : 1.02,
    speed: prefersReducedMotion ? 0.35 : 1,
    scale: 0.6,
    fit: "contain",
  } satisfies Omit<GemSmokeProps, "className" | "style">
  const shaderFilter = !isDarkMode
    ? "contrast(1.1) brightness(0.95)"
    : shouldUseCheapBloom
      ? "contrast(1.16) brightness(1.08) saturate(1.24) drop-shadow(0 0 14px rgb(0 76 255 / 0.26)) drop-shadow(0 0 18px rgb(255 140 0 / 0.18))"
      : "contrast(1.2) brightness(1.1) saturate(1.28)"

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-0 m-0 h-44 w-full overflow-hidden sm:top-1 sm:h-52 md:top-2 md:h-60",
        className
      )}
    >
      <GemSmoke
        {...smokeProps}
        maxPixelCount={isMobileViewport || isCoarsePointer ? 420000 : 900000}
        className={`${smokeLayerClassName} opacity-90`}
        style={{
          filter: shaderFilter,
        }}
      />
      {shouldUseLayeredBloom ? (
        <>
          <GemSmoke
            {...smokeProps}
            outerGlow={0}
            outerDistortion={0}
            innerDistortion={0.58}
            size={1.04}
            maxPixelCount={420000}
            className={`${smokeLayerClassName} opacity-60 mix-blend-screen`}
            style={{
              filter:
                "blur(15px) saturate(2.05) brightness(1.4) drop-shadow(0 0 24px rgb(0 76 255 / 0.38))",
            }}
          />
          <GemSmoke
            {...smokeProps}
            outerGlow={0}
            outerDistortion={0}
            innerDistortion={0.58}
            maxPixelCount={560000}
            className={`${smokeLayerClassName} opacity-58 mix-blend-screen`}
            style={{
              filter:
                "blur(5px) saturate(2.3) brightness(1.52) drop-shadow(0 0 20px rgb(255 140 0 / 0.34))",
            }}
          />
        </>
      ) : null}
    </div>
  )
}
