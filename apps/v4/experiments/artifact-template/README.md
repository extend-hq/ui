# Office artifact template experiment

This fork builds a static release for a Cool Computer artifact. Each release
contains the viewer/editor (the Vite bundle, or for a spreadsheet, a PDF or
a deck the template's TSX source with `loader.js`), `template.json` naming its version,
one document, `artifact.json`, and `cool.json`. It runs in the browser without a computer VM or a RuntimeVM
code change.

For the build pipeline, Cloudflare request path, and later integration contract,
see [ARCHITECTURE.md](./ARCHITECTURE.md).

The document fills a framed editor with a small gap from the viewport edges.
Its controls use a copy of RuntimeVM's light and dark appearance tokens, with
glass surfaces on the XLSX, DOCX, and PDF toolbars. The workbook's own
appearance button persists the choice under RuntimeVM's
`cool-computers-theme` key. There is no artifact header, logo, or wallpaper.

| File | UI in this fork                                                               | Save path                 |
| ---- | ----------------------------------------------------------------------------- | ------------------------- |
| XLSX | Experimental spreadsheet editor, including chart selection and movement       | Automatic via page bridge |
| DOCX | Experimental word processor                                                   | Automatic via page bridge |
| PPTX | Presentation viewer only; this fork has no PPTX editor                        | Download original PPTX    |
| PDF  | PDF editor for annotations, forms, signatures, redaction, and page operations | Automatic via page bridge |

The PDF editor does not rewrite arbitrary existing page text. DOCX, XLSX, PDF,
and HTML slide edits save through the injected `cool: "doc"` page bridge.
Without an access response granting `canSave`, documents open in viewing mode.
The XLSX editor switches to read-only above 5 MiB. The bundled PDFium WASM is
served from the artifact itself; optional fonts and stamp resources may still
use external URLs.

HTML slide decks use the built-in slides editor. Saves contain the changed
slide HTML files and `deck/deck.json` together; Download still offers ZIP and PPTX.

## Engines

The DOCX, XLSX, and PPTX forks live in `engines/react-docx`,
`engines/react-xlsx`, and `engines/react-pptx`. They share the root pnpm 9.15.0
workspace and lockfile; v4 uses `workspace:*` dependencies. One root install
and `pnpm build` build the engines in dependency order before the app.
Their `dist` outputs are what this template bundles.

See the root [development guide](../../../../README.md#development) for build-box
commands, `git subtree pull`/`git subtree push`, and pnpm configuration decisions.
Ordinary builds of all three engines reuse checked-in binaries and need no Rust.
Explicit Rust/wasm rebuilds run on the build box, from the repository root:

```bash
pnpm --filter @extend-ai/react-docx-wasm build:wasm
pnpm --filter @extend-ai/react-pptx-wasm build:wasm
(cd engines/react-xlsx && bash scripts/rebuild-duke-wasm.sh)
```

Pull PPTX’s `engines/react-pptx/packages/wasm/src/generated/` back from the box
and include its wasm, JavaScript, and declarations when updating the Rust parser.

## Build and stage

From the repository root on the build box:

```sh
pnpm install
pnpm build
pnpm --filter v4 artifact-template:build
pnpm --filter v4 artifact-template:stage /absolute/path/to/report.xlsx /absolute/path/to/new-release-directory
```

The stage command accepts `.xlsx`, `.docx`, `.pptx`, `.pdf` and a deck folder. A
spreadsheet, PDF or slides release is the template's TypeScript source, run in the browser
with no build (see [Spreadsheet, PDF and slides releases are source](./ARCHITECTURE.md#spreadsheet-pdf-and-slides-releases-are-source));
the other kinds are the Vite bundle. An omitted output directory stages
directly into `apps/v4/experiments/artifact-template/dist` (`dist-xlsx`, `dist-pdf` or `dist-slides`
for those kinds); a specified output directory must not already exist. Rebuild after changing source. The release is a complete
static directory; Vite emits relative asset URLs so it works at an artifact
root or a local preview subpath. The stage command checks the 25 MiB per-asset,
20,000-file, and 1 GiB total limits. A failed stage removes a newly created
output directory.

To preview several releases from a common parent:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory /absolute/path/to/releases
```

To publish one release when ready:

```sh
cool publish /absolute/path/to/new-release-directory --name example
```

The corresponding ZIP may also be uploaded through the Cool Computers publish
UI.

## Check Comments and Ink locally

[`dev/comments-harness.mjs`](./dev/comments-harness.mjs) serves staged
releases with RuntimeVM's real comment script injected, as the gateway does,
and a stand-in comment layer that saves every pick at once:

```sh
node dev/comments-harness.mjs /path/to/runtimevm /path/to/releases 4310
```

Open `http://127.0.0.1:4310/<release>/`, press **Comment**, then click or draw.
`http://127.0.0.1:4311/notes?agent` lists each saved anchor as the owner's
agent reads it.

## RuntimeVM fit

RuntimeVM publishes complete static file sets; it has no template identifier.
A release staged here is the composition a future template feature would do
on the server: a versioned bundle (`template.json`) plus one document. See
[ARCHITECTURE.md](./ARCHITECTURE.md#contract-for-a-later-artifact-template-feature).
This experiment leaves RuntimeVM untouched.

## Autosave development and verification

`dev/autosave-harness.mjs <release folder> [port]` serves a staged artifact,
injects the same-window page contract, and writes saves into that folder.
`POST /__doc/control` accepts `mode` (`online`, `offline`, `read_only`,
`signed_out`, `conflict`, `path_not_allowed`, `not_document`, `too_large`,
`error`) or `changed: true`. It also accepts `retryAfter` (seconds),
`pollFailed`, and `receipt: "late" | "drop" | "normal"`; `deliver: true`
releases held receipts. `GET /__doc/control` lists writes and attempted request
IDs, bases, payload hashes and times. The stand-in validates declared paths,
slide IDs, referenced images and the 25/64 MiB limits, and retains 32 receipts
for 24 hours (`advance` moves its receipt clock in milliseconds).
The production bridge still owns authorization, size limits and atomic releases.

Run checks on the build box only, from `tools/cloudflare` (from a worktree, set
`repo` to its path):

```sh
repo=office-ui
./r up
./r sync "$repo"
./r run "$repo" 'pnpm install && pnpm build'
./r run "$repo" 'sh apps/v4/experiments/artifact-template/dev/verify.sh'
./r run "$repo" 'sh apps/v4/experiments/artifact-template/dev/browser.sh'
./r run "$repo" 'node apps/v4/experiments/artifact-template/dev/negative.mjs'
./r down
```

The browser cases use real edits, download conflict copies, verify persisted
bytes after reload, check clean external reloads, and exercise read-only and
offline access for all four kinds. Negative controls temporarily build the
pre-autosave entry point from `59895b6^` and require every browser case to fail, then
restore the working source and bundle. Contract negative controls disconnect
the message handler and require every test to fail. Results and screenshots
stay in the ignored `dev/results/` directory.

Round-2 browser cases also cover timed-out retries, late receipts with newer
edits, real beforeunload dialogs, retryAfter during visibility changes, failed
access polls, and separate path/not-document messages. Long bridge/controller
timeouts are accelerated only by the browser tests. The controller waits 20
minutes, beyond the script's 19 minutes; a timeout never discards the request.
Contract negative controls additionally run the new cases against `59895b6`.
