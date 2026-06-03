"use client"

import * as React from "react"
import Link, { type LinkProps } from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { showMcpDocs } from "@/lib/flags"
import { getCurrentBase, getPagesFromFolder } from "@/lib/page-tree"
import { type source } from "@/lib/source"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/new-york-v4/ui/popover"

const TOP_LEVEL_SECTIONS = [
  { name: "Introduction", href: "/docs" },
  {
    name: "Components",
    href: "/docs/components",
  },
]
const EXCLUDED_PAGES = ["/docs"]

export function MobileNav({
  tree,
  items,
  className,
}: {
  tree: typeof source.pageTree
  items: { href: string; label: string }[]
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const currentBase = getCurrentBase(pathname)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "extend-touch-target h-8 touch-manipulation items-center justify-start gap-2.5 p-0! hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 active:bg-transparent dark:hover:bg-transparent",
            className
          )}
        >
          <div className="relative flex h-8 w-4 items-center justify-center">
            <div className="relative size-4">
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100",
                  open ? "top-[0.4rem] -rotate-45" : "top-1"
                )}
              />
              <span
                className={cn(
                  "absolute left-0 block h-0.5 w-4 bg-foreground transition-all duration-100",
                  open ? "top-[0.4rem] rotate-45" : "top-2.5"
                )}
              />
            </div>
            <span className="sr-only">Toggle Menu</span>
          </div>
          <span className="flex h-8 items-center text-lg leading-none font-medium">
            Menu
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="h-(--radix-popper-available-height) w-(--radix-popper-available-width) rounded-none border-none bg-background/90 p-0 shadow-none backdrop-blur duration-100 data-open:animate-none!"
        align="start"
        side="bottom"
        alignOffset={-16}
        sideOffset={14}
      >
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-12 px-6 py-6">
            <div className="flex flex-col gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Menu
              </div>
              <div className="flex flex-col gap-3">
                <MobileLink href="/" onOpenChange={setOpen}>
                  Home
                </MobileLink>
                {items.map((item, index) => (
                  <MobileLink
                    key={index}
                    href={item.href}
                    onOpenChange={setOpen}
                  >
                    {item.label}
                  </MobileLink>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-4">
              <div className="text-sm font-medium text-muted-foreground">
                Sections
              </div>
              <div className="flex flex-col gap-3">
                {TOP_LEVEL_SECTIONS.map(({ name, href }) => {
                  if (!showMcpDocs && href.includes("/mcp")) {
                    return null
                  }
                  return (
                    <MobileLink key={name} href={href} onOpenChange={setOpen}>
                      {name}
                    </MobileLink>
                  )
                })}
              </div>
            </div>
            <div className="flex flex-col gap-8">
              {tree?.children?.map((group, index) => {
                if (group.type === "folder") {
                  const pages = getPagesFromFolder(group, currentBase).filter(
                    (page) => {
                      if (!showMcpDocs && page.url.includes("/mcp")) {
                        return false
                      }

                      return !EXCLUDED_PAGES.includes(page.url)
                    }
                  )

                  if (pages.length === 0) {
                    return null
                  }

                  return (
                    <div key={index} className="flex flex-col gap-4">
                      <div className="text-sm font-medium text-muted-foreground">
                        {group.name}
                      </div>
                      <div className="flex flex-col gap-3">
                        {pages.map((item) => {
                          return (
                            <MobileLink
                              key={`${item.url}-${index}`}
                              href={item.url}
                              onOpenChange={setOpen}
                              className="flex items-center gap-2"
                            >
                              {item.name}
                            </MobileLink>
                          )
                        })}
                      </div>
                    </div>
                  )
                }
              })}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
  ...props
}: LinkProps & {
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
  className?: string
}) {
  const router = useRouter()
  return (
    <Link
      href={href}
      onClick={() => {
        router.push(href.toString())
        onOpenChange?.(false)
      }}
      className={cn("flex items-center gap-2 text-2xl font-medium", className)}
      {...props}
    >
      {children}
    </Link>
  )
}
