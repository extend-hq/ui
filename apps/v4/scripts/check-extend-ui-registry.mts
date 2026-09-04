import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import {
  cp,
  mkdtemp,
  readdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises"
import { createServer } from "node:http"
import os from "node:os"
import path from "node:path"
import ts from "typescript"

import {
  getRegistryFamily,
  styleRegistryDependencies,
} from "../lib/registry-style.ts"

type Family = "base" | "radix"
type RegistryFile = {
  path: string
  target?: string
  content?: string
  type: string
}
type RegistryItem = {
  name: string
  type: string
  categories?: string[]
  dependencies?: string[]
  registryDependencies?: string[]
  files?: RegistryFile[]
}
const styles = ["nova", "vega", "maia", "lyra", "mira", "luma", "sera", "rhea"]
const iconLibraries = {
  lucide: ["lucide-react"],
  hugeicons: ["@hugeicons/react", "@hugeicons/core-free-icons"],
  tabler: ["@tabler/icons-react"],
  phosphor: ["@phosphor-icons/react"],
  remixicon: ["@remixicon/react"],
}
const appRoot = process.cwd()
const registryRoot = path.join(appRoot, "public/r")
const shadcn = path.join(appRoot, "node_modules/.bin/shadcn")

async function run(
  command: string,
  args: string[],
  cwd: string,
  declineOverwrites = false
) {
  const env = { ...process.env }
  for (const key of [
    "INIT_CWD",
    "npm_config_user_agent",
    "npm_config_workspace_dir",
    "npm_execpath",
    "npm_node_execpath",
  ])
    delete env[key]
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: declineOverwrites ? ["pipe", "pipe", "pipe"] : "inherit",
    })
    if (declineOverwrites) {
      const output = (chunk: Buffer, destination: NodeJS.WriteStream) => {
        destination.write(chunk)
        if (chunk.toString().includes("(y/N)")) child.stdin!.write("n\n")
        if (/Skipped \d+ files|Created \d+ files/.test(chunk.toString()))
          child.stdin!.end()
      }
      child.stdout!.on("data", (chunk) => output(chunk, process.stdout))
      child.stderr!.on("data", (chunk) => output(chunk, process.stderr))
    }
    child.on("error", reject)
    child.on("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`${command} exited with code ${code}`))
    )
  })
}

await run("pnpm", ["registry:build"], appRoot)
const catalog = (
  JSON.parse(await readFile(path.join(appRoot, "registry.json"), "utf8")) as {
    items: RegistryItem[]
  }
).items
const publicItems = catalog
  .filter(
    (item) =>
      item.categories?.includes("documents") && item.name !== "pdf-editor-core"
  )
  .map((item) => item.name)
assert(publicItems.includes("pdf-editor"))
const readItem = async (family: Family, name: string): Promise<RegistryItem> =>
  JSON.parse(
    await readFile(
      path.join(registryRoot, "bases", family, `${name}.json`),
      "utf8"
    )
  )

async function iconProbe(
  family: Family,
  library: keyof typeof iconLibraries
): Promise<RegistryItem> {
  const files = new Map<string, RegistryFile>()
  for (const definition of catalog) {
    for (const file of (await readItem(family, definition.name)).files ?? []) {
      if (
        file.target?.match(/^@components\/(extend|blocks)\//) &&
        file.content?.includes("IconPlaceholder")
      ) {
        files.set(file.target, {
          ...file,
          target: `@components/extend/icon-tests/${library}/${path.basename(file.target)}`,
        })
      }
    }
  }
  assert(files.size > 0)
  return {
    name: `icon-probe-${library}`,
    type: "registry:ui",
    files: [...files.values()],
    dependencies: iconLibraries[library],
  }
}

const server = createServer(async (request, response) => {
  try {
    const match = /^\/r\/styles\/([a-z0-9-]+)\/([a-z0-9-]+)\.json$/.exec(
      new URL(request.url ?? "/", "http://localhost").pathname
    )
    if (!match) {
      response.writeHead(404).end()
      return
    }
    const [, style, name] = match
    const family = getRegistryFamily(style)
    if (!family) {
      response.writeHead(404).end()
      return
    }
    const library = name.replace(
      "icon-probe-",
      ""
    ) as keyof typeof iconLibraries
    const item = name.startsWith("icon-probe-")
      ? await iconProbe(family, library)
      : await readItem(family, name)
    response
      .writeHead(200, { "Content-Type": "application/json" })
      .end(JSON.stringify(styleRegistryDependencies(item, style)))
  } catch (error) {
    response.writeHead(500).end(String(error))
  }
})
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
const address = server.address()
assert(address && typeof address === "object")
const registryUrl = `http://127.0.0.1:${address.port}/r/styles/{style}/{name}.json`
const fixtureRoot = await mkdtemp(path.join(os.tmpdir(), "extend-registry-"))
console.log(`Fixtures: ${fixtureRoot}`)

async function configure(directory: string, changes: Record<string, unknown>) {
  const filename = path.join(directory, "components.json")
  const config = JSON.parse(await readFile(filename, "utf8"))
  await writeFile(
    filename,
    JSON.stringify(
      { ...config, ...changes, registries: { "@extend": registryUrl } },
      null,
      2
    )
  )
}
async function checksum(filename: string) {
  return createHash("sha256")
    .update(await readFile(filename))
    .digest("hex")
}
async function primitiveHashes(directory: string) {
  const names = await readdir(path.join(directory, "src/components/ui"))
  return Object.fromEntries(
    await Promise.all(
      names.map(async (name) => [
        name,
        await checksum(path.join(directory, "src/components/ui", name)),
      ])
    )
  )
}

async function checkFamily(family: Family) {
  const items = await Promise.all(
    catalog.map((item) => readItem(family, item.name))
  )
  const byName = new Map(items.map((item) => [item.name, item]))
  for (const entry of publicItems) {
    const closure = new Map<string, RegistryItem>()
    const include = (name: string) => {
      if (closure.has(name)) return
      const item = byName.get(name)
      assert(item, `Missing registry dependency ${name}`)
      closure.set(name, item)
      for (const dependency of item.registryDependencies ?? []) {
        if (dependency.startsWith("@extend/"))
          include(dependency.slice("@extend/".length))
      }
    }
    include(entry)
    const dependencies = new Set(
      [...closure.values()].flatMap((item) => item.registryDependencies ?? [])
    )
    const packages = new Set(
      [...closure.values()]
        .flatMap((item) => item.dependencies ?? [])
        .map((name) => name.match(/^(@[^/]+\/[^@]+|[^@]+)/)![0])
    )
    const files = [...closure.values()].flatMap((item) => item.files ?? [])
    const modules = new Set(
      files.map((file) =>
        file.target
          ?.replace(/^@components\//, "@/components/")
          .replace(/^@lib\//, "@/lib/")
          .replace(/^@hooks\//, "@/hooks/")
          .replace(/\.[jt]sx?$/, "")
      )
    )
    for (const file of files) {
      assert(
        !file.target?.startsWith("@ui/"),
        `${entry} writes a consumer primitive`
      )
      const source = ts.createSourceFile(
        file.path,
        file.content ?? "",
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      )
      for (const statement of source.statements) {
        if (
          !ts.isImportDeclaration(statement) ||
          !ts.isStringLiteral(statement.moduleSpecifier)
        )
          continue
        const modulePath = statement.moduleSpecifier.text
        if (modulePath.startsWith("@/components/ui/"))
          assert(
            dependencies.has(modulePath.slice("@/components/ui/".length)),
            `${entry} lacks ${modulePath}`
          )
        else if (modulePath === "@/lib/utils")
          assert(dependencies.has("utils"), `${entry} lacks utils`)
        else if (
          modulePath.startsWith("@/") &&
          modulePath !== "@/components/icon-placeholder"
        )
          assert(modules.has(modulePath), `${entry} lacks ${modulePath}`)
        else if (!modulePath.startsWith(".") && !modulePath.startsWith("@/")) {
          const packageName = modulePath.startsWith("@")
            ? modulePath.split("/").slice(0, 2).join("/")
            : modulePath.split("/")[0]
          assert(
            ["react", "react-dom"].includes(packageName) ||
              packages.has(packageName),
            `${entry} lacks package ${packageName}`
          )
        }
      }
    }
  }
  for (const item of items) {
    for (const file of item.files ?? []) {
      if (!file.target?.match(/^@components\/(extend|blocks)\//)) continue
      assert(
        !file.content?.includes("ui-adapter"),
        `${item.name} must not use a UI adapter`
      )
      if (file.content?.match(/<Button[\s/>]/))
        assert.match(
          file.content,
          /import\s*{[^}]*\bButton\b[^}]*}\s*from\s*["']@\/components\/ui\/button["']/
        )
    }
    for (const style of styles) {
      const styled = styleRegistryDependencies(item, `${family}-${style}`)
      item.registryDependencies?.forEach((dependency, index) => {
        if (!dependency.startsWith("@") && !dependency.startsWith("http"))
          assert.equal(
            styled.registryDependencies?.[index],
            `https://ui.shadcn.com/r/styles/${family}-${style}/${dependency}.json`
          )
      })
    }
  }
  console.log(
    `PASS ${family}: individual dependency closures and direct primitive imports`
  )
  if (process.argv.includes("--artifacts-only")) return
  const primitives = [
    ...new Set(
      items
        .filter(
          (item) =>
            item.categories?.includes("documents") ||
            item.name.startsWith("document-")
        )
        .flatMap((item) => item.registryDependencies ?? [])
        .filter((name) => !name.startsWith("@") && !name.startsWith("http"))
    ),
  ]
  const name = `${family}-maia`
  const directory = path.join(fixtureRoot, name)
  await run(
    shadcn,
    [
      "create",
      "--template",
      "vite",
      "-b",
      family,
      "-p",
      "maia",
      "-n",
      name,
      "--no-monorepo",
      "-y",
    ],
    fixtureRoot
  )
  await configure(directory, {})
  await run(shadcn, ["add", ...primitives, "-y"], directory)
  const buttonPath = path.join(directory, "src/components/ui/button.tsx")
  await writeFile(
    buttonPath,
    `${await readFile(buttonPath, "utf8")}\nexport const consumerCustomization = true\n`
  )
  const before = await primitiveHashes(directory)
  const utilsBefore = await checksum(path.join(directory, "src/lib/utils.ts"))
  await run(
    shadcn,
    ["add", ...publicItems.map((name) => `@extend/${name}`), "-y"],
    directory,
    true
  )
  assert.deepEqual(
    await primitiveHashes(directory),
    before,
    "Consumer primitives were changed"
  )
  assert.equal(
    await checksum(path.join(directory, "src/lib/utils.ts")),
    utilsBefore,
    "Consumer utils were changed"
  )
  for (const library of Object.keys(iconLibraries)) {
    await configure(directory, { iconLibrary: library })
    await run(shadcn, ["add", `@extend/icon-probe-${library}`, "-y"], directory)
    const iconDirectory = path.join(
      directory,
      "src/components/extend/icon-tests",
      library
    )
    for (const filename of await readdir(iconDirectory))
      assert(
        !(await readFile(path.join(iconDirectory, filename), "utf8")).includes(
          "IconPlaceholder"
        ),
        `Unresolved icon in ${filename}`
      )
  }
  await writeFile(
    path.join(directory, "src/App.tsx"),
    'import { PDFEditor } from "./components/extend/pdf-editor"\nexport default function App() { return <PDFEditor src="/fixture.pdf" className="h-svh" defaultMode="annotate" persistSignatures={false} /> }\n'
  )
  await cp(
    path.join(appRoot, "public/samples/attention.pdf"),
    path.join(directory, "public/fixture.pdf")
  )
  await run("npm", ["run", "build"], directory)
  console.log(
    `PASS ${name}: all public components, all icon libraries, unchanged consumer primitives, production build`
  )
  if (process.env.EXTEND_SKIP_STYLE_MATRIX === "1") return
  const otherStyles = styles
    .filter((style) => style !== "maia")
    .map((style) => `${family}-${style}`)
  if (family === "radix") otherStyles.push("new-york", "new-york-v4")
  for (const style of otherStyles) {
    const styledDirectory = path.join(fixtureRoot, style)
    await cp(directory, styledDirectory, {
      recursive: true,
      filter: (source) =>
        !["node_modules", "dist", ".git"].includes(path.basename(source)),
    })
    await symlink(
      path.join(directory, "node_modules"),
      path.join(styledDirectory, "node_modules"),
      "dir"
    )
    await rm(path.join(styledDirectory, "src/components/ui"), {
      recursive: true,
    })
    await configure(styledDirectory, { style })
    await run(shadcn, ["add", ...primitives, "-y"], styledDirectory)
    await run("npx", ["tsc", "-b", "--force"], styledDirectory)
    console.log(`PASS ${style}: all public components and icon libraries`)
  }
}

try {
  const families = (["base", "radix"] as const).filter(
    (family) =>
      !process.env.EXTEND_FIXTURE_FAMILY ||
      process.env.EXTEND_FIXTURE_FAMILY === family
  )
  const results = await Promise.allSettled(families.map(checkFamily))
  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  )
  if (failures.length)
    throw new AggregateError(
      failures.map((result) => result.reason),
      "Registry fixture failures"
    )
} finally {
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  if (process.env.EXTEND_KEEP_FIXTURES !== "1")
    await rm(fixtureRoot, { recursive: true })
}
