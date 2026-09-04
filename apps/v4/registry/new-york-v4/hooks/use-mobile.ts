import * as React from "react"

const MOBILE_QUERY = "(max-width: 767px)"

function subscribeToMobileQuery(listener: () => void) {
  const query = window.matchMedia(MOBILE_QUERY)
  query.addEventListener("change", listener)
  return () => query.removeEventListener("change", listener)
}

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribeToMobileQuery,
    () => window.matchMedia(MOBILE_QUERY).matches,
    () => false
  )
}
