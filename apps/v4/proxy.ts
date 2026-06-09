import { NextResponse, type NextRequest } from "next/server"

const LEGACY_HOSTS = new Set(["ui.extend.ai"])
const CANONICAL_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://www.extend.ai/ui"

function stripPort(host: string) {
  return host.split(":")[0]?.toLowerCase()
}

function getCanonicalRedirectUrl(request: NextRequest) {
  const canonicalUrl = new URL(CANONICAL_URL)
  const canonicalBasePath = canonicalUrl.pathname.replace(/\/+$/, "")
  let pathname = request.nextUrl.pathname

  if (canonicalBasePath && pathname === canonicalBasePath) {
    pathname = ""
  } else if (
    canonicalBasePath &&
    pathname.startsWith(`${canonicalBasePath}/`)
  ) {
    pathname = pathname.slice(canonicalBasePath.length)
  } else if (pathname === "/") {
    pathname = ""
  }

  canonicalUrl.pathname = `${canonicalBasePath}${pathname}`
  canonicalUrl.search = request.nextUrl.search

  return canonicalUrl
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host")

  if (!host || !LEGACY_HOSTS.has(stripPort(host) ?? "")) {
    return NextResponse.next()
  }

  return NextResponse.redirect(getCanonicalRedirectUrl(request), 308)
}
