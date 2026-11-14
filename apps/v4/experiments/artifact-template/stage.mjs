import {
  copyFile,
  cp,
  lstat,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { validateManifest } from "../../components/extend/slides/validate.js"

const root = path.dirname(fileURLToPath(import.meta.url))
const source = process.argv[2]

if (!source || process.argv.length > 4) {
  throw new Error(
    "Usage: pnpm --filter v4 artifact-template:stage /path/to/file.docx|xlsx|pptx|pdf|deck-folder [new-output-directory]"
  )
}

const info = await lstat(source)
const kind = info.isDirectory()
  ? "slides"
  : path.extname(source).slice(1).toLowerCase()
if (!["docx", "xlsx", "pptx", "pdf", "slides"].includes(kind)) {
  throw new Error(
    "Only deck folders and DOCX, XLSX, PPTX and PDF files are supported"
  )
}
// A spreadsheet, a PDF or a deck ships as source (source/build.mjs); the
// other kinds as the Vite bundle.
const sourceKinds = ["xlsx", "pdf", "slides"]
const dist = path.join(
  root,
  sourceKinds.includes(kind) ? `dist-${kind}` : "dist"
)
const output = process.argv[3] ? path.resolve(process.argv[3]) : dist

const name = path.basename(source)
if (
  kind !== "slides" &&
  (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.(docx|xlsx|pptx|pdf)$/.test(name) ||
    !name.endsWith(`.${kind}`))
) {
  throw new Error(
    "Use an ASCII file name containing only letters, numbers, dots, underscores and dashes"
  )
}

if (kind !== "slides" && (!info.isFile() || info.size > 25 * 1024 * 1024)) {
  throw new Error("The source must be a regular file no larger than 25 MiB")
}

let deckFiles = []
let title = name
if (kind === "slides") {
  const manifest = validateManifest(
    JSON.parse(await readFile(path.join(source, "deck.json"), "utf8"))
  )
  title = manifest.title
  deckFiles = ["deck.json", ...manifest.order.map((id) => `slides/${id}.html`)]
  if (!(await lstat(path.join(source, "slides"))).isDirectory())
    throw new Error("slides must be a regular directory")
  for (const file of deckFiles) {
    const info = await lstat(path.join(source, file))
    if (!info.isFile() || info.size > 25 * 1024 * 1024)
      throw new Error(`Invalid deck file: ${file}`)
  }
}

if (
  kind === "slides" &&
  (path.resolve(source) === path.join(output, "deck") ||
    path.resolve(source).startsWith(path.join(output, "deck") + path.sep))
) {
  throw new Error("Source deck must be outside the output deck directory")
}

await stat(path.join(dist, "index.html"))
await stat(path.join(dist, "template.json"))
let createdOutput = false
try {
  if (output !== dist) {
    await mkdir(path.dirname(output), { recursive: true })
    try {
      await mkdir(output)
    } catch (error) {
      if (error.code === "EEXIST") {
        throw new Error(`Output directory already exists: ${output}`)
      }
      throw error
    }
    createdOutput = true
    await cp(dist, output, { recursive: true })
  }

  const documentDir = path.join(output, "document")
  await rm(documentDir, { recursive: true, force: true })
  const deckDir = path.join(output, "deck")
  await rm(deckDir, { recursive: true, force: true })
  if (kind === "slides") {
    await mkdir(path.join(deckDir, "slides"), { recursive: true })
    for (const file of deckFiles)
      await copyFile(path.join(source, file), path.join(deckDir, file))
  } else {
    await mkdir(documentDir)
    await copyFile(source, path.join(documentDir, name))
  }
  await writeFile(
    path.join(output, "artifact.json"),
    JSON.stringify({
      kind,
      title,
      file: kind === "slides" ? "deck/deck.json" : `document/${name}`,
    }) + "\n"
  )
  await writeFile(path.join(output, "cool.json"), '{"spa":false}\n')

  let count = 0
  let bytes = 0
  async function checkDirectory(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const item = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        await checkDirectory(item)
      } else if (entry.isFile()) {
        const { size } = await stat(item)
        if (size > 25 * 1024 * 1024) {
          throw new Error(
            `${path.relative(output, item)} exceeds the 25 MiB asset limit`
          )
        }
        count++
        bytes += size
      } else {
        throw new Error(`${path.relative(output, item)} is not a regular file`)
      }
    }
  }

  await checkDirectory(output)
  if (count > 20_000 || bytes > 1024 * 1024 * 1024) {
    throw new Error(
      "Release exceeds the artifact file count or total size limit"
    )
  }
  console.log(
    `Staged ${kind.toUpperCase()} artifact: ${count} files, ${bytes} bytes in ${output}`
  )
} catch (error) {
  if (createdOutput) await rm(output, { recursive: true, force: true })
  throw error
}
