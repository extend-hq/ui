# Spreadsheet template

This site runs its own TypeScript source in the browser. There is no build:
change a file under `src/`, save it on the site, and reload the page.

## The data

- `document/<name>.xlsx` is the workbook. Replace it to change the data.
  Edits people make on the page are saved back to this file.
- `artifact.json` names it: `{"kind":"xlsx","title":"…","file":"document/<name>.xlsx"}`.
  `title` is the page title; `file` must point at the workbook.

## Where the parts are

All paths are under `src/`.

- `apps/v4/components/extend/xlsx-editor.tsx`: the editor. `EditorToolbar`
  is the header, the ribbon, the name box and the formula bar;
  `XlsxEditorSurface` lays out the grid, the find bar, comment cards and the
  status bar under the sheet tabs.
- `apps/v4/components/extend/xlsx-viewer.tsx`: the sheet tabs
  (`WorkbookSheetTabs`) and the workbook surface the editor builds on.
- `apps/v4/components/ui/`: buttons, menus, inputs and tabs.
- `apps/v4/components/icon-placeholder.tsx`: the toolbar's icons.
- `engines/react-xlsx/packages/react-xlsx/src/`: the grid itself (drawing,
  selection, cell and formula input) and the calc worker.
- `apps/v4/experiments/artifact-template/src/main.tsx`: the page. It loads
  `artifact.json` and the editor; `autosave.ts` saves edits.
- `apps/v4/experiments/artifact-template/src/theme.css`: the page's colours.
  Tailwind classes work in any `.tsx` file.

## Rules

- A new file needs no registration: import it from an existing file (with
  `./`, `../` or `@/` for `apps/v4/`) and the page finds it.
- npm packages come prebuilt in `vendor/`; only the packages already imported
  are there. From `@hugeicons/core-free-icons`, use an icon the source already
  imports.
- Never edit `vendor/`, the `.wasm` file, `loader.js`, `resolve.js` or
  `loader-manifest.json`. They are built with the template.
- After a change to any source file or stylesheet, the first reload rebuilds the CSS
  in the background, and new classes or rules show a moment later.
- If a file does not compile, the page shows the error with its file and line.
