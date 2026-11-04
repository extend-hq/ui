import * as React from "react"

const subscribe = () => () => {}

export function useMounted() {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}
