"use client"

import { DocsViewCodeBlock } from "@/components/docs-code-block"
import { SchemaBuilderPanel } from "@/components/extend/schema-builder"

export function SchemaBuilderDemo() {
  return (
    <div
      data-slot="component-preview"
      className="group relative mt-4 mb-12 flex flex-col overflow-hidden rounded-xl border"
    >
      <SchemaBuilderPanel className="h-[620px]" />
      <DocsViewCodeBlock code={schemaBuilderDemoCode} />
    </div>
  )
}

const schemaBuilderDemoCode = `import { SchemaBuilderPanel } from "@/components/extend/schema-builder";

export function SchemaBuilderExample() {
  return <SchemaBuilderPanel className="h-[620px]" />;
}`
