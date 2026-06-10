export const UI_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/ui"

export function withUiBasePath(path: string) {
  if (!path.startsWith("/")) return path
  if (path === UI_BASE_PATH || path.startsWith(`${UI_BASE_PATH}/`)) {
    return path
  }

  return `${UI_BASE_PATH}${path}`
}
