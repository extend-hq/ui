# PDF template

This site runs its own TypeScript source in the browser. There is no build:
change a file under `src/`, save it on the site, and reload the page.

## The data

- `document/<name>.pdf` is the document. Replace it to change the data;
  `<name>` uses only ASCII letters, numbers, dots, underscores and dashes,
  and starts with a letter or number. Annotations, form field values and
  page changes (such as rotating or removing pages) people make on the page
  are saved back to this file; the page's own text is not editable.
- `artifact.json` names it: `{"kind":"pdf","title":"…","file":"document/<name>.pdf"}`.
  `title` is the page title; `file` must point at the PDF.

## Where the parts are

All paths are under `src/`.

- `apps/v4/components/extend/pdf-editor.tsx`: the editor. `PDFEditor` sets
  up the engine and plugins; `PdfEditorInner` is the header, the toolbar
  (`PdfEditorZoomControl`, `PdfEditorSearchControl`, `PdfEditorModeSwitch`)
  and the pages, with the menus shown over a selection.
- `apps/v4/components/extend/pdf-editor-workspace.tsx`: the layout of the
  side panels around the pages.
- `apps/v4/components/extend/pdf-editor-panels.tsx`: the side panels
  (thumbnails, pages, outline, attachments, comments, forms, stamps,
  signatures, redactions).
- `apps/v4/components/extend/pdf-editor-properties.tsx`: the properties of
  the selected annotation or form field.
- `apps/v4/components/extend/pdf-editor-dialogs.tsx`: every dialog.
- `apps/v4/components/extend/pdf-editor-shared.tsx`: the editor's shared
  state and glyphs.
- `apps/v4/components/ui/`: buttons, menus, inputs and tabs.
- `apps/v4/experiments/artifact-template/src/main.tsx`: the page. It loads
  `artifact.json` and the editor; `autosave.ts` saves edits, and
  `pdf-engine.ts` starts the pdfium engine.
- `apps/v4/experiments/artifact-template/src/theme.css`: the page's colours.
  Tailwind classes work in any `.tsx` file.

## Rules

- A new file needs no registration: import it from an existing file (with
  `./`, `../` or `@/` for `apps/v4/`) and the page finds it.
- npm packages come prebuilt in `vendor/`; only the packages already imported
  are there. From `@hugeicons/core-free-icons`, use an icon the source already
  imports.
- Never edit `vendor/` (which holds the pdfium wasm), `loader.js`, `resolve.js` or
  `loader-manifest.json`. They are built with the template.
- After a change to any source file or stylesheet, the first reload rebuilds the CSS
  in the background, and new classes or rules show a moment later.
- If a file does not compile, the page shows the error with its file and line.
