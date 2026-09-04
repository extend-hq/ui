import { spawnSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { format, resolveConfig } from "prettier"
import ts from "typescript"

import { inlineRegistrySupport } from "./inline-registry-support.mts"
import { transformRegistrySource } from "./registry-source.mts"
import { getRegistrySupport } from "./registry-support.mts"

type RegistryFile = {
  path: string
  target?: string
  content?: string
  type: string
}
type RegistryItem = {
  name: string
  categories?: string[]
  files?: RegistryFile[]
  dependencies?: string[]
  registryDependencies?: string[]
  [key: string]: unknown
}

const appRoot = process.cwd()
const outputRoot = path.join(appRoot, "public/r")
const sourceRoot = await mkdtemp(
  path.join(os.tmpdir(), "extend-registry-source-")
)
const formatOptions = await resolveConfig(path.join(appRoot, "package.json"))
const build = spawnSync(
  path.join(appRoot, "node_modules/.bin/shadcn"),
  ["build", "--output", sourceRoot],
  { stdio: "inherit" }
)
if (build.status !== 0) process.exit(build.status ?? 1)

const registry = JSON.parse(
  await readFile(path.join(appRoot, "registry.json"), "utf8")
) as { items: RegistryItem[] }
const manifest = JSON.parse(
  await readFile(path.join(appRoot, "package.json"), "utf8")
) as { dependencies: Record<string, string> }
const owners = new Map<string, string>()
for (const item of registry.items)
  for (const file of item.files ?? []) {
    const target = file.target
      ?.replace(/^@components\//, "@/components/")
      .replace(/^@lib\//, "@/lib/")
      .replace(/\.(tsx?|jsx?)$/, "")
    if (target && !target.startsWith("@/components/ui/"))
      owners.set(target, item.name)
  }

for (const family of ["base", "radix"] as const) {
  const support = await getRegistrySupport(appRoot, family)
  const directory = path.join(outputRoot, "bases", family)
  await mkdir(directory, { recursive: true })
  for (const definition of registry.items) {
    const item = JSON.parse(
      await readFile(path.join(sourceRoot, `${definition.name}.json`), "utf8")
    ) as RegistryItem
    const dependencies = new Set(item.dependencies)
    const registryDependencies = new Set(item.registryDependencies ?? [])
    const files: RegistryFile[] = []
    for (const file of item.files ?? []) {
      let content = file.content ?? ""
      if (item.name === "document-scroll-area")
        content = await readFile(
          path.join(
            appRoot,
            `registry/bases/${family}/document-scroll-area.tsx`
          ),
          "utf8"
        )
      if (item.name === "document-color-popover")
        content = await readFile(
          path.join(
            appRoot,
            `registry/bases/${family}/document-color-popover.tsx`
          ),
          "utf8"
        )
      if (item.name === "document-preview-card" && family === "radix")
        content = await readFile(
          path.join(appRoot, "registry/bases/radix/document-preview-card.tsx"),
          "utf8"
        )
      const isDocumentSource =
        file.target?.startsWith("@components/extend/") ||
        file.target?.startsWith("@components/blocks/")
      if (/\.[jt]sx?$/.test(file.path)) {
        if (
          isDocumentSource &&
          !["document-scroll-area", "document-color-popover"].includes(
            item.name
          )
        ) {
          content = transformRegistrySource(content, family)
        }
        content = inlineRegistrySupport(content, support)
        content = await format(content, {
          ...formatOptions,
          filepath: path.join(appRoot, file.path),
        })
      }
      const source = ts.createSourceFile(
        file.path,
        content,
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
          registryDependencies.add(modulePath.slice("@/components/ui/".length))
        else if (modulePath === "@/lib/utils") registryDependencies.add("utils")
        else if (owners.has(modulePath) && owners.get(modulePath) !== item.name)
          registryDependencies.add(`@extend/${owners.get(modulePath)}`)
        else if (!modulePath.startsWith("@/") && !modulePath.startsWith(".")) {
          const packageName = modulePath.startsWith("@")
            ? modulePath.split("/").slice(0, 2).join("/")
            : modulePath.split("/")[0]
          if (["react", "react-dom"].includes(packageName)) continue
          if (
            [...dependencies].some(
              (dependency) =>
                dependency === packageName ||
                dependency.startsWith(`${packageName}@`)
            )
          )
            continue
          const version = manifest.dependencies[packageName]
          if (!version)
            throw new Error(`Missing dependency version for ${packageName}`)
          dependencies.add(`${packageName}@${version}`)
        }
      }
      files.push({ ...file, content })
    }
    if (family === "radix" && item.name === "document-preview-card") {
      for (const dependency of dependencies)
        if (dependency.startsWith("@base-ui/")) dependencies.delete(dependency)
    }
    const result = {
      ...item,
      files,
      dependencies: [...dependencies],
      registryDependencies: [...registryDependencies],
    }
    await writeFile(
      path.join(directory, `${item.name}.json`),
      `${JSON.stringify(result, null, 2)}\n`
    )
  }
}

for (const definition of registry.items) {
  if (
    definition.categories?.includes("documents") ||
    definition.name.startsWith("document-") ||
    definition.name === "registry-icon-props"
  ) {
    await writeFile(
      path.join(outputRoot, `${definition.name}.json`),
      await readFile(
        path.join(outputRoot, "bases/base", `${definition.name}.json`)
      )
    )
  } else {
    await writeFile(
      path.join(outputRoot, `${definition.name}.json`),
      await readFile(path.join(sourceRoot, `${definition.name}.json`))
    )
  }
}

await rm(sourceRoot, { recursive: true, force: true })

console.log(
  "Built Base and Radix registry artifacts with direct primitive imports."
)
