import { getPagesFromFolder, type PageTreeFolder } from "@/lib/page-tree"
import { source } from "@/lib/source"
import { absoluteUrl } from "@/lib/utils"

export type LLMPageLink = {
  name: string
  description?: string
  url: string
  markdownUrl: string
}

// `/docs/*.md` is rewritten to the /llm route in next.config.mjs.
export function getMarkdownUrl(docsUrl: string) {
  return absoluteUrl(`${docsUrl}.md`)
}

export function getComponentPages(): LLMPageLink[] {
  const componentsFolder = source.pageTree.children.find(
    (page) => page.$id === "components"
  )

  if (componentsFolder?.type !== "folder") {
    return []
  }

  return getPagesFromFolder(componentsFolder as PageTreeFolder, "radix").map(
    (component) => {
      const slug = component.url.replace(/^\/docs\//, "").split("/")
      const description = source.getPage(slug)?.data.description?.trim()

      return {
        name: String(component.name),
        description,
        url: absoluteUrl(component.url),
        markdownUrl: getMarkdownUrl(component.url),
      }
    }
  )
}

export function formatLinkList(links: LLMPageLink[], useMarkdownUrl = false) {
  return links
    .map(
      ({ name, description, url, markdownUrl }) =>
        `- [${name}](${useMarkdownUrl ? markdownUrl : url})${
          description ? `: ${description}` : ""
        }`
    )
    .join("\n")
}

export function replaceComponentsList(content: string) {
  return content.replace(
    /<ComponentsList\s*\/>/g,
    formatLinkList(getComponentPages())
  )
}

export function processMdxForLLMs(content: string) {
  return replaceComponentsList(content)
}
