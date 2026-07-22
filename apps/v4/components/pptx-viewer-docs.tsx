import { readFileSync } from "node:fs"
import { join } from "node:path"

import { DocsSourceCodeBlock } from "@/components/docs-code-block"

export { PptxViewerDemo } from "@/components/pptx-viewer-demo"

export function PptxViewerSource() {
  const code = readFileSync(
    join(process.cwd(), "components/ui/pptx-viewer.tsx"),
    "utf8"
  )

  return (
    <DocsSourceCodeBlock
      code={code}
      fileName="components/extend/pptx-viewer.tsx"
    />
  )
}
