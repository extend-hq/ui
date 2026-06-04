"use client"

import * as React from "react"
import { GemSmoke, type GemSmokeProps } from "@paper-design/shaders-react"
import { useTheme } from "next-themes"

const SMOKE_COLORS = ["#004CFF", "#FF8C00", "#FFB066", "#0084FF"]

const smokeLayerClassName =
  "absolute inset-0 mx-auto h-full w-full max-w-[560px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_14%,black_42%,rgba(0,0,0,0.34)_58%,rgba(0,0,0,0.08)_72%,transparent_84%)]"

export function RootLiquidLogo() {
  const { resolvedTheme } = useTheme()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const isDarkMode = isMounted && resolvedTheme === "dark"
  const colorInner = isDarkMode ? "#000000" : "#ffffff"
  const smokeProps = {
    width: "100%",
    height: "100%",
    image: "/extend-logo.svg",
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
    size: isDarkMode ? 0.96 : 0.95,
    speed: 1,
    scale: 0.6,
    fit: "contain",
  } satisfies Omit<GemSmokeProps, "className" | "style">

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative -mb-16 h-44 w-full overflow-hidden sm:-mb-20 sm:h-52 md:-mb-24 md:h-60"
    >
      <GemSmoke
        {...smokeProps}
        maxPixelCount={900000}
        className={`${smokeLayerClassName} opacity-90`}
        style={{
          filter: isDarkMode
            ? "contrast(1.2) brightness(1.1) saturate(1.28)"
            : "contrast(1.1) brightness(0.95)",
        }}
      />
      {isDarkMode ? (
        <>
          <GemSmoke
            {...smokeProps}
            outerGlow={0}
            outerDistortion={0}
            innerDistortion={0.58}
            size={0.96}
            maxPixelCount={420000}
            className={`${smokeLayerClassName} opacity-55 mix-blend-screen`}
            style={{
              filter:
                "blur(14px) saturate(1.9) brightness(1.34) drop-shadow(0 0 22px rgb(0 76 255 / 0.34))",
            }}
          />
          <GemSmoke
            {...smokeProps}
            outerGlow={0}
            outerDistortion={0}
            innerDistortion={0.58}
            maxPixelCount={560000}
            className={`${smokeLayerClassName} opacity-50 mix-blend-screen`}
            style={{
              filter:
                "blur(4px) saturate(2.15) brightness(1.42) drop-shadow(0 0 18px rgb(255 140 0 / 0.3))",
            }}
          />
        </>
      ) : null}
    </div>
  )
}
