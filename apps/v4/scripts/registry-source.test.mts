import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import ts from "typescript"

import {
  getRegistryFamily,
  styleRegistryDependencies,
} from "../lib/registry-style.ts"
import { transformRegistrySource } from "./registry-source.mts"

const source = `"use client"
import {Button} from "@/components/ui/button"
import {DialogTrigger, DialogClose, DialogPanel} from "@/components/ui/dialog"
import {Select, SelectContent, SelectItem} from "@/components/ui/select"
import {ToggleGroup, ToggleGroupItem} from "@/components/ui/toggle"
export function Controls() { return <><DialogTrigger render={<Button/>}>Open</DialogTrigger><DialogClose render={<Button>Close</Button>}/><DialogPanel>Body</DialogPanel><Select items={options}><SelectContent alignItemWithTrigger={false}><SelectItem value="one" label="One">One</SelectItem></SelectContent></Select><ToggleGroup value={values} onValueChange={setValues}><ToggleGroupItem value="one">One</ToggleGroupItem></ToggleGroup></> }`

for (const family of ["base", "radix"] as const) {
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
