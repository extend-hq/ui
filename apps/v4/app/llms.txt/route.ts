import { NextResponse } from "next/server"

import { siteConfig } from "@/lib/config"
import { formatLinkList, getComponentPages, getMarkdownUrl } from "@/lib/llm"
import { PDF_VIEWER_BLOCKS } from "@/lib/pdf-viewer-blocks"
import { source } from "@/lib/source"
import { absoluteUrl } from "@/lib/utils"

export const dynamic = "force-static"
export const revalidate = false

function getPageDescription(slug: string[]) {
  return source.getPage(slug)?.data.description?.trim()
}

function buildLlmsTxt() {
  const componentPages = getComponentPages()

  const documentation = formatLinkList(
    [
      {
        name: "Introduction",
        description: getPageDescription([]),
        url: absoluteUrl("/docs"),
        markdownUrl: getMarkdownUrl("/docs"),
      },
      {
        name: "Components index",
        description:
          "Every document component with a one-line description and a link to its page.",
        url: absoluteUrl("/docs/components"),
        markdownUrl: getMarkdownUrl("/docs/components"),
      },
    ],
    true
  )

  const components = formatLinkList(componentPages, true)

  const blocks = PDF_VIEWER_BLOCKS.map(
    (block) =>
      `- [${block.title}](${getMarkdownUrl(block.docsHref)}): ${block.description} Install with \`${block.command}\`.`
  ).join("\n")

  return `# ${siteConfig.name}

> ${siteConfig.description} Extend UI is an MIT-licensed set of React and Tailwind components for PDF, DOCX, Excel, PowerPoint, and CSV viewers and editors, plus file upload, Finder-style file browsing, bounding box citations, layout blocks, e-signature, document splitting, and schema building. Components are installed as source through the shadcn registry under the \`@extend\` namespace.

Every documentation page has a Markdown version at the same URL with \`.md\` appended. For example, ${absoluteUrl("/docs/components/pdf-viewer")} is available as Markdown at ${getMarkdownUrl("/docs/components/pdf-viewer")}. The links in the Documentation, Components, and Blocks sections below point at the Markdown versions.

Extend UI is built and maintained by Extend (extend.ai), the document processing platform. Use this file for the UI component library. For the Extend API, SDKs, CLI, and MCP server, use the Extend documentation index at https://docs.extend.ai/llms.txt. For Extend the company, products, pricing, and benchmarks, use https://www.extend.ai/llms.txt.

## Installation

Components are installed with the shadcn CLI. Add the \`@extend\` registry to \`components.json\`, then add the component by name. Installed components are copied into the project as editable source and import shared primitives (Button, Dialog, Select, Tooltip) from the project's existing \`@/components/ui\` path. The registry selects Base UI or Radix source from the project's configured \`style\` and transforms icons for the configured \`iconLibrary\`. Keep existing primitives when the CLI asks about overwriting them. The deprecated shadcn \`default\` style is not supported.

\`\`\`json
{
  "registries": {
    "@extend": "https://www.extend.ai/ui/r/styles/{style}/{name}.json"
  }
}
\`\`\`

\`\`\`bash
npx shadcn@latest add @extend/pdf-viewer
\`\`\`

## Documentation

${documentation}

## Components

Each page covers usage, props, installation, and live examples for one component.

${components}

## Blocks

Composed, installable examples that combine several components into a complete surface. Preview them at ${absoluteUrl("/blocks")}.

${blocks}

## Source

- [GitHub repository](${siteConfig.links.github}): Source code, issues, and release history for Extend UI.
- [README](${siteConfig.links.github}#readme): Getting started, installation, and usage examples.
- [License](${siteConfig.links.github}/blob/main/LICENSE.md): MIT license.

## Optional

- [Extend documentation index](https://docs.extend.ai/llms.txt): Extend API, SDKs, CLI, MCP server, and platform documentation for agents.
- [Extend company index](https://www.extend.ai/llms.txt): Extend products, pricing, benchmarks, customers, and comparisons.
- [Sitemap](${absoluteUrl("/sitemap.xml")}): All indexed HTML pages on this site.
`
}

export function GET() {
  return new NextResponse(buildLlmsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  })
}
