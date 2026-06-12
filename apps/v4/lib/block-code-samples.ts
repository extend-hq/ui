import { promises as fs } from "node:fs"
import path from "node:path"

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
  lineCount: number
}

export const blockIds = [
  "layout-blocks",
  "bounding-box-citations",
  "pdf-dropzone",
  "e-signature",
  "document-splits",
  "excel-document-splits",
  "docx-editor-block",
  "file-system",
]

const blockCodeDependencies: Record<string, string[]> = {
  "pdf-dropzone": ["file-upload", "pdf-viewer", "file-thumbnail"],
  "layout-blocks": [
    "pdf-block-resizable-shell",
    "pdf-viewer",
    "file-thumbnail",
  ],
  "e-signature": ["pdf-block-resizable-shell", "pdf-viewer", "file-thumbnail"],
  "bounding-box-citations": [
    "pdf-block-resizable-shell",
    "pdf-viewer",
    "file-thumbnail",
  ],
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
  "file-system": [
    "file-system",
    "file-thumbnail",
    "pdf-viewer",
    "docx-viewer",
    "xlsx-viewer",
  ],
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

export async function getLoadedBlockCodeFiles(
  blockId: string
): Promise<LoadedBlockCodeFile[] | null> {
  if (!blockIds.includes(blockId)) return null

  const itemsByName = await getRegistryItemsByName()

  return Promise.all(
    collectRegistryFiles(blockId, itemsByName).map(loadBlockCodeFile)
  )
}

async function loadBlockCodeFile(
  file: RegistryFile
): Promise<LoadedBlockCodeFile> {
  const language = getCodeLanguage(file.path)
  const content = await fs.readFile(resolveSourceFilePath(file.path), "utf8")

  return {
    sourcePath: file.path,
    targetPath: normalizeRegistryTarget(file),
    language,
    content,
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
  const registryName = blockCodeRegistryItems[name] ?? name
  const sampleItems = [
    registryName,
    ...(blockCodeDependencies[name] ?? []),
  ].flatMap((itemName) => itemsByName.get(itemName)?.files ?? [])

  return dedupeFiles(sampleItems)
}

const blockCodeRegistryItems: Record<string, string> = {
  "layout-blocks": "layout-blocks-block",
  "bounding-box-citations": "bounding-box-citations-block",
  "file-system": "file-system-block",
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
    return path.join(
      appRoot,
      "components",
      filePath.slice("components/".length)
    )
  }

  if (filePath.startsWith("hooks/")) {
    return path.join(appRoot, "hooks", filePath.slice("hooks/".length))
  }

  if (filePath.startsWith("registry/")) {
    return path.join(appRoot, "registry", filePath.slice("registry/".length))
  }

  throw new Error(`Unexpected registry source path: ${filePath}`)
}
