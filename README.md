# Extend UI

Open source document components created by [Extend](https://www.extend.ai).
Extend UI gives product teams the building blocks for document processing
interfaces: PDF viewers, file uploads, thumbnails, citations, OCR blocks,
human review, document splitting, and e-signature flows.

![Extend UI document components](apps/v4/public/extend-ui-readme.png)

## Links

- Documentation: `http://localhost:4000`
- GitHub: [extend-hq/ui](https://github.com/extend-hq/ui)

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

## Development

```bash
pnpm install
pnpm v4:dev
```

The site runs at `http://localhost:4000`.

## Included Sections

- Docs
- Components
- Blocks
- PDF Viewer blocks

## Created By

Extend UI is built and maintained by [Extend](https://www.extend.ai) for teams
building modern document processing products.

## License

Licensed under the [MIT license](./LICENSE.md).
