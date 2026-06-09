import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { siteConfig } from "@/lib/config"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function absoluteUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`

  return `${siteConfig.url}${normalizedPath === "/" ? "" : normalizedPath}`
}

export function withBasePath(path: string): string {
  if (!siteConfig.basePath || !path.startsWith("/")) return path
  if (
    path === siteConfig.basePath ||
    path.startsWith(`${siteConfig.basePath}/`)
  ) {
    return path
  }

  return `${siteConfig.basePath}${path}`
}
