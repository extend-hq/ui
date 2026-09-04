# Registry compatibility

The site keeps its coss/Base UI primitives. Document behavior and state have a
single source in `components/extend`. The registry build adapts composition at
build time and formats separate Base and Radix artifacts in
`public/r/bases/{base,radix}`.

Installed components import ordinary primitives directly from the consumer's
`components/ui` alias. Extend does not ship replacements for those primitives
as document dependencies. The build inlines only the support code each component
uses: document controls, enhanced scroll viewports, color-picker positioning, and
icon prop types. Ordinary scrolling uses the consumer's ScrollArea; enhanced
viewports reuse its ScrollBar. These helpers do not create additional installed
files. Larger document components and document notifications remain shared entries.

The route `/r/styles/{style}/{name}.json` selects the family artifact and resolves
standard dependencies against the same upstream style. It does not translate
source at request time or maintain a preset allowlist. Icons remain
`IconPlaceholder` elements until shadcn transforms them for the configured
`iconLibrary`.

## Checks

From `apps/v4`:

```sh
pnpm registry:test
pnpm typecheck
pnpm registry:check-extend-ui
```

The install fixture creates Base and Radix Maia Vite projects, preinstalls and
hashes consumer primitives, installs every public document component with the
real CLI, declines overwrite prompts, and verifies the hashes. It installs all
icon-bearing sources with each of the five icon libraries and runs production
builds. It then installs actual upstream primitives for every other supported
preset and typechecks the entire component and icon matrix.

The matrix covers all eight current presets for both families, plus the Radix
`new-york` and `new-york-v4` aliases. Consumer primitives must implement their
current shadcn APIs. The historical `default` style is
[deprecated upstream](https://ui.shadcn.com/docs/components-json#style) and uses
incompatible older primitive and dependency APIs; migrate it before installing.

`EXTEND_KEEP_FIXTURES=1` retains temporary projects for debugging.
`EXTEND_FIXTURE_FAMILY=base|radix` and `EXTEND_SKIP_STYLE_MATRIX=1` narrow a local
run; neither should be used for release validation.
`EXTEND_FIXTURE_ITEMS=pdf-editor` limits CLI installation and icon probes to a
comma-separated selection and its dependency closure for focused checks.

## Release

Deploy the built registry before changing the global shadcn namespace entry to:

```json
{
  "name": "@extend",
  "homepage": "https://www.extend.ai/ui",
  "url": "https://www.extend.ai/ui/r/styles/{style}/{name}.json"
}
```

Until that upstream entry is updated, consumers can configure the same URL in
their own `components.json`:

```json
{
  "registries": {
    "@extend": "https://www.extend.ai/ui/r/styles/{style}/{name}.json"
  }
}
```

Then the installation command remains `npx shadcn@latest add @extend/pdf-editor`.
The legacy unstyled endpoint cannot discover the consumer's primitive family.
Do not advertise it as automatically supporting Radix.
