# Slides template

This site runs its own TypeScript source in the browser. There is no build:
change a file under `src/`, save it on the site, and reload the page.

## The data

- `deck/deck.json` is the deck: its `title`, the slide `order` and optional
  `sections`. Each slide is `deck/slides/<id>.html`, one
  `<section id="<id>">` on a 1920×1080 canvas, in the HTML subset that
  `validate.js` allows. Edits people make on the page are saved back to
  these files.
- `artifact.json` names it: `{"kind":"slides","title":"…","file":"deck/deck.json"}`.
  `title` is the page title; `file` is always `deck/deck.json`.

## Where the parts are

All paths are under `src/apps/v4/components/extend/slides/`, except where
named.

- `slides-editor.tsx`: the editor. `SlidesEditor` is the header, the slide
  list and the presenter.
- `slide-canvas.tsx`: the slide being edited: selecting, moving, resizing
  and editing text.
- `chart-panel.tsx` and `charts.js`: charts and their data.
- `validate.js`: what a deck and a slide may contain.
- `export.ts`: saving the deck, and downloading it as a ZIP of its files
  or as PowerPoint.
- `slides.css`: how slides look.
- `src/apps/v4/components/ui/`: buttons, menus, inputs and selects.
- `src/apps/v4/experiments/artifact-template/src/main.tsx`: the page. It
  loads `artifact.json` and the editor; `autosave.ts` saves edits.
- `src/apps/v4/experiments/artifact-template/src/theme.css`: the page's
  colours. Tailwind classes work in any `.tsx` file.

## Rules

- A new file needs no registration: import it from an existing file (with
  `./`, `../` or `@/` for `apps/v4/`) and the page finds it.
- npm packages come prebuilt in `vendor/`; only the packages already imported
  are there. From `@hugeicons/core-free-icons`, use an icon the source already
  imports.
- Never edit `vendor/`, `loader.js`, `resolve.js` or
  `loader-manifest.json`. They are built with the template.
- After a change to any source file or stylesheet, the first reload rebuilds the CSS
  in the background, and new classes or rules show a moment later.
- If a file does not compile, the page shows the error with its file and line.
