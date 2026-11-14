// Builds one kind's template as source: `node build.mjs xlsx|pdf|slides`
// writes dist-<kind>/ with the page, the loader, the real TSX/TS files under
// src/ (at their repository paths), and what an agent never edits: the npm
// packages prebuilt in vendor/, the engine's wasm, and the CSS for first
// paint. stage.mjs adds the document. Run by
// `pnpm --filter v4 artifact-template:build`.
import { createHash } from "node:crypto"
import { existsSync, readFileSync, realpathSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as esbuild from "esbuild"

import { templateJson } from "../template-version.mjs"
import { compileFile } from "./compile.js"
import { candidates, link, resolve } from "./resolve.js"
import { buildCss } from "./tailwind.js"

const here = path.dirname(fileURLToPath(import.meta.url))
const template = path.dirname(here)
const v4 = path.resolve(template, "../..")
const repo = path.resolve(v4, "../..")
const xlsx = path.join(repo, "engines/react-xlsx/packages/react-xlsx")
const served = (file) =>
  "src/" + path.relative(repo, file).split(path.sep).join("/")
const onDisk = (file) => path.join(repo, file.slice("src/".length))
// A wasm file from an npm package is not source: it ships content-named in
// vendor/, and its ?url import has an alias to it.
const packageWasm = (spec) => {
  const file = createRequire(path.join(v4, "package.json")).resolve(spec)
  const hash = createHash("sha256").update(readFileSync(file)).digest("hex")
  return [`vendor/${path.basename(file, ".wasm")}-${hash.slice(0, 12)}.wasm`, file]
}

// main.tsx and webmcp.ts load each document kind lazily; a site leaves out
// the other kinds. workers: the source files the page starts as workers.
const kinds = {
  xlsx: {
    lazy: ["./xlsx-artifact", "@extend-ai/react-xlsx/agent"],
    aliases: {
      "@extend-ai/react-xlsx": served(path.join(xlsx, "src/index.ts")),
      "@extend-ai/react-xlsx/agent": served(path.join(xlsx, "src/agent.ts")),
      "@extend-ai/react-xlsx/duke_sheets_wasm_bg.wasm": served(
        path.join(xlsx, "vendor/sheets-wasm/duke_sheets_wasm_bg.wasm")
      ),
    },
    workers: [served(path.join(xlsx, "src/xlsx-worker.ts"))],
    engines: ["@extend-ai/react-xlsx"],
  },
  pdf: {
    lazy: ["@/components/extend/pdf-editor"],
    aliases: {
      // As in vite.config.ts: the page's one shared pdfium engine.
      "@/lib/pdf-thumbnail-utils": served(path.join(template, "src/pdf-engine.ts")),
    },
    wasm: { "@embedpdf/pdfium/pdfium.wasm": packageWasm("@embedpdf/pdfium/pdfium.wasm") },
    workers: [],
    engines: [],
  },
  slides: {
    lazy: ["@/components/extend/slides/slides-editor"],
    aliases: {},
    workers: [],
    engines: [],
  },
}
const kind = process.argv[2]
if (!kinds[kind])
  throw new Error(`Usage: node build.mjs ${Object.keys(kinds).join("|")}`)
const own = kinds[kind]
const out = path.join(template, `dist-${kind}`)
const entry = served(path.join(template, "src/main.tsx"))
const wasm = Object.entries(own.wasm ?? {})
const config = {
  aliases: {
    ...own.aliases,
    ...Object.fromEntries(wasm.map(([spec, [file]]) => [spec, file])),
  },
  prefixes: [["@/", served(v4) + "/"]],
}
const otherKinds = [
  "@/components/extend/docx-editor",
  "@/components/extend/pptx-viewer",
  "@extend-ai/react-docx/agent",
  ...Object.values(kinds).flatMap((other) =>
    other === own ? [] : other.lazy
  ),
]
const left = otherKinds.map((spec) => resolve(spec, entry, config, () => false))
const absent = left.filter((r) => r.missing).map((r) => r.missing)
const absentFiles = new Set(absent.flatMap(candidates))
const skippedPackages = new Set(
  left.filter((r) => r.vendor).map((r) => r.vendor)
)
const exists = (file) =>
  !absentFiles.has(file) &&
  existsSync(onDisk(file)) &&
  statSync(onDisk(file)).isFile()

// The icon pack has thousands of icons: vendor/ holds the ones the source
// imports by name. Every other package is whole.
const iconPack = "@hugeicons/core-free-icons"
const iconImport =
  /import\s*\{([^}]*)\}\s*from\s*["']@hugeicons\/core-free-icons["']/g
const icons = new Set()
const typeImport = /(?:import|export)\s+type\b[^;]*?\bfrom\s*["']([^"']+)["']/g

// 1. Link the page's and the worker's graphs with the page's own compile and
// link steps.
const entries = new Map() // path -> {code, specs, source}
const specsOf = (file) => {
  if (!entries.has(file)) {
    const source = readFileSync(onDisk(file), "utf8")
    entries.set(file, { ...compileFile(file, source), source })
  }
  return entries.get(file).specs
}
function graph(start) {
  const linked = link(start, specsOf, config, exists)
  for (const base of linked.missing)
    if (!absent.includes(base))
      throw new Error(
        `${base} is imported by ${linked.missingFrom[base]} but is not a file`
      )
  return linked
}
const page = graph(entry)
const workerGraphs = own.workers.map(graph)
const linked = [page, ...workerGraphs]
const modules = [...new Set(linked.flatMap((graph) => graph.modules))]
// name -> a module that imports it
function packagesOf(linked) {
  const packages = new Map()
  for (const file of linked.modules)
    for (const id of Object.values(linked.maps[file]))
      if (
        id[0] === "~" &&
        !skippedPackages.has(id.slice(1)) &&
        !packages.has(id.slice(1))
      )
        packages.set(id.slice(1), file)
  return packages
}
for (const file of modules)
  for (const [, names] of entries.get(file).source.matchAll(iconImport))
    for (const name of names.split(","))
      if (name.trim()) icons.add(name.trim().split(/\s+as\s+/)[0])

await rm(out, { recursive: true, force: true })
await mkdir(path.join(out, "vendor"), { recursive: true })
const write = async (file, body) => {
  await mkdir(path.dirname(path.join(out, file)), { recursive: true })
  await writeFile(path.join(out, file), body)
}
// Content-named, so the loader caches it once for good.
const named = async (name, extension, body) => {
  const file = `vendor/${name}-${createHash("sha256").update(body).digest("hex").slice(0, 12)}${extension}`
  await write(file, body)
  return file
}

// 2. Source files and assets at their served paths, and the files that
// type-only imports name (sucrase drops those), for an agent to read. CSS
// packages (tailwindcss) are served from vendor/css.
const sourceFiles = new Set([...modules, ...page.css])
for (const { modules, maps } of linked)
  for (const file of modules)
    for (const id of Object.values(maps[file]))
      if (id.endsWith("?url") && id.startsWith("src/"))
        sourceFiles.add(id.slice(0, -"?url".length))
const typeQueue = [...modules]
while (typeQueue.length) {
  const file = typeQueue.pop()
  for (const [, spec] of readFileSync(onDisk(file), "utf8").matchAll(
    typeImport
  )) {
    const target = resolve(spec, file, config, exists)
    if (target.path && !sourceFiles.has(target.path)) {
      sourceFiles.add(target.path)
      typeQueue.push(target.path)
    }
  }
}
for (const file of sourceFiles) {
  await mkdir(path.dirname(path.join(out, file)), { recursive: true })
  await copyFile(onDisk(file), path.join(out, file))
}
for (const [, [file, disk]] of wasm) await copyFile(disk, path.join(out, file))
const cssPackages = {}
for (const sheet of page.css)
  for (const spec of entries.get(sheet).specs)
    if (resolve(spec, sheet, config, exists).vendor && !cssPackages[spec])
      cssPackages[spec] = await copyStylePackage(spec)

// A CSS package's stylesheets, copied whole so its own relative imports work.
async function copyStylePackage(name) {
  const directory = realpathSync(path.join(v4, "node_modules", name))
  const pkg = JSON.parse(
    await readFile(path.join(directory, "package.json"), "utf8")
  )
  const style = pkg.style ?? pkg.exports?.["."]?.style ?? "index.css"
  const styleDir = path.dirname(path.join(directory, style))
  for (const file of await readdir(styleDir))
    if (file.endsWith(".css")) {
      await mkdir(path.join(out, "vendor/css", name), { recursive: true })
      await copyFile(
        path.join(styleDir, file),
        path.join(out, "vendor/css", name, file)
      )
    }
  return `vendor/css/${name}/${path.basename(style)}`
}

// 3. npm packages, prebuilt: one script for the page and one for the worker.
// Each sets self.__vendor to every package's namespace, so source edits can
// use any export (of the icon pack, the icons above). A package runs the
// first time a module requires it, so the chart libraries never run for a
// workbook without charts.
async function vendor(packages, name) {
  const lines = [
    "const namespace = (m) => (m && m.__esModule ? m : { ...m, default: m })",
  ]
  const fields = []
  for (const spec of packages.keys()) {
    const key = JSON.stringify(spec)
    if (spec === iconPack) {
      const list = [...icons]
      lines.push(
        `import { ${list.map((icon, i) => `${icon} as icon${i}`).join(", ")} } from ${key}`
      )
      fields.push(
        `${key}: { ${list.map((icon, i) => `${icon}: icon${i}`).join(", ")} }`
      )
    } else fields.push(`get ${key}() { return namespace(require(${key})) }`)
  }
  const result = await esbuild.build({
    stdin: {
      contents: `${lines.join("\n")}\nself.__vendor = { ${fields.join(", ")} }\n`,
      resolveDir: here,
      loader: "js",
    },
    bundle: true,
    format: "iife",
    platform: "browser",
    minify: true,
    write: false,
    define: { "process.env.NODE_ENV": '"production"' },
    logLevel: "warning",
    plugins: [
      {
        // Each package resolves from a file that imports it, as in the repository.
        name: "importer",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) =>
            args.importer === "<stdin>"
              ? build.resolve(args.path, {
                  resolveDir: path.dirname(onDisk(packages.get(args.path))),
                  kind: args.kind,
                })
              : undefined
          )
        },
      },
    ],
  })
  return named(name, ".js", result.outputFiles[0].contents)
}

// 4. The two compilers the page loads only when it needs them.
async function bundle(contents, name, format) {
  const result = await esbuild.build({
    stdin: { contents, resolveDir: here, loader: "js" },
    bundle: true,
    format,
    platform: "browser",
    minify: true,
    write: false,
    logLevel: "warning",
  })
  return named(name, ".js", result.outputFiles[0].contents)
}

// 5. The CSS for first paint, built the way the page rebuilds it, and the
// key the page computes for it: every module's and stylesheet's content hash.
const text = (file) => readFile(path.join(out, file), "utf8")
const shippedCss = await buildCss(
  page.sheets,
  cssPackages,
  modules.map((file) => entries.get(file).code),
  text
)
const sha1 = (text) => createHash("sha1").update(text).digest("hex")
const cssKey = sha1(
  JSON.stringify(
    [...modules, ...page.css]
      .sort()
      .map((file) => [file, sha1(entries.get(file).source)])
  )
)

const manifest = {
  entry,
  workers: Object.fromEntries(
    await Promise.all(
      own.workers.map(async (worker, i) => [
        worker,
        await vendor(packagesOf(workerGraphs[i]), "vendor-worker"),
      ])
    )
  ),
  config,
  files: [...sourceFiles].sort(),
  absent,
  vendor: await vendor(
    packagesOf({
      modules,
      maps: Object.assign({}, ...linked.map((graph) => graph.maps).reverse()),
    }),
    "vendor"
  ),
  compiler: await bundle(
    `import { compileFile } from "./compile.js"\nself.compiler = { compileFile }\n`,
    "compiler",
    "iife"
  ),
  css: {
    packages: cssPackages,
    key: cssKey,
    shipped: await named("app", ".css", shippedCss),
    compiler: await bundle(
      `export { buildCss } from "./tailwind.js"\n`,
      "tailwind",
      "esm"
    ),
  },
}
// The loader's cache is per version, so a new loader never reads an older
// loader's entries.
manifest.version = createHash("sha256")
  .update(JSON.stringify({ ...manifest, css: { ...manifest.css, key: "" } }))
  .update(await readFile(path.join(here, "loader.js")))
  .update(await readFile(path.join(here, "resolve.js")))
  .digest("hex")
  .slice(0, 12)
await write("loader-manifest.json", JSON.stringify(manifest, null, 1) + "\n")

// 6. The page: the template's index.html, running the loader.
const html = await readFile(path.join(template, "index.html"), "utf8")
const script = '<script type="module" src="/src/main.tsx"></script>'
if (!html.includes(script))
  throw new Error(`index.html no longer has ${script}`)
await write(
  "index.html",
  html.replace(script, '<script type="module" src="./loader.js"></script>')
)
await copyFile(path.join(here, "loader.js"), path.join(out, "loader.js"))
await copyFile(path.join(here, "resolve.js"), path.join(out, "resolve.js"))
await copyFile(
  path.join(here, `template-${kind}.md`),
  path.join(out, "template.md")
)
await write("template.json", templateJson(own.engines))
console.log(`dist-${kind}: ${modules.length} modules, version ${manifest.version}`)
