import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { PdfViewerBlocks } from "@/components/pdf-viewer-blocks"

type RegistryFile = {
  path: string
  target?: string
}

type RegistryItem = {
  name: string
  registryDependencies?: string[]
  files?: RegistryFile[]
}

type BlockCodeSample = {
  sourcePath: string
  targetPath: string
  content: string
}

export const dynamic = "force-static"
export const revalidate = false

const blockIds = [
  "pdf-dropzone",
  "citations",
  "ocr-blocks",
  "e-signature",
  "human-review",
  "document-splits",
  "excel-document-splits",
  "docx-editor-block",
]

const blockCodeDependencies: Record<string, string[]> = {
  "pdf-dropzone": ["file-upload", "pdf-viewer", "file-thumbnail"],
  citations: ["pdf-block-resizable-shell", "pdf-viewer", "file-thumbnail"],
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

const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../"
)

async function getBlockCodeSamples(): Promise<
  Record<string, BlockCodeSample[]>
> {
  const registryPath = path.join(appRoot, "registry.json")
  const registry = JSON.parse(await fs.readFile(registryPath, "utf8")) as {
    items: RegistryItem[]
  }
  const itemsByName = new Map(
    registry.items.map((item) => [item.name, item] as const)
  )

  const samples = await Promise.all(
    blockIds.map(async (id) => {
      const registryFiles = collectRegistryFiles(id, itemsByName)
      const files = await Promise.all(
        registryFiles.map(async (file) => {
          const content = await fs.readFile(
            path.join(appRoot, file.path),
            "utf8"
          )

          return {
            sourcePath: file.path,
            targetPath: normalizeRegistryTarget(file),
            content,
          }
        })
      )

      return [id, files] satisfies [string, BlockCodeSample[]]
    })
  )

  return Object.fromEntries(samples)
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

export default async function BlocksPage() {
  const codeSamples = await getBlockCodeSamples()

  return <PdfViewerBlocks codeSamples={codeSamples} />
}
