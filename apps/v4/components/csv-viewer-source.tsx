import { readFileSync } from "node:fs"
import { join } from "node:path"

import { DocsSourceCodeBlock } from "@/components/docs-code-block"

export function CsvViewerSource() {
  const code = readFileSync(
    join(process.cwd(), "components/ui/csv-viewer.tsx"),
    "utf8"
  )

  return (
    <DocsSourceCodeBlock code={code} fileName="components/ui/csv-viewer.tsx" />
  )
}
