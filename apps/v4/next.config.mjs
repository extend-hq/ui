import path from "path"
import { createMDX } from "fumadocs-mdx/next"

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/ui"
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? "/ui-static"

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  assetPrefix,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingIncludes: {
    "/*": ["./public/r/**/*.json", "./registry/**/*", "./styles/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "avatar.vercel.sh",
      },
    ],
  },
  turbopack: {
    root: path.resolve(import.meta.dirname, "../.."),
    resolveAlias: {
      "@dukelib/sheets-wasm/duke_sheets_wasm_bg.wasm":
        "./lib/turbopack-duke-sheets-wasm-url.ts",
    },
  },
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "pdfjs-dist$": "pdfjs-dist/build/pdf.min.mjs",
    }

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    }

    config.module.rules.unshift({
      resourceQuery: /url/,
      test: /\.wasm$/,
      type: "asset/resource",
    })

    return config
  },
  redirects() {
    return [
      {
        source: "/",
        destination: basePath,
        permanent: false,
        basePath: false,
      },
      {
        source: "/docs/:path*",
        destination: `${basePath}/docs/:path*`,
        permanent: true,
        basePath: false,
      },
      {
        source: "/blocks",
        destination: `${basePath}/blocks`,
        permanent: true,
        basePath: false,
      },
      {
        source: "/view/:path*",
        destination: `${basePath}/view/:path*`,
        permanent: true,
        basePath: false,
      },
      {
        source: "/r/:path*",
        destination: `${basePath}/r/:path*`,
        permanent: true,
        basePath: false,
      },
      {
        source: "/components",
        destination: `${basePath}/docs/components`,
        permanent: true,
        basePath: false,
      },
      {
        source: "/components",
        destination: "/docs/components",
        permanent: true,
      },
      {
        source: "/docs/:path*.mdx",
        destination: "/docs/:path*.md",
        permanent: true,
      },
    ]
  },
  rewrites() {
    return [
      {
        source: "/docs/:path*.md",
        destination: "/llm/:path*",
      },
    ]
  },
}

const withMDX = createMDX({})

export default withMDX(nextConfig)
