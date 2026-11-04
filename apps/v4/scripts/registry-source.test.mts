import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { ESLint } from "eslint"
import ts from "typescript"

import {
  getRegistryFamily,
  styleRegistryDependencies,
} from "../lib/registry-style.ts"
import { inlineRegistrySupport } from "./inline-registry-support.mts"
import { transformRegistrySource } from "./registry-source.mts"
import { getRegistrySupport } from "./registry-support.mts"

const source = `"use client"
import {Button} from "@/components/ui/button"
import {DialogTrigger, DialogClose, DialogPanel} from "@/components/ui/dialog"
import {Select, SelectContent, SelectItem} from "@/components/ui/select"
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle"
export function Controls() { return <><DialogTrigger render={<Button/>}>Open</DialogTrigger><DialogClose render={<Button>Close</Button>}/><DialogPanel>Body</DialogPanel><Select items={options}><SelectContent alignItemWithTrigger={false}><SelectItem value="one" label="One">One</SelectItem></SelectContent></Select><ToggleGroup value={values} onValueChange={setValues}><ToggleGroupItem value="one">One</ToggleGroupItem></ToggleGroup></> }`

for (const family of ["base", "radix"] as const) {
  test(`${family} document components pass consumer effect linting`, async () => {
    const registry = JSON.parse(
      readFileSync(new URL("../registry.json", import.meta.url), "utf8")
    ) as {
      items: Array<{ files?: Array<{ path: string; target?: string }> }>
    }
    const paths = new Set(
      registry.items.flatMap((item) =>
        (item.files ?? [])
          .filter(
            (file) =>
              file.target?.startsWith("@components/extend/") ||
              file.target?.startsWith("@components/blocks/")
          )
          .map((file) => file.path)
      )
    )
    const eslint = new ESLint({ cwd: new URL("..", import.meta.url).pathname })
    const errors: string[] = []
    const support = await getRegistrySupport(
      new URL("..", import.meta.url).pathname,
      family
    )
    for (const path of paths) {
      const familyPath = path.startsWith("registry/bases/base/")
        ? path.replace("/base/", `/${family}/`)
        : family === "radix" &&
            path === "components/extend/document-preview-card.tsx"
          ? "registry/bases/radix/document-preview-card.tsx"
          : path
      const filename = new URL(`../${familyPath}`, import.meta.url)
      const raw = readFileSync(filename, "utf8")
      const transformed = /document-(scroll-area|color-popover)\.tsx$/.test(
        familyPath
      )
        ? raw
        : transformRegistrySource(raw, family)
      const output = inlineRegistrySupport(transformed, support)
      for (const name of support.keys())
        assert(!output.includes(`from "${name}"`), `${path} imports ${name}`)
      const results = await eslint.lintText(output, {
        filePath: filename.pathname,
      })
      for (const result of results) {
        errors.push(
          ...result.messages
            .filter((message) => message.severity === 2)
            .map(
              (message) =>
                `${path}:${message.line}: ${message.ruleId}: ${message.message}`
            )
        )
      }
    }
    assert.deepEqual(errors, [])
  })

  test(`${family} source keeps direct primitives and valid composition`, () => {
    const output = transformRegistrySource(source, family)
    assert.match(output, /import \{ Button \} from "@\/components\/ui\/button"/)
    assert.doesNotMatch(output, /ui-adapter/)
    assert.match(output, /@\/components\/ui\/toggle-group/)
    const parsed = ts.createSourceFile(
      "controls.tsx",
      output,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    assert.equal(
      (parsed as ts.SourceFile & { parseDiagnostics: unknown[] })
        .parseDiagnostics.length,
      0
    )
    if (family === "radix") {
      assert.doesNotMatch(
        output,
        /render=|items=|alignItemWithTrigger=|label="One"/
      )
      assert.match(output, /<Button>Open<\/Button>/)
      assert.match(output, /<Button>Close<\/Button>/)
      assert.match(output, /next \? \[next\] : \[\]/)
      assert.match(output, /textValue=/)
    } else {
      assert.match(output, /render=/)
      assert.match(output, /items=/)
    }
  })
}

test("Base child composition retains content and event handlers", () => {
  const output = transformRegistrySource(
    "const control = <TooltipTrigger asChild><button onClick={action}><span>Label</span></button></TooltipTrigger>",
    "base"
  )
  assert.doesNotMatch(output, /asChild/)
  assert.match(output, /onClick=\{action\}/)
  assert.match(output, /<span>Label<\/span>/)
})

test("Toggle spacing retains the compact toolbar gap", () => {
  for (const family of ["base", "radix"] as const) {
    const output = transformRegistrySource(
      'const controls = <><ToggleGroup spacing="default" /><ToggleGroup spacing="none" /></>',
      family
    )
    assert.match(output, /spacing=\{\(1\)\}/)
    assert.match(output, /spacing=\{\(0\)\}/)
  }
})

test("Style routing uses the family without a preset allowlist", () => {
  assert.equal(getRegistryFamily("base-nova"), "base")
  assert.equal(getRegistryFamily("radix-maia"), "radix")
  assert.equal(getRegistryFamily("radix-future"), "radix")
  assert.equal(getRegistryFamily("new-york"), "radix")
  assert.equal(getRegistryFamily("new-york-v4"), "radix")
  assert.equal(getRegistryFamily("default"), null)
  assert.equal(getRegistryFamily("invalid"), null)
  assert.deepEqual(
    styleRegistryDependencies(
      { registryDependencies: ["button", "@extend/pdf-editor-core"] },
      "radix-vega"
    ).registryDependencies,
    [
      "https://ui.shadcn.com/r/styles/radix-vega/button.json",
      "@extend/pdf-editor-core",
    ]
  )
})

test("The editor provider includes its dialogs and side panels", () => {
  const source = ts.createSourceFile(
    "editor.tsx",
    readFileSync(
      new URL("../components/extend/pdf-editor.tsx", import.meta.url),
      "utf8"
    ),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  let covered = false
  const visit = (node: ts.Node) => {
    if (
      ts.isJsxSelfClosingElement(node) &&
      node.tagName.getText(source) === "PdfEditorInner"
    ) {
      let parent = node.parent
      while (parent) {
        if (
          ts.isJsxElement(parent) &&
          parent.openingElement.tagName.getText(source) === "TooltipProvider"
        )
          covered = true
        parent = parent.parent
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  assert(covered)
})

test("The icon-only color select uses popup positioning", () => {
  const source = readFileSync(
    new URL("../components/ui/color-picker.tsx", import.meta.url),
    "utf8"
  )
  assert.match(source, /<SelectContent\s+alignItemWithTrigger=\{false\}/)
  assert.match(transformRegistrySource(source, "radix"), /position=\{/)
  assert.doesNotMatch(source, /RiColorPickerLine/)
})

test("Color picker select parts share the consumer primitive context", () => {
  const source = readFileSync(
    new URL("../components/ui/color-picker.tsx", import.meta.url),
    "utf8"
  )
  for (const family of ["base", "radix"] as const) {
    const output = transformRegistrySource(source, family)
    assert.match(
      output,
      /import \{ Select, SelectContent, SelectItem, SelectTrigger \} from "@\/components\/ui\/select"/
    )
    assert.match(output, /<SelectTrigger\s+aria-label="Color format"/)
    assert.doesNotMatch(
      output,
      /SelectPrimitive|@radix-ui\/react-select|@base-ui\/react\/select/
    )
  }
})

test("Dialog footers retain consumer spacing and explicit class overrides", () => {
  for (const family of ["base", "radix"] as const) {
    const output = transformRegistrySource(
      'const footer = <><DialogFooter /><DialogFooter variant="bare" /><DialogFooter className="gap-4" /></>',
      family
    )
    assert.match(output, /<DialogFooter className="gap-4"/)
    assert.doesNotMatch(output, /variant=|pt-3|pt-4|border-t|bg-muted/)
  }
})

test("Editor loading keeps the normal controls without a document-keyed remount", () => {
  const source = readFileSync(
    new URL("../components/extend/pdf-editor.tsx", import.meta.url),
    "utf8"
  )
  assert.match(source, /<fieldset disabled=\{controlsDisabled\}/)
  assert.match(
    source,
    /value=\{document \? registryState : EMPTY_EDITOR_CONTEXT\}/
  )
  assert.doesNotMatch(source, /PdfEditorFallbackShell|key=\{activeDocumentId\}/)
  assert.match(source, /if \(controlsDisabled\) return/)
})

test("Editor panels use the consumer resizable primitive and preserve minimum sizes", () => {
  const source = readFileSync(
    new URL("../components/extend/pdf-editor-workspace.tsx", import.meta.url),
    "utf8"
  )
  assert.match(source, /from "@\/components\/ui\/resizable"/)
  assert.match(source, /minSize=\{side === "left" \? "14rem" : "21rem"\}/)
  assert.match(source, /maxSize=\{side === "left" \? "28rem" : "32rem"\}/)
  assert.match(source, /data-\[separator=hover\]/)
  assert.match(source, /before:w-px/)
  assert.match(source, /mask-image:linear-gradient/)
  assert.doesNotMatch(source, /withHandle/)
  assert.doesNotMatch(source, /data-\[separator=focus\]/)
  const registry = JSON.parse(
    readFileSync(new URL("../registry.json", import.meta.url), "utf8")
  )
  const core = registry.items.find(
    (item: { name: string }) => item.name === "pdf-editor-core"
  )
  assert(core.registryDependencies.includes("resizable"))
  assert(
    core.files.some(
      (file: { path: string }) =>
        file.path === "components/extend/pdf-editor-workspace.tsx"
    )
  )
})

test("Inline support keeps only referenced helpers and preserves local bindings", () => {
  const output = inlineRegistrySupport(
    'import { Spinner as Busy } from "@/components/extend/document-controls"; const InlineSpinner = 1; export function View() { return <Busy title={String(InlineSpinner)} /> }',
    new Map([
      [
        "@/components/extend/document-controls",
        'import type * as React from "react"; export function Spinner(props: React.ComponentProps<"span">) { return <span {...props} /> }; export function Unused() { return <div/> }',
      ],
    ])
  )
  assert.doesNotMatch(output, /document-controls|function Unused/)
  assert.match(output, /const InlineSpinner = 1/)
  assert.match(output, /function InlineSpinner2/)
  assert.match(output, /<InlineSpinner2 title=/)
})

test("Inline support separates conflicting primitive imports", () => {
  const output = inlineRegistrySupport(
    'import { Popover } from "@/components/ui/popover"; import { Content as Panel } from "@/support"; export const View = () => <Popover><Panel /></Popover>',
    new Map([
      [
        "@/support",
        'import { Popover } from "@base-ui/react/popover"; export const Content = () => <Popover.Popup />',
      ],
    ])
  )
  assert.match(output, /Popover as InlinePopover/)
  assert.match(output, /<InlinePopover.Popup/)
  assert.match(output, /<Popover><InlineContent/)
})
