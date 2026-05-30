"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  ArrowDownLeft01Icon,
  ArrowRight01Icon,
  DashedLineIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useDocsSearch } from "fumadocs-core/search/client"

import { type ColorPalette } from "@/lib/colors"
import { siteConfig } from "@/lib/config"
import { trackEvent } from "@/lib/events"
import { showMcpDocs } from "@/lib/flags"
import { getCurrentBase, getPagesFromFolder } from "@/lib/page-tree"
import { type source } from "@/lib/source"
import { cn } from "@/lib/utils"
import { useConfig } from "@/hooks/use-config"
import { useMutationObserver } from "@/hooks/use-mutation-observer"
import { Button } from "@/components/ui/button"
import { copyToClipboardWithMeta } from "@/components/copy-button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/new-york-v4/ui/command"
import {
  DialogContent as BaseDialogContent,
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/new-york-v4/ui/dialog"
import { Separator } from "@/registry/new-york-v4/ui/separator"
import { Spinner } from "@/registry/new-york-v4/ui/spinner"

function getRegistryItemUrl(name: string) {
  return `${siteConfig.url}/r/${name}.json`
}

function getShadcnAddCommand(
  packageManager: "npm" | "yarn" | "pnpm" | "bun",
  itemName: string
) {
  const itemUrl = getRegistryItemUrl(itemName)

  if (packageManager === "npm") return `npx shadcn@latest add ${itemUrl}`
  if (packageManager === "bun") return `bunx --bun shadcn@latest add ${itemUrl}`

  return `${packageManager} dlx shadcn@latest add ${itemUrl}`
}

export function CommandMenu({
  tree,
  colors: _colors,
  blocks,
  navItems,
  ...props
}: React.ComponentProps<typeof Dialog> & {
  tree: typeof source.pageTree
  colors: ColorPalette[]
  blocks?: { name: string; description: string; categories: string[] }[]
  navItems?: { href: string; label: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [config] = useConfig()
  const currentBase = getCurrentBase(pathname)
  const [open, setOpen] = React.useState(false)
  const [renderDelayedGroups, setRenderDelayedGroups] = React.useState(false)
  const [selectedType, setSelectedType] = React.useState<
    "page" | "component" | "block" | null
  >(null)
  const [copyPayload, setCopyPayload] = React.useState("")

  const { search, setSearch, query } = useDocsSearch({
    type: "fetch",
  })
  const packageManager = config.packageManager || "pnpm"

  // Track search queries with debouncing to avoid excessive tracking.
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)
  const lastTrackedQueryRef = React.useRef<string>("")

  const trackSearchQuery = React.useCallback((query: string) => {
    const trimmedQuery = query.trim()

    // Only track if the query is different from the last tracked query and has content.
    if (trimmedQuery && trimmedQuery !== lastTrackedQueryRef.current) {
      lastTrackedQueryRef.current = trimmedQuery
      trackEvent({
        name: "search_query",
        properties: {
          query: trimmedQuery,
          query_length: trimmedQuery.length,
        },
      })
    }
  }, [])

  const handleSearchChange = React.useCallback(
    (value: string) => {
      // Clear existing timeout.
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }

      // Set new timeout to debounce both search and tracking.
      searchTimeoutRef.current = setTimeout(() => {
        React.startTransition(() => {
          setSearch(value)
          trackSearchQuery(value)
        })
      }, 500)
    },
    [setSearch, trackSearchQuery]
  )

  // Cleanup timeout on unmount.
  React.useEffect(() => {
    if (open) {
      const frame = requestAnimationFrame(() => {
        setRenderDelayedGroups(true)
      })

      return () => {
        cancelAnimationFrame(frame)
      }
    }

    setRenderDelayedGroups(false)
  }, [open])

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  const commandFilter = React.useCallback(
    (value: string, searchValue: string, keywords?: string[]) => {
      const extendValue = value + " " + (keywords?.join(" ") || "")
      if (extendValue.toLowerCase().includes(searchValue.toLowerCase())) {
        return 1
      }
      return 0
    },
    []
  )

  const handlePageHighlight = React.useCallback(
    (isComponent: boolean, item: { url: string; name?: React.ReactNode }) => {
      if (isComponent) {
        const componentName = item.url.split("/").pop()
        setSelectedType("component")
        setCopyPayload(
          componentName
            ? getShadcnAddCommand(packageManager, componentName)
            : ""
        )
      } else {
        setSelectedType("page")
        setCopyPayload("")
      }
    },
    [packageManager, setSelectedType, setCopyPayload]
  )

  const handleBlockHighlight = React.useCallback(
    (block: { name: string; description: string; categories: string[] }) => {
      setSelectedType("block")
      setCopyPayload(getShadcnAddCommand(packageManager, block.name))
    },
    [setSelectedType, setCopyPayload, packageManager]
  )

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  const navItemsSection = React.useMemo(() => {
    if (!navItems || navItems.length === 0) {
      return null
    }

    return (
      <CommandGroup
        heading="Pages"
        className="p-0! **:data-[slot=command-group-label]:scroll-mt-16 **:data-[slot=command-group-label]:p-3! **:data-[slot=command-group-label]:pb-1!"
      >
        {navItems.map((item) => (
          <CommandMenuItem
            key={item.href}
            value={`Navigation ${item.label}`}
            keywords={["nav", "navigation", item.label.toLowerCase()]}
            onHighlight={() => {
              setSelectedType("page")
              setCopyPayload("")
            }}
            onSelect={() => {
              runCommand(() => router.push(item.href))
            }}
          >
            <HugeiconsIcon icon={ArrowRight01Icon} />
            {item.label}
          </CommandMenuItem>
        ))}
      </CommandGroup>
    )
  }, [navItems, runCommand, router])

  const pageGroupsSection = React.useMemo(() => {
    return tree.children.map((group) => {
      if (group.type !== "folder") {
        return null
      }

      const pages = getPagesFromFolder(group, currentBase).filter((item) => {
        if (!showMcpDocs && item.url.includes("/mcp")) {
          return false
        }

        return true
      })

      if (pages.length === 0) {
        return null
      }

      return (
        <CommandGroup
          key={group.$id}
          heading={group.name}
          className="p-0! **:data-[slot=command-group-label]:scroll-mt-16 **:data-[slot=command-group-label]:p-3! **:data-[slot=command-group-label]:pb-1!"
        >
          {pages.map((item) => {
            const isComponent = item.url.includes("/components/")

            return (
              <CommandMenuItem
                key={item.url}
                value={
                  item.name?.toString() ? `${group.name} ${item.name}` : ""
                }
                keywords={isComponent ? ["component"] : undefined}
                onHighlight={() => handlePageHighlight(isComponent, item)}
                onSelect={() => {
                  runCommand(() => router.push(item.url))
                }}
              >
                {isComponent ? (
                  <div className="aspect-square size-4 rounded-full border border-dashed border-muted-foreground" />
                ) : (
                  <HugeiconsIcon icon={ArrowRight01Icon} />
                )}
                {item.name}
              </CommandMenuItem>
            )
          })}
        </CommandGroup>
      )
    })
  }, [tree.children, currentBase, handlePageHighlight, runCommand, router])

  const blocksSection = React.useMemo(() => {
    if (!blocks || blocks.length === 0) {
      return null
    }

    return (
      <CommandGroup
        heading="Blocks"
        className="p-0! **:data-[slot=command-group-label]:p-3!"
      >
        {blocks.map((block) => (
          <CommandMenuItem
            key={block.name}
            value={block.name}
            onHighlight={() => {
              handleBlockHighlight(block)
            }}
            keywords={[
              "block",
              block.name,
              block.description,
              ...block.categories,
            ]}
            onSelect={() => {
              runCommand(() =>
                router.push(`/blocks/${block.categories[0]}#${block.name}`)
              )
            }}
          >
            <HugeiconsIcon icon={DashedLineIcon} />
            {block.description}
            <span className="ml-auto font-mono text-xs font-normal text-muted-foreground tabular-nums">
              {block.name}
            </span>
          </CommandMenuItem>
        ))}
      </CommandGroup>
    )
  }, [blocks, handleBlockHighlight, runCommand, router])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (
          (e.target instanceof HTMLElement && e.target.isContentEditable) ||
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          e.target instanceof HTMLSelectElement
        ) {
          return
        }

        e.preventDefault()
        setOpen((open) => !open)
      }

      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        runCommand(() => {
          if (selectedType === "block") {
            copyToClipboardWithMeta(copyPayload, {
              name: "copy_npm_command",
              properties: { command: copyPayload, pm: packageManager },
            })
          }

          if (selectedType === "page" || selectedType === "component") {
            copyToClipboardWithMeta(copyPayload, {
              name: "copy_npm_command",
              properties: { command: copyPayload, pm: packageManager },
            })
          }
        })
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [copyPayload, runCommand, selectedType, packageManager])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "relative h-8 w-full justify-start rounded-lg pl-3 font-normal text-foreground shadow-none hover:bg-muted/50 sm:pr-12 md:w-48 lg:w-40 xl:w-64 dark:bg-card"
          )}
          onClick={() => setOpen(true)}
          {...props}
        >
          <span className="hidden xl:inline-flex">Search documentation...</span>
          <span className="inline-flex xl:hidden">Search...</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-xl border-none bg-popover bg-clip-padding p-2 pb-11 shadow-2xl ring-4 ring-border/80">
        <DialogHeader className="sr-only">
          <DialogTitle>Search documentation...</DialogTitle>
          <DialogDescription>Search for a command to run...</DialogDescription>
        </DialogHeader>
        <Command
          className="rounded-none bg-transparent **:data-[slot=command-input]:h-9! **:data-[slot=command-input]:py-0 **:data-[slot=command-input-wrapper]:mb-0 **:data-[slot=command-input-wrapper]:h-9! **:data-[slot=command-input-wrapper]:rounded-md **:data-[slot=command-input-wrapper]:border **:data-[slot=command-input-wrapper]:border-input **:data-[slot=command-input-wrapper]:bg-input/50"
          filter={commandFilter}
        >
          <div className="relative">
            <CommandInput
              placeholder="Search documentation..."
              onValueChange={handleSearchChange}
            />
            {query.isLoading && (
              <div className="pointer-events-none absolute top-1/2 right-3 z-10 flex -translate-y-1/2 items-center justify-center">
                <Spinner className="size-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <CommandList className="no-scrollbar min-h-80 scroll-pt-2 scroll-pb-1.5">
            <CommandEmpty className="py-12 text-center text-sm text-muted-foreground">
              {query.isLoading ? "Searching..." : "No results found."}
            </CommandEmpty>
            {navItemsSection}
            {renderDelayedGroups ? (
              <>
                {pageGroupsSection}
                {blocksSection}
                <SearchResults
                  setOpen={setOpen}
                  query={query}
                  search={search}
                />
              </>
            ) : null}
          </CommandList>
        </Command>
        <div className="absolute inset-x-0 bottom-0 z-20 flex h-10 items-center gap-2 rounded-b-xl border-t border-t-border bg-muted px-4 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-2">
            <CommandMenuKbd>
              <HugeiconsIcon icon={ArrowDownLeft01Icon} />
            </CommandMenuKbd>{" "}
            {selectedType === "page" || selectedType === "component"
              ? "Go to Page"
              : null}
          </div>
          {copyPayload && (
            <>
              <Separator orientation="vertical" className="h-4!" />
              <div className="flex items-center gap-1">
                <CommandMenuKbd>⌘</CommandMenuKbd>
                <CommandMenuKbd>C</CommandMenuKbd>
                {copyPayload}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CommandMenuItem({
  children,
  className,
  onHighlight,
  ...props
}: React.ComponentProps<typeof CommandItem> & {
  onHighlight?: () => void
  "data-selected"?: string
  "aria-selected"?: string
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  useMutationObserver(ref, (mutations) => {
    mutations.forEach((mutation) => {
      if (
        mutation.type === "attributes" &&
        (mutation.attributeName === "data-selected" ||
          mutation.attributeName === "aria-selected") &&
        (ref.current?.getAttribute("data-selected") === "true" ||
          ref.current?.getAttribute("aria-selected") === "true")
      ) {
        onHighlight?.()
      }
    })
  })

  return (
    <CommandItem
      ref={ref}
      className={cn(
        "h-9 rounded-md border border-transparent px-3! font-medium data-[selected=true]:border-input data-[selected=true]:bg-input/50",
        className
      )}
      {...props}
    >
      {children}
    </CommandItem>
  )
}

function CommandMenuKbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "pointer-events-none flex h-5 items-center justify-center gap-1 rounded border bg-background px-1 font-sans text-[0.7rem] font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3",
        className
      )}
      {...props}
    />
  )
}

type Query = Awaited<ReturnType<typeof useDocsSearch>>["query"]

function SearchResults({
  setOpen,
  query,
  search,
}: {
  setOpen: (open: boolean) => void
  query: Query
  search: string
}) {
  const router = useRouter()

  const uniqueResults = React.useMemo(() => {
    if (!query.data || !Array.isArray(query.data)) {
      return []
    }

    return query.data.filter(
      (item, index, self) =>
        !(
          item.type === "text" && item.content.trim().split(/\s+/).length <= 1
        ) && index === self.findIndex((t) => t.content === item.content)
    )
  }, [query.data])

  if (!search.trim()) {
    return null
  }

  if (!query.data || query.data === "empty") {
    return null
  }

  if (query.data && uniqueResults.length === 0) {
    return null
  }

  return (
    <CommandGroup
      className="px-0! **:data-[slot=command-group-label]:scroll-mt-16 **:data-[slot=command-group-label]:p-3! **:data-[slot=command-group-label]:pb-1!"
      heading="Search Results"
    >
      {uniqueResults.map((item) => {
        return (
          <CommandItem
            key={item.id}
            data-type={item.type}
            onSelect={() => {
              router.push(item.url)
              setOpen(false)
            }}
            className="h-9 rounded-md border border-transparent px-3! font-normal data-[selected=true]:border-input data-[selected=true]:bg-input/50"
            keywords={[item.content]}
            value={`${item.content} ${item.type}`}
          >
            <div className="line-clamp-1 text-sm">{item.content}</div>
          </CommandItem>
        )
      })}
    </CommandGroup>
  )
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof BaseDialogContent> & {
  showCloseButton?: boolean
}) {
  return (
    <BaseDialogContent
      bottomStickOnMobile={false}
      className={cn("gap-4 p-6 sm:max-w-lg", className)}
      data-slot="dialog-content"
      showCloseButton={false}
      {...props}
    >
      {children}
    </BaseDialogContent>
  )
}
