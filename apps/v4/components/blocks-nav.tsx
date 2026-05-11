"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { ScrollArea, ScrollBar } from "@/registry/new-york-v4/ui/scroll-area"

const blockCategories = [
  { name: "Featured", slug: "" },
  { name: "Viewers", slug: "viewers" },
  { name: "Review", slug: "review" },
  { name: "Comparison", slug: "comparison" },
]

export function BlocksNav() {
  const pathname = usePathname()

  return (
    <div className="relative overflow-hidden">
      <ScrollArea className="max-w-none">
        <div className="flex items-center">
          <BlocksNavLink
            category={{ name: "Featured", slug: "" }}
            isActive={pathname === "/blocks"}
          />
          {blockCategories.slice(1).map((category) => (
            <BlocksNavLink
              key={category.slug}
              category={category}
              isActive={false}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>
    </div>
  )
}

function BlocksNavLink({
  category,
  isActive,
}: {
  category: (typeof blockCategories)[number]
  isActive: boolean
}) {
  return (
    <Link
      href={category.slug ? `/blocks#${category.slug}` : "/blocks"}
      key={category.slug}
      className="flex h-7 items-center justify-center px-4 text-center text-base font-medium text-muted-foreground transition-colors hover:text-primary data-[active=true]:text-primary"
      data-active={isActive}
    >
      {category.name}
    </Link>
  )
}
