const canonicalUrl = "https://www.extend.ai/ui"

export const siteConfig = {
  name: "Extend UI",
  url: canonicalUrl,
  ogImage: `${canonicalUrl}/opengraph-image.png`,
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
