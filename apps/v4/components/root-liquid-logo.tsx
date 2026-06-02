"use client"

import { LiquidMetal } from "@paper-design/shaders-react"
import { useTheme } from "next-themes"

export function RootLiquidLogo() {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative -mb-16 h-44 w-full overflow-hidden sm:-mb-20 sm:h-52 md:-mb-24 md:h-60"
    >
      <LiquidMetal
        width="100%"
        height="100%"
        image="/extend-logo.svg"
        colorBack="#00000000"
        colorTint="#ffffff"
        shape="none"
        repetition={2.8}
        softness={0.16}
        shiftRed={0.26}
        shiftBlue={0.32}
        distortion={0.08}
        contour={0.48}
        angle={68}
        speed={0.72}
        scale={0.72}
        fit="contain"
        maxPixelCount={900000}
        className="mx-auto h-full w-full max-w-[560px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_14%,black_42%,rgba(0,0,0,0.34)_58%,rgba(0,0,0,0.08)_72%,transparent_84%)] opacity-80 [filter:contrast(1.16)_brightness(0.86)]"
      />
    </div>
  )
}
