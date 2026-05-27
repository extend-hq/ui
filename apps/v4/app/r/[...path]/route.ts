import {
  loadRegistry,
  loadRegistryItem,
  RegistryItemNotFoundError,
} from "shadcn/registry"

export const dynamic = "force-dynamic"

type RegistryCatalog = Awaited<ReturnType<typeof loadRegistry>>
type RegistryItem = Awaited<ReturnType<typeof loadRegistryItem>>

function getRegistryItemNames(registry: RegistryCatalog) {
  return new Set(registry.items.map((item) => item.name))
}

function isExternalDependency(dependency: string) {
  return (
    dependency.startsWith("http://") ||
    dependency.startsWith("https://") ||
    dependency.startsWith("@")
  )
}

function rewriteLocalRegistryDependencies(
  item: RegistryItem,
  localItemNames: Set<string>,
  origin: string
) {
  if (!item.registryDependencies) return item

  return {
    ...item,
    registryDependencies: item.registryDependencies.map((dependency) =>
      !isExternalDependency(dependency) && localItemNames.has(dependency)
        ? `${origin}/r/${dependency}.json`
        : dependency
    ),
  }
}

function parseRegistryPath(pathSegments: string[]) {
  if (pathSegments.length !== 1) return null

  const [segment] = pathSegments

  if (segment === "registry.json") {
    return { type: "catalog" as const }
  }

  const match = /^([a-z0-9-]+)\.json$/.exec(segment)

  if (!match) return null

  return { name: match[1], type: "item" as const }
}

export async function GET(
  request: Request,
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
      return Response.json(await loadRegistry())
    }

    const [registry, item] = await Promise.all([
      loadRegistry(),
      loadRegistryItem(parsedPath.name),
    ])

    return Response.json(
      rewriteLocalRegistryDependencies(
        item,
        getRegistryItemNames(registry),
        new URL(request.url).origin
      )
    )
  } catch (error) {
    if (error instanceof RegistryItemNotFoundError) {
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
