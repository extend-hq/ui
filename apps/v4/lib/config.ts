function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "")
}

function normalizeBasePath(value?: string) {
  if (!value || value === "/") return ""

  const prefixed = value.startsWith("/") ? value : `/${value}`

  return prefixed.replace(/\/+$/, "")
}

const appUrl = normalizeUrl(
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.extend.ai/ui"
)
const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)

export const siteConfig = {
  name: "Extend UI",
  url: appUrl,
  basePath,
  ogImage: `${appUrl}/opengraph-image.png`,
  description:
    "Open source UI primitives for building document processing products with viewers, review surfaces, and validation workflows.",
  links: {
    github: "https://github.com/extend-hq/ui",
  },
  navItems: [
    {
      href: "/docs",
      label: "Docs",
    },
    {
      href: "/docs/components",
      label: "Components",
    },
    {
      href: "/blocks",
      label: "Blocks",
    },
  ],
}

export const META_THEME_COLORS = {
  light: "#ffffff",
  dark: "#09090b",
}
