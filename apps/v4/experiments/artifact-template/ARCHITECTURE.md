# Office artifact template: build and edge delivery

This is the implementation reference for the DOCX, XLSX, PPTX, and PDF artifact
experiment. RuntimeVM is a separate repository; this experiment does not
change it. Its artifact service was last reviewed on 2026-10-16 at
[`ff898d1`](https://github.com/The-Money-Company-Limited/runtimevm/tree/ff898d124b08dcfb47a0ca06ddebc63fe1ee5d8b);
[`artifact-computers.md`](https://github.com/The-Money-Company-Limited/runtimevm/blob/ff898d124b08dcfb47a0ca06ddebc63fe1ee5d8b/backend/docs/artifact-computers.md) there is the
source of truth for how a published site is served.

## What is built

One Vite build produces a reusable static browser app. It contains React,
styles, editor code, and the WASM needed by the spreadsheet and PDF editors.
The [Vite config](./vite.config.ts) emits relative URLs (`base: "./"`), so the
same build can be copied into separate releases. The app
[loads `artifact.json`](./src/main.tsx) at startup, selects the editor by
`kind`, then loads the document from `./document/<filename>`. Editor modules
are lazy loaded by file type; the release still includes all four.

| Format | Browser component                                                                     | Current capability                                                                                 |
| ------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| DOCX   | [`docx-editor.tsx`](../../components/extend/docx-editor.tsx), `@extend-ai/react-docx` | Edit and export DOCX                                                                               |
| XLSX   | [`xlsx-editor.tsx`](../../components/extend/xlsx-editor.tsx), `@extend-ai/react-xlsx` | Edit and export XLSX; files above 5 MiB open read-only                                             |
| PPTX   | [`pptx-viewer.tsx`](../../components/extend/pptx-viewer.tsx), `@extend-ai/react-pptx` | View and download the original; no slide editing                                                   |
| PDF    | [`pdf-editor.tsx`](../../components/extend/pdf-editor.tsx), EmbedPDF and PDFium       | Annotate, fill forms, sign, redact, change pages, and download; no arbitrary existing-text editing |

The XLSX and PDF WASM URLs are set in
[`xlsx-artifact.tsx`](./src/xlsx-artifact.tsx) and
[`pdf-engine.ts`](./src/pdf-engine.ts). Their computation happens in the
visitor's browser. A browser Web Worker is a client-side thread; it is not a
Cool Computer VM or a Cloudflare Worker. Some optional PDF fonts and stamps
may fetch external resources, so a fully self-contained/offline release is not
yet guaranteed.

## Make a release

A spreadsheet, PDF or slides release is source, not this bundle: see
[Spreadsheet, PDF and slides releases are source](#spreadsheet-pdf-and-slides-releases-are-source). The
steps below are the same for it, and its files are listed there.

From the repository root, with Node and pnpm installed:

```sh
pnpm install
pnpm --filter v4 artifact-template:build
pnpm --filter v4 artifact-template:stage /absolute/path/to/report.xlsx /absolute/path/to/new-release-directory
cool publish /absolute/path/to/new-release-directory --name example
```

`artifact-template:build` runs Vite and writes the **bundle**: everything a
release needs except the document. The [`stage.mjs`](./stage.mjs) script copies
the bundle into a **new** directory, adds one input file, and writes the two
per-document files. Use a fresh output directory per artifact. Run the build
again after changing editor source.

```text
new-release-directory/
  index.html
  assets/...               # Vite JS, CSS, WASM, and related assets
  template.json            # bundle: {"template":"office","version":"<git describe>","engines":{…}}
  document/report.xlsx     # document: original uploaded bytes
  artifact.json            # document: {"kind":"xlsx","title":"report.xlsx","file":"document/report.xlsx"}
  cool.json                # document: {"spa":false}
```

`template.json` is written by the build and never by staging, so every release
staged from one build names the same bundle version. `version` is
`git describe --always --dirty` of this repository at build time, and
`engines` names each bundled engine: the fork commit when it is linked from a
checkout, else its npm version. A `-dirty` version is a local build and is not
meant for publishing.

The supported input extensions are `.docx`, `.xlsx`, `.pptx`, and `.pdf`.
Staging requires a regular file with an ASCII basename that uses letters,
digits, dots, underscores, or dashes. It checks a 25 MiB maximum per file,
20,000 files, and 1 GiB total, RuntimeVM's authenticated release bounds in
[`files.go`](https://github.com/The-Money-Company-Limited/runtimevm/blob/ff898d124b08dcfb47a0ca06ddebc63fe1ee5d8b/backend/internal/artifacts/files.go).
Publishing without an account has lower limits; use an authenticated account
for this workflow. The stage command removes a new output directory if it
fails. The generated `cool.json` has no `run`, `functions`, or `secrets`.

Every file type the bundle emits (`.html`, `.js`, `.css`, `.wasm`, `.json`) and
the four document types are in RuntimeVM's pinned content-type table
([`siteasset.go`](https://github.com/The-Money-Company-Limited/runtimevm/blob/ff898d124b08dcfb47a0ca06ddebc63fe1ee5d8b/infra/runtime-image/frontdoor/siteasset/siteasset.go)),
and no bundle path is hidden from serving (no leading `.`, no `node_modules`).
The bundle is about 19 MiB in 30 files, mostly the XLSX and PDF engines.

## Spreadsheet, PDF and slides releases are source

A spreadsheet, PDF or slides release holds the template's real TSX/TS files, so an agent
that copies the site (`cool copy`) changes the editor by editing a file, with
no build anywhere. `pnpm --filter v4 artifact-template:build` also runs
[`source/build.mjs`](./source/build.mjs) once per kind, which writes
`dist-xlsx/`, `dist-pdf/` and `dist-slides/`, each with only its own
editor's source;
`stage.mjs` copies it and adds the document as for the other kinds:

```text
index.html               # the template's index.html, running loader.js
loader.js, resolve.js    # fetch, compile, cache, link and run src/**
loader-manifest.json     # entry, worker, aliases, files, vendor and CSS names
src/apps/v4/...          # the page and editor source, at repository paths
src/engines/react-xlsx/packages/react-xlsx/...   # a spreadsheet release: the grid, and its calc wasm
vendor/vendor-*.js       # npm packages, prebuilt; vendor-worker-*.js for the worker
vendor/pdfium-*.wasm     # a PDF release: pdfium, from npm (its ?url import has an alias)
vendor/compiler-*.js     # sucrase and compile.js, for the loader's workers
vendor/tailwind-*.js     # Tailwind and postcss-nested, for a CSS rebuild
vendor/app-*.css         # the CSS for first paint; vendor/css/ Tailwind's own
template.md              # for an agent: where the data and each UI part are (source/template-<kind>.md)
template.json, artifact.json, cool.json, document/<file>
```

[`loader.js`](./source/loader.js) revalidates every source file with
If-None-Match and compiles the changed ones with sucrase in up to four
workers ([`compile.js`](./source/compile.js), a pure function of the source).
Then it links the imports afresh against the files the site has now
([`resolve.js`](./source/resolve.js), the same `link` the build uses) and
runs one script per entry: the page and, for a spreadsheet, the calc worker. A local import that
names no listed file is looked for on the site on every load, so a new file
needs no manifest entry, and uploading a missing file fixes the next load.

The cache holds only immutable entries: a file's compiled code and import
specifiers under its path and ETag, the built CSS under a hash of its inputs,
and the content-named `vendor/` files. Two tabs cannot corrupt each other,
and a reverted file finds its old entry. Each path's last ETag is kept as an
If-None-Match hint; a stale hint costs a download, never wrong code. Cache
Storage works under `no-store`, so a warm load of a private site transfers
only 304s. Every npm package's whole namespace is in `vendor/`, except the
icon pack, which holds the icons the source imports; a package runs the
first time a module requires it.

The CSS is built by [`tailwind.js`](./source/tailwind.js) from the
stylesheets the modules import (Tailwind resolves their `@import`s) and the
classes in the compiled modules. Its key hashes every module's and
stylesheet's content; the build ships the CSS for its own key, and when the
key differs the page shows the shipped CSS while it rebuilds in a worker,
then keeps the result under that key. Both flatten Tailwind's nested
variants with postcss-nested; Chrome lays out the editor several times
slower with nested rules.

RuntimeVM's content-type table has no `.ts` or `.tsx`, so those files are
served without a type. The loader reads them as text, so this costs only
transfer: an untyped response is not compressed.

## How a request reaches the editor, with no computer VM

```text
Agent's local DOCX/XLSX/PPTX/PDF + this Vite build
  -> stage a complete static release
  -> Cool publish API: validate, store content-addressed bytes in R2, write the release index
  -> *.cool.computer gateway: read the slug's edge route, check access
  -> gateway Release entrypoint: resolve the path in the release index, stream the file from R2
  -> visitor's browser: load artifact.json, then the document; edit, export/download
```

A static release makes **no Cloudflare deploy**. Publishing stores each file
once in R2 under the computer, keyed by its sha256, and writes one immutable
release index (path to R2 key, ETag, content type). The gateway Worker serves
every file from that index, through Workers Cache, after its access check. Only
a release that declares `functions` deploys a Workers for Platforms script.
`cool.json` is read as release configuration and never served. `"spa":false`
answers missing paths with a 404 instead of the editor shell.

For an HTML page, the gateway also injects the site comment layer's script
while the computer's comments switch is on (it is on by default). The layer
anchors a note to a clicked DOM element. The XLSX and PDF editors draw on
canvases, so they lay transparent DOM over them for the layer to name (see
[Page rules](#page-rules-that-keep-comments-and-ink-anchored)).

There is **no per-document Linux VM**. The publish service and the gateway run
server-side; the browser does the document work. A computer gains a VM only
through an explicit Linux use or a release that declares `run`, and this
template does neither. If the computer later gains a VM, its site moves there
with the same files and URL.

## How an agent changes a published document

Releases are immutable; every change is a new release with its own URL
`r<n>--<slug>` while it is among the newest 20, so a rollback is instant.

- **Republish**: stage again with the new document and
  `cool publish <dir> --computer <slug>`. Unchanged bundle files are not uploaded
  again, because content is addressed by hash.
- **Replace one file**: on a computer without a VM, the files API
  (`cool files`) and the RuntimeVM operator's `write` tool publish a release
  with one file changed, under the computer's publish claim, so concurrent
  writes line up. An agent replaces `document/<file>` and leaves the bundle and
  `artifact.json` alone. The operator reads site files up to 6 MiB.

The app fetches `artifact.json` with `no-store`; the document's URL and ETag
change with the release, so a reload shows the new release.

## Contract for a later artifact template feature

A RuntimeVM "templated artifact" composes two parts into one ordinary release:

1. **Bundle**: this build's output, identified by `template.json`. The
   platform keeps each version it offers, unchanged.
2. **Document**: `document/<file>`, `artifact.json`, and `cool.json`, as
   [`stage.mjs`](./stage.mjs) writes them. Its checks (kind from the extension,
   the file-name grammar, size limits) are the composition rules to port.

No RuntimeVM change is needed to publish a composed release; the release is
exactly what `stage.mjs` produces. What a platform-side feature adds is
choosing a bundle version and composing on the server, so an upload of
`report.xlsx` alone becomes an artifact. Existing releases keep the bundle they
were published with; moving an artifact to a newer bundle is a new release.

Browser edits save through the page bridge as a new release, with access
and version checks performed by the platform. Public releases expose the
document to visitors; use the computer's private access setting when the document should
be restricted. `artifact.json` is fetched by every visitor, so it holds no
secrets.

## Review loop: Comments, Ink, and suggestions

The document is the truth; the page only shows it. Two review systems each do
one job, and together they make one loop:

```text
person on the published page --Comments / Ink (RuntimeVM layer)--> owner's agent
owner's agent --tracked changes + Office comments in the file--> new release
person in the editor --accept / reject / reply--> exported or saved file
```

- **Comments and Ink are RuntimeVM's**, injected by the gateway into the
  page. They are how people point at the document and talk to the agent. The
  template never ships a comment layer of its own, never copies the injected
  `<script src="/__cool/comments.js">` into its files, and runs as a top-level
  tab, never in an iframe (RuntimeVM COD-1403, COD-1415).
- **Suggestions are the file's.** The agent answers by changing the document:
  DOCX tracked changes (`w:ins`/`w:del`, on text and on paragraph marks) and
  comments (`comments.xml`), XLSX threaded comments. They round-trip through Word and Excel, and the editor
  shows them for accept, reject, and reply.

### Page rules that keep Comments and Ink anchored

RuntimeVM's layer stores a click comment as a CSS selector, the element's
text, and a box in percent of the page; Ink stores page-pixel paths, the
elements under them, and the author's screen size
([contract](https://github.com/The-Money-Company-Limited/runtimevm/blob/ff898d124b08dcfb47a0ca06ddebc63fe1ee5d8b/backend/comments/contract.json)).
It re-finds elements by selector, follows window scroll for Ink, and has no
API for a page to report its own anchor. So the page itself is anchorable;
each rule is an opt-in prop on the editor that the template turns on:

1. **The document scrolls the window** (`scrollsWindow`). Toolbars are
   sticky; nothing between the page and the document scrolls or clips. The
   XLSX grid drives its scroll offset from the window (`scrollTarget="window"`
   in the engine), PPTX virtualizes against the window, and PDF feeds
   EmbedPDF's viewport from the window.
2. **Every unit has a stable, unique `id`**, which ends the layer's selector
   walk: DOCX pages `page-<n>` and paragraphs `p-<w14:paraId>` (the model
   carries `paraId` through edits; `p-n<index>` only for a paragraph without
   one, and the agent stamps a `paraId` on every paragraph it saves); PDF
   pages `page-<n>`, each holding its text as transparent lines from PDFium
   that take pointer hits; PPTX slides `slide-<n>` on the slide's list row, present
   while the slide is virtualized away; XLSX cells `c-<ref>` on a transparent
   DOM layer over the canvas (`cellAnchorIdPrefix`) that carries each visible
   cell's text and passes pointer events to the grid.
3. **DOCX opens in Viewing.** The layer records no text for an element that
   is or contains `contenteditable` (even `="false"`), so read-only rendering
   writes no `contenteditable` attribute. Suggesting and Editing are explicit
   modes, as in Google Docs.
4. **Typing goes through a text field.** The XLSX grid reads keys from a
   hidden `textarea`, so the layer's plain `C` shortcut does not take keys
   from the grid.
5. **The page's identity is its path plus query.** A sheet is `?sheet=<name>`,
   so each sheet has its own comments.
6. **Pages keep a fixed width.** Ink is shown only to viewers whose window is
   within 15% of the author's width.

Verified on 2026-10-16, locally with [`dev/comments-harness.mjs`](./dev/comments-harness.mjs)
and on cool.computer: a DOCX click comment anchors at `#p-n1` with the
paragraph's text; Ink under a title records `line: "under"` and the title's
text; Ink on a sheet records `#c-D10` and `#c-E10` with their values; PPTX Ink
records `#slide-1 > …` and the title text; a PDF click comment anchors inside
`#page-1` with the clicked line's text, and text selection still works. Ink
stays on its content as the window scrolls in all four formats.

### Agent tools run without a browser or a VM

The owner's agent works on a site with file tools and no VM (RuntimeVM
COD-1423, COD-1428); a shell command would give the site a VM for good. So
document operations are DOM-free libraries that the RuntimeVM operator (Node)
can load as tools later. Each takes and returns document bytes, so a result
is written back with the files API as one new release.

- `@extend-ai/react-docx/agent`: `openDocx`, `paragraphs`, `find`, `locate`
  (a Comments or Ink anchor to a paragraph and offsets), `suggest` (a tracked
  change; each `\n` in the replacement is a suggested paragraph break), `comment`, `reply`, `resolve`, `comments`, `revisions`, `accept`,
  `reject`, `save`. CLI: `react-docx-agent in.docx out.docx '<ops>'`.
- `@extend-ai/react-xlsx/agent`: `openXlsx`, `sheets`, `cells`, `locate`
  (`?sheet=` plus a `#c-<ref>` id to a cell), `comment`, `reply`, `resolve`,
  `suggest`, `accept`, `reject`, `save`. A suggestion is an Excel threaded
  comment whose root ends with `[suggestion] {"previous":…,"value":…}`, so
  Excel shows it as a comment. CLI: `react-xlsx-agent`.

The loop was run on cool.computer: a person's comment on a published DOCX
was located by the agent, answered with a tracked change and a reply comment,
and published as the next release, where Suggesting mode shows it for
accept or reject.

### WebMCP tools in the browser

Where the browser has `document.modelContext` (WebMCP, a Chrome origin
trial), the page registers read-only tools over the open document as it is
now, unsaved edits included (`src/webmcp.ts`, COD-1456, COD-1716): on Word,
`doc_read` and `doc_find` (body paragraphs, tables, headers and footers),
`doc_comments` (the file's Word comments) and `doc_revisions` (tracked
changes); on Excel, `sheet_read`, `sheet_comments` and `sheet_suggestions`.
They wrap the agent libraries above, carry `readOnlyHint` and
`untrustedContentHint` (document text can carry instructions), and wait until
the document has loaded. A read serializes with `commit: false`: it sees a
Word table cell's in-progress text but leaves it with the editor, so nothing
on the page changes. On Excel a read leaves out a cell still being typed. A private page is served only to people with access, so its
tools are too. Slides, PowerPoint and PDF register none yet.

### Saving edits made in the browser

The four editors share the `cool: "doc"` page bridge. Access enables editing;
changes debounce for two seconds and save the existing export bytes. Slides
save changed HTML files and the manifest together. The bridge owns permissions
and release versions; conflicts offer reload or a local download. See
`dev/autosave-harness.mjs` for the folder-backed development bridge.

## Engines

The editors use three MIT engine forks under `engines/`, imported with full
history using Git subtrees. One root pnpm workspace installs them and Turbo
builds them before v4. See the [development guide](../../../../README.md#development)
for upstream subtree updates and pushing fixes back to the forks:

| Engine | Fork                                                                    | Parse and export                                                               |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| DOCX   | [`react-docx`](https://github.com/The-Money-Company-Limited/react-docx) | Rust/WASM (`crates/docx-core`); edits in `packages/editor-ops`                 |
| XLSX   | [`react-xlsx`](https://github.com/The-Money-Company-Limited/react-xlsx) | `@dukelib/sheets-wasm` (binary dependency); JS post-processes the exported zip |
| PPTX   | [`react-pptx`](https://github.com/The-Money-Company-Limited/react-pptx) | Rust/WASM; viewer only                                                         |

## Plan

1. **Anchorable pages.** Done for all four formats.
2. **DOCX keeps its markup when edited.** Done: edits rewrite the paragraph's
   source XML around revisions and comment markers instead of dropping them.
3. **Agent tools** for DOCX and XLSX. Done.
4. **Review in the editor.** Done: DOCX Viewing, Suggesting, and Editing
   modes, accept and reject, comment replies; XLSX comment cards and
   suggestion accept and reject. Enter and Backspace across paragraphs
   while suggesting are tracked paragraph breaks, as in Word. Changes and
   Word comments show in the text with no review column, so the page keeps
   its place in every mode; clicking one opens its card under it.
5. **PPTX editing.** Not started; the PPTX engine is a viewer.

## Open questions

- **Comment pins after a re-render.** RuntimeVM's layer re-finds a selector
  only on resize, route change, or a notes message. Switching a DOCX between
  Viewing and Suggesting re-renders paragraphs, and a pin can stay on the
  detached element (it was seen at the top of the window) until the next
  resize. A layer that re-resolves detached targets would fix it.
- **Bundle storage per computer.** R2 content is addressed per computer, so
  every new document artifact uploads the bundle once. A platform-side
  template could share bundle bytes across computers.
- **External resources.** Optional PDF fonts and stamps can still load from
  external URLs, so a private release is not fully self-contained.
- **What the agent sees.** RuntimeVM COD-1430 (a screenshot or rendered Ink
  for the agent) and COD-1413 (where a fix should land) are open; `locate`
  answers the second for documents.
