import { promises as fs } from "node:fs"
import path from "node:path"

import { highlightCode } from "@/lib/highlight-code"

type RegistryFile = {
  path: string
  target?: string
}

type RegistryItem = {
  name: string
  registryDependencies?: string[]
  files?: RegistryFile[]
}

export type BlockCodeFile = {
  sourcePath: string
  targetPath: string
  language: string
}

export type LoadedBlockCodeFile = BlockCodeFile & {
  content: string
  highlightedContent: string | null
  lineCount: number
}

export const blockIds = [
  "human-review",
  "pdf-dropzone",
  "ocr-blocks",
  "e-signature",
  "document-splits",
  "excel-document-splits",
  "docx-editor-block",
]

const LARGE_CODE_HIGHLIGHT_LIMIT = 80_000

const blockCodeDependencies: Record<string, string[]> = {
  "pdf-dropzone": ["file-upload", "pdf-viewer", "file-thumbnail"],
  "ocr-blocks": ["pdf-block-resizable-shell", "pdf-viewer", "file-thumbnail"],
  "e-signature": ["pdf-block-resizable-shell", "pdf-viewer", "file-thumbnail"],
  "human-review": ["pdf-block-resizable-shell", "pdf-viewer", "file-thumbnail"],
  "document-splits": [
    "file-thumbnail",
    "pdf-block-resizable-shell",
    "pdf-viewer",
  ],
  "excel-document-splits": [
    "file-thumbnail",
    "pdf-block-resizable-shell",
    "xlsx-viewer",
  ],
  "docx-editor-block": ["docx-editor", "file-thumbnail"],
}

const appRoot = process.cwd()

export async function getBlockCodeFileManifest(): Promise<
  Record<string, BlockCodeFile[]>
> {
  const itemsByName = await getRegistryItemsByName()

  return Object.fromEntries(
    blockIds.map((id) => {
      const files = collectRegistryFiles(id, itemsByName).map((file) => ({
        sourcePath: file.path,
        targetPath: normalizeRegistryTarget(file),
        language: getCodeLanguage(file.path),
      }))

      return [id, files] satisfies [string, BlockCodeFile[]]
    })
  )
}

export async function getLoadedBlockCodeFile({
  blockId,
  targetPath,
}: {
  blockId: string
  targetPath: string
}): Promise<LoadedBlockCodeFile | null> {
  const itemsByName = await getRegistryItemsByName()
  const file = collectRegistryFiles(blockId, itemsByName).find(
    (candidate) => normalizeRegistryTarget(candidate) === targetPath
  )

  if (!file) return null

  const language = getCodeLanguage(file.path)
  const content = await fs.readFile(resolveSourceFilePath(file.path), "utf8")
  const highlightedContent =
    content.length <= LARGE_CODE_HIGHLIGHT_LIMIT
      ? await highlightCode(content, language)
      : null

  return {
    sourcePath: file.path,
    targetPath,
    language,
    content,
    highlightedContent,
    lineCount: content.split("\n").length,
  }
}

async function getRegistryItemsByName() {
  const registryPath = path.join(appRoot, "registry.json")
  const registry = JSON.parse(await fs.readFile(registryPath, "utf8")) as {
    items: RegistryItem[]
  }

  return new Map(registry.items.map((item) => [item.name, item] as const))
}

function getCodeLanguage(filePath: string) {
  const extension = filePath.split(".").pop()

  if (extension === "ts" || extension === "tsx") return "tsx"
  if (extension === "js" || extension === "jsx") return "jsx"
  if (extension === "css") return "css"
  if (extension === "json") return "json"
  if (extension === "md" || extension === "mdx") return "mdx"

  return "tsx"
}

function collectRegistryFiles(
  name: string,
  itemsByName: Map<string, RegistryItem>
): RegistryFile[] {
  const sampleItems = [name, ...(blockCodeDependencies[name] ?? [])].flatMap(
    (itemName) => itemsByName.get(itemName)?.files ?? []
  )

  return dedupeFiles(sampleItems)
}

function dedupeFiles(files: RegistryFile[]) {
  const seen = new Set<string>()

  return files.filter((file) => {
    const key = file.target ?? file.path
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

function normalizeRegistryTarget(file: RegistryFile) {
  const target = file.target ?? file.path

  if (target.startsWith("@components/")) {
    return target.replace("@components/", "components/")
  }

  if (target.startsWith("@ui/")) {
    return target.replace("@ui/", "components/ui/")
  }

  if (target.startsWith("@hooks/")) {
    return target.replace("@hooks/", "hooks/")
  }

  if (target.startsWith("@lib/")) {
    return target.replace("@lib/", "lib/")
  }

  return target
}

function resolveSourceFilePath(filePath: string) {
  if (filePath.startsWith("components/")) {
    return path.join(appRoot, "components", filePath.slice("components/".length))
  }

  if (filePath.startsWith("hooks/")) {
    return path.join(appRoot, "hooks", filePath.slice("hooks/".length))
  }

  if (filePath.startsWith("registry/")) {
    return path.join(appRoot, "registry", filePath.slice("registry/".length))
  }

  throw new Error(`Unexpected registry source path: ${filePath}`)
}
