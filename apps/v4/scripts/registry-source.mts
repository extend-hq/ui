import ts from "typescript"

export type PrimitiveFamily = "base" | "radix"

const customModules: Record<string, string> = {
  "@/components/ui/color-picker": "@/components/extend/document-color-picker",
  "@/components/ui/scroll-area": "@/components/extend/document-scroll-area",
  "@/components/ui/group": "@/components/ui/button-group",
  "@/components/ui/toast": "@/components/extend/ui-toast",
  "@/components/ui/spinner": "@/components/extend/document-controls",
  "@/components/extend/document-scroll-content":
    "@/components/extend/document-scroll-area",
}

export function transformRegistrySource(
  content: string,
  family: PrimitiveFamily
) {
  const source = ts.createSourceFile(
    "component.tsx",
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  let needsEnhancedScrollArea = false
  const inspectScrollArea = (node: ts.Node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(source) === "ScrollArea"
    ) {
      needsEnhancedScrollArea ||= node.attributes.properties.some(
        (prop) =>
          ts.isJsxSpreadAttribute(prop) ||
          [
            "viewportRef",
            "viewportProps",
            "viewportClassName",
            "scrollFade",
            "scrollbarGutter",
            "scrollbarOverflowOnly",
            "orientation",
          ].includes(prop.name.getText(source))
      )
    }
    ts.forEachChild(node, inspectScrollArea)
  }
  inspectScrollArea(source)
  const f = ts.factory
  const extraImports = new Map<string, Set<string>>()
  let buttonProps = false
  const addImport = (modulePath: string, name: string) => {
    if (!extraImports.has(modulePath)) extraImports.set(modulePath, new Set())
    extraImports.get(modulePath)!.add(name)
  }
  const expression = (text: string) => {
    const parsed = ts.createSourceFile(
      "expression.tsx",
      `const value = (${text})`,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    )
    const statement = parsed.statements[0] as ts.VariableStatement
    const node = statement.declarationList.declarations[0].initializer!
    const synthesize = (node: ts.Node): void => {
      ts.setTextRange(node, { pos: -1, end: -1 })
      ts.forEachChild(node, synthesize)
    }
    synthesize(node)
    return node
  }
  const printer = ts.createPrinter()
  const print = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, source)
  const transform: ts.TransformerFactory<ts.SourceFile> = (context) => {
    const visit: ts.Visitor = (node) => {
      if (
        ts.isVariableStatement(node) &&
        node.declarationList.declarations.every(
          (declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === "portalContainer"
        )
      )
        return undefined
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.importClause?.namedBindings &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        let modulePath = node.moduleSpecifier.text
        const imports: ts.ImportSpecifier[] = []
        for (const specifier of node.importClause.namedBindings.elements) {
          const name = specifier.propertyName?.text ?? specifier.name.text
          if (
            modulePath === "@/components/ui/popover" &&
            name === "PopoverContent" &&
            content.includes("triggerGroupRef")
          ) {
            addImport(
              "@/components/extend/document-color-popover",
              "ColorPopoverContent as PopoverContent"
            )
            continue
          }
          if (modulePath === "@/components/ui/group") {
            imports.push(
              f.updateImportSpecifier(
                specifier,
                specifier.isTypeOnly,
                f.createIdentifier(name.replace(/^Group/, "ButtonGroup")),
                specifier.name
              )
            )
            continue
          }
          if (
            modulePath === "@/components/ui/button" &&
            name === "ButtonProps"
          ) {
            buttonProps = true
            continue
          }
          if (
            modulePath === "@/components/ui/dialog" &&
            name === "DialogPanel"
          ) {
            addImport("@/components/extend/document-controls", "DialogPanel")
            continue
          }
          if (
            modulePath === "@/components/ui/select" &&
            name === "SelectPrimitive"
          ) {
            continue
          }
          if (
            modulePath === "@/components/ui/toggle" &&
            name.startsWith("ToggleGroup")
          ) {
            addImport("@/components/ui/toggle-group", name)
            continue
          }
          imports.push(
            name === "CollapsiblePanel"
              ? f.updateImportSpecifier(
                  specifier,
                  specifier.isTypeOnly,
                  f.createIdentifier("CollapsibleContent"),
                  specifier.name
                )
              : specifier
          )
        }
        if (
          modulePath === "@/components/ui/select" &&
          node.importClause.namedBindings.elements.some(
            (s) => s.name.text === "SelectPrimitive"
          )
        ) {
          const packageName =
            family === "base"
              ? "@base-ui/react/select"
              : "@radix-ui/react-select"
          addImport(
            packageName,
            family === "base"
              ? "Select as SelectPrimitive"
              : "* as SelectPrimitive"
          )
        }
        if (!imports.length) return undefined
        modulePath =
          modulePath === "@/components/ui/scroll-area" &&
          !needsEnhancedScrollArea
            ? modulePath
            : (customModules[modulePath] ?? modulePath)
        return f.updateImportDeclaration(
          node,
          node.modifiers,
          f.updateImportClause(
            node.importClause,
            node.importClause.isTypeOnly,
            node.importClause.name,
            f.createNamedImports(imports)
          ),
          f.createStringLiteral(modulePath),
          node.attributes
        )
      }

      if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
        const opening = ts.isJsxElement(node) ? node.openingElement : node
        let name = print(opening.tagName)
        let attributes = [...opening.attributes.properties]
        let children = ts.isJsxElement(node) ? [...node.children] : []
        const get = (name: string) =>
          attributes.find(
            (a): a is ts.JsxAttribute =>
              ts.isJsxAttribute(a) && print(a.name) === name
          )
        const value = (name: string) => {
          const a = get(name)
          if (!a) return undefined
          if (!a.initializer) return "true"
          if (ts.isStringLiteral(a.initializer))
            return JSON.stringify(a.initializer.text)
          if (ts.isJsxExpression(a.initializer) && a.initializer.expression)
            return print(a.initializer.expression)
          throw new Error(`Unsupported ${name} attribute`)
        }
        const remove = (name: string) => {
          attributes = attributes.filter(
            (a) => !ts.isJsxAttribute(a) || print(a.name) !== name
          )
        }
        const set = (name: string, text: string) => {
          remove(name)
          attributes.push(
            f.createJsxAttribute(
              f.createIdentifier(name),
              f.createJsxExpression(undefined, expression(text))
            )
          )
        }
        const classes = (text: string) => {
          const previous = value("className")
          addImport("@/lib/utils", "cn")
          set("className", `cn(${text}${previous ? `, ${previous}` : ""})`)
        }

        if (name === "Input") {
          if (value("size") === '"sm"') classes('"h-8 px-2.5"')
          remove("size")
          remove("nativeInput")
        }
        if (name === "Badge") {
          if (value("size") === '"sm"') classes('"h-4 px-1 text-[10px]"')
          remove("size")
        }
        if (name === "Button") {
          if (value("variant") === '"destructive-outline"') {
            set("variant", '"outline"')
            classes(
              '"border-destructive/32 text-destructive hover:bg-destructive/10"'
            )
          }
          if (get("loading")) {
            name = "LoadingButton"
            addImport("@/components/extend/document-controls", "LoadingButton")
          }
        }
        if (name === "DialogFooter") {
          remove("variant")
        }
        if (name === "DropdownMenuCheckboxItem") {
          if (value("variant") === '"switch"') classes('"justify-between"')
          remove("variant")
        }
        if (name === "ToggleGroup") {
          if (get("spacing"))
            set("spacing", value("spacing") === '"none"' ? "0" : "1")
          if (family === "radix") {
            const multiple = value("multiple") === "true"
            set("type", multiple ? '"multiple"' : '"single"')
            remove("multiple")
            if (!multiple) {
              for (const prop of ["value", "defaultValue"])
                if (get(prop)) set(prop, `(${value(prop)})?.[0] ?? ""`)
              if (get("onValueChange"))
                set(
                  "onValueChange",
                  `(next) => (${value("onValueChange")})(next ? [next] : [])`
                )
            }
          }
        }
        if (
          ["PopoverContent", "SelectContent", "TooltipContent"].includes(name)
        )
          remove("portalProps")
        if (family === "radix") {
          if (name === "Select") {
            remove("items")
            remove("modal")
          }
          if (name === "SelectItem" && get("label")) {
            set("textValue", value("label")!)
            remove("label")
          }
          if (name === "SelectContent" && get("alignItemWithTrigger")) {
            set(
              "position",
              `${value("alignItemWithTrigger")} ? "item-aligned" : "popper"`
            )
            remove("alignItemWithTrigger")
          }
          if (name === "TooltipProvider" && get("delay")) {
            set("delayDuration", value("delay")!)
            remove("delay")
          }
          if (name === "TabsContent" && get("keepMounted")) {
            set("forceMount", value("keepMounted")!)
            remove("keepMounted")
            classes('"data-[state=inactive]:hidden"')
          }
          if (get("render")) {
            const render = get("render")!.initializer
            if (
              !render ||
              !ts.isJsxExpression(render) ||
              !render.expression ||
              !(
                ts.isJsxSelfClosingElement(render.expression) ||
                ts.isJsxElement(render.expression)
              )
            )
              throw new Error(`Unsupported render on ${name}`)
            const element = render.expression
            const childOpening = ts.isJsxElement(element)
              ? element.openingElement
              : f.createJsxOpeningElement(
                  element.tagName,
                  element.typeArguments,
                  element.attributes
                )
            const childClosing = ts.isJsxElement(element)
              ? element.closingElement
              : f.createJsxClosingElement(element.tagName)
            children = [
              f.createJsxElement(
                childOpening,
                children.length
                  ? children
                  : ts.isJsxElement(element)
                    ? element.children
                    : [],
                childClosing
              ),
            ]
            remove("render")
            set("asChild", "true")
          }
        } else if (get("asChild")) {
          const elements = children.filter(
            (c) => !ts.isJsxText(c) || c.text.trim()
          )
          if (elements.length !== 1)
            throw new Error(
              `Expected one child for ${name}: ${print(node).slice(0, 700)}`
            )
          const child = elements[0]
          if (ts.isJsxExpression(child) && child.expression)
            set("render", print(child.expression))
          else if (ts.isJsxElement(child) || ts.isJsxSelfClosingElement(child))
            set("render", print(child))
          else throw new Error(`Unsupported child for ${name}`)
          remove("asChild")
          children = []
        }
        const tag =
          name === print(opening.tagName)
            ? opening.tagName
            : f.createIdentifier(name)
        const attrs = f.createJsxAttributes(attributes)
        const result =
          ts.isJsxSelfClosingElement(node) && !children.length
            ? f.updateJsxSelfClosingElement(
                node,
                tag,
                node.typeArguments,
                attrs
              )
            : f.createJsxElement(
                f.createJsxOpeningElement(tag, opening.typeArguments, attrs),
                children,
                f.createJsxClosingElement(tag)
              )
        return ts.visitEachChild(result, visit, context)
      }
      return ts.visitEachChild(node, visit, context)
    }
    return (source) => ts.visitNode(source, visit) as ts.SourceFile
  }
  const result = ts.transform(source, [transform])
  let output = printer.printFile(result.transformed[0])
  result.dispose()
  const existing = ts.createSourceFile(
    "output.tsx",
    output,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  const declared = new Set(
    existing.statements.flatMap((s) =>
      ts.isImportDeclaration(s) &&
      s.importClause?.namedBindings &&
      ts.isNamedImports(s.importClause.namedBindings)
        ? s.importClause.namedBindings.elements.map((e) => e.name.text)
        : []
    )
  )
  const additions: string[] = []
  for (const [modulePath, names] of extraImports) {
    const missing = [...names].filter((n) => !declared.has(n))
    if (!missing.length) continue
    additions.push(
      missing[0].startsWith("* as ")
        ? `import ${missing[0]} from "${modulePath}"`
        : `import { ${missing.join(", ")} } from "${modulePath}"`
    )
  }
  output = output.replace(/("use client";?)/, `$1\n${additions.join("\n")}`)
  if (!output.includes('"use client"'))
    output = `${additions.join("\n")}\n${output}`
  if (buttonProps)
    output += "\ntype ButtonProps = React.ComponentProps<typeof Button>\n"
  return output
}
