import { readFile } from "node:fs/promises"
import path from "node:path"

import {
  getRegistryFamily,
  styleRegistryDependencies,
} from "@/lib/registry-style"

export const dynamic = "force-dynamic"

type RegistryCatalog = {
  items: Array<{ name: string }>
  [key: string]: unknown
}

type RegistryItem = {
  name: string
  registryDependencies?: string[]
  [key: string]: unknown
}

class RegistryJsonNotFoundError extends Error {
  constructor(readonly fileName: string) {
    super(`Registry JSON file "${fileName}" was not found.`)
  }
}

const registryJsonCache = new Map<string, Promise<unknown>>()

function parseRegistryPath(pathSegments: string[]) {
  if (pathSegments.length === 3 && pathSegments[0] === "styles") {
    const [, style, segment] = pathSegments
    const match = /^([a-z0-9-]+)\.json$/.exec(segment)

    if (!match || !/^[a-z0-9-]+$/.test(style)) return null

    return { name: match[1], style, type: "item" as const }
  }

  if (pathSegments.length !== 1) return null

  const [segment] = pathSegments

  if (segment === "registry.json") {
    return { type: "catalog" as const }
  }

  const match = /^([a-z0-9-]+)\.json$/.exec(segment)

  if (!match) return null

  return { name: match[1], style: undefined, type: "item" as const }
}

function isFileNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  )
}

function getRegistryDirectories() {
  const cwd = process.cwd()

  return Array.from(
    new Set([
      path.join(cwd, "public", "r"),
      path.join(cwd, "apps", "v4", "public", "r"),
      path.join(cwd, ".registry", "r"),
      path.join(cwd, "apps", "v4", ".registry", "r"),
    ])
  )
}

async function readRegistryJson<T>(fileName: string): Promise<T> {
  for (const registryDirectory of getRegistryDirectories()) {
    try {
      const file = await readFile(
        path.join(registryDirectory, fileName),
        "utf8"
      )

      return JSON.parse(file) as T
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error
      }
    }
  }

  throw new RegistryJsonNotFoundError(fileName)
}

function loadBuiltRegistryJson<T>(fileName: string) {
  let jsonPromise = registryJsonCache.get(fileName) as Promise<T> | undefined

  if (!jsonPromise) {
    jsonPromise = readRegistryJson<T>(fileName)
    registryJsonCache.set(fileName, jsonPromise)
  }

  return jsonPromise
}

export async function GET(
  _request: Request,
  context: {
    params: Promise<{ path?: string[] }>
  }
) {
  const { path = [] } = await context.params
  const parsedPath = parseRegistryPath(path)

  if (!parsedPath) {
    return Response.json({ error: "Registry item not found." }, { status: 404 })
  }

  try {
    if (parsedPath.type === "catalog") {
      return Response.json(
        await loadBuiltRegistryJson<RegistryCatalog>("registry.json")
      )
    }

    const family = parsedPath.style ? getRegistryFamily(parsedPath.style) : null

    if (parsedPath.style && !family) {
      return Response.json(
        { error: `Registry style "${parsedPath.style}" is not supported.` },
        { status: 404 }
      )
    }

    const builtItem = await loadBuiltRegistryJson<RegistryItem>(
      family
        ? `bases/${family}/${parsedPath.name}.json`
        : `${parsedPath.name}.json`
    )
    const item = parsedPath.style
      ? styleRegistryDependencies(builtItem, parsedPath.style)
      : builtItem

    return Response.json(item)
  } catch (error) {
    if (error instanceof RegistryJsonNotFoundError) {
      return Response.json(
        {
          error:
            parsedPath.type === "item"
              ? `Registry item "${parsedPath.name}" was not found.`
              : "Registry catalog was not found.",
        },
        { status: 404 }
      )
    }

    console.error(error)

    return Response.json(
      { error: "Failed to load registry item." },
      { status: 500 }
    )
  }
}
