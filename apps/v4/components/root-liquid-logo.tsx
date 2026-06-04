"use client"

import * as React from "react"
import { GemSmoke } from "@paper-design/shaders-react"
import { useTheme } from "next-themes"

export function RootLiquidLogo() {
  const { resolvedTheme } = useTheme()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const colorInner =
    isMounted && resolvedTheme === "dark" ? "#000000" : "#ffffff"

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative -mb-16 h-44 w-full overflow-hidden sm:-mb-20 sm:h-52 md:-mb-24 md:h-60"
    >
      <GemSmoke
        width="100%"
        height="100%"
        image="/extend-logo.svg"
        colors={["#004CFF", "#FF8C00", "#FFB066", "#0084FF"]}
        colorBack="#00000000"
        colorInner={colorInner}
        shape={undefined}
        innerDistortion={0.48}
        outerDistortion={0}
        outerGlow={0.22}
        innerGlow={1}
        offset={0.9}
        angle={0}
        size={0.95}
        speed={1}
        scale={0.6}
        fit="contain"
        maxPixelCount={900000}
        className="absolute inset-0 mx-auto h-full w-full max-w-[560px] [mask-image:linear-gradient(to_bottom,transparent_0%,black_14%,black_42%,rgba(0,0,0,0.34)_58%,rgba(0,0,0,0.08)_72%,transparent_84%)] opacity-90 [filter:contrast(1.1)_brightness(0.95)]"
      />
    </div>
  )
}
