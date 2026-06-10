# Extend UI

[Extend UI](https://www.extend.ai/ui) is a set of open-source components for
document agents, user-facing document flows, and internal tools.

![Extend UI document components](apps/v4/public/extend-ui-readme.png)

The library includes 14 components and examples for PDF, DOCX, and XLSX
viewers, plus bounding box citations, file upload, file thumbnails,
e-signature, document splitting, layout blocks, and Finder-style file browsing.
Components are fully customizable, MIT licensed, and available through the
shadcn component registry.

Extend UI started as the internal component layer for
[Extend](https://www.extend.ai). We built it after evaluating existing file
viewer and document component libraries and needing more complete, polished
building blocks for document-heavy products. The components are maintained in
production at Extend and are used across workflows that process millions of
pages, so fixes and improvements continue to flow back into the project.

Use Extend UI when you need document viewers, review surfaces, file-management
interfaces, or agent-facing document tools without starting from a generic
viewer library. Because each component is installed as source, it also works
well with design-system agents and prototyping tools that need editable React
and Tailwind code.

## Links

- Documentation: [https://www.extend.ai/ui](https://www.extend.ai/ui)
- GitHub: [extend-hq/ui](https://github.com/extend-hq/ui)
- Registry namespace: `@extend/*`

## Getting Started

Install a component with the shadcn CLI:

```bash
npx shadcn@latest add @extend/pdf-viewer
```

Then render the installed component from your app:

```tsx
import { PDFViewer } from "@/components/ui/pdf-viewer"

export default function Page() {
  return <PDFViewer file="/sample.pdf" className="h-[720px]" />
}
```

Extend UI components are copied into your project as source, so you can adapt
them to your app. Shared primitives such as `Button`, `Select`, `Dialog`,
`ScrollArea`, and `Tooltip` are expected to use the primitives your app already
has. If your project uses a different alias or design-system path, update the
generated imports to match, for example changing
`@/components/ui/button` or `@/components/ui/select` to your local primitive
paths. You can also set those aliases in `components.json` before installing so
new components are generated closer to your app structure.

## Examples

### File System

A Finder-style file browser for object-store manifests. It supports icon, list,
column, and gallery views, and opens PDF, DOCX, XLSX, and image files in viewer
dialogs.

![File System Finder component](apps/v4/public/readme/file-system-finder.png)

```bash
npx shadcn@latest add @extend/file-system-block
```

```tsx
import type { FileSystemItem } from "@/components/ui/file-system"
import { FileSystemBlock } from "@/components/blocks/file-system-block"

const items: FileSystemItem[] = [
  {
    kind: "file",
    path: "bank-statement.pdf",
    contentType: "application/pdf",
    url: "/documents/bank-statement.pdf",
    previewImageUrl: "/documents/bank-statement-preview.png",
  },
]

export default function Page() {
  return <FileSystemBlock items={items} className="h-[720px]" />
}
```

### Bounding Box Citations

Review extracted values against the source PDF with field-level citations,
editable form controls, JSON diffing, and page overlays.

![Bounding Box Citations component](apps/v4/public/readme/bounding-box-citations.png)

```bash
npx shadcn@latest add @extend/bounding-box-citations-block
```

```tsx
import { HumanReviewBlock } from "@/components/blocks/bounding-box-citations-block"

export default function Page() {
  return <HumanReviewBlock className="h-[720px]" />
}
```

### Layout Blocks

Inspect OCR and layout output with selectable blocks, confidence, markdown text,
and PDF overlays that stay connected to the rendered page.

![Layout Blocks component](apps/v4/public/readme/layout-blocks.png)

```bash
npx shadcn@latest add @extend/layout-blocks-block
```

```tsx
import { OcrBlocksBlock } from "@/components/blocks/layout-blocks-block"

export default function Page() {
  return <OcrBlocksBlock />
}
```

## Popular Components

```bash
npx shadcn@latest add @extend/pdf-viewer
npx shadcn@latest add @extend/docx-viewer
npx shadcn@latest add @extend/xlsx-viewer
npx shadcn@latest add @extend/file-upload
npx shadcn@latest add @extend/file-thumbnail
npx shadcn@latest add @extend/e-signature
```

## Development

```bash
pnpm install
pnpm v4:dev
```

The site runs at `http://localhost:4000`.

## Created By

Extend UI is built and maintained by [Extend](https://www.extend.ai) for teams
building modern document processing products.

## License

Licensed under the [MIT license](./LICENSE.md).
