import { Node, Project, SyntaxKind, type Statement } from "ts-morph"

export function inlineRegistrySupport(
  content: string,
  modules: ReadonlyMap<string, string>
) {
  if (![...modules.keys()].some((name) => content.includes(`"${name}"`))) {
    return content
  }
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { baseUrl: "/", paths: { "@/*": ["*"] } },
  })
  const helpers = new Map(
    [...modules].map(([name, source]) => [
      name,
      project.createSourceFile(`${name.replace(/^@\//, "/")}.tsx`, source),
    ])
  )
  const entry = project.createSourceFile("/entry.tsx", content)
  const usedNames = new Set(
    entry
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .map((node) => node.getText())
  )
  const importedNames = new Map<string, string>()
  for (const source of [entry, ...helpers.values()]) {
    for (const declaration of source.getImportDeclarations()) {
      const modulePath = declaration.getModuleSpecifierValue()
      if (helpers.has(modulePath)) continue
      const bindings = [
        ...declaration.getNamedImports().map((specifier) => ({
          imported: specifier.getName(),
          local: specifier.getAliasNode()?.getText() ?? specifier.getName(),
          rename: (name: string) => specifier.renameAlias(name),
        })),
        ...[declaration.getNamespaceImport()].flatMap((binding) =>
          binding
            ? [
                {
                  imported: "*",
                  local: binding.getText(),
                  rename: (name: string) => binding.rename(name),
                },
              ]
            : []
        ),
        ...[declaration.getDefaultImport()].flatMap((binding) =>
          binding
            ? [
                {
                  imported: "default",
                  local: binding.getText(),
                  rename: (name: string) =>
                    declaration.renameDefaultImport(name),
                },
              ]
            : []
        ),
      ]
      for (const binding of bindings) {
        const key = `${modulePath}:${binding.imported}`
        let name = importedNames.get(key)
        if (!name) {
          name = binding.local
          if (source !== entry && usedNames.has(name)) {
            const prefix = `Inline${name}`
            name = prefix
            let suffix = 2
            while (usedNames.has(name)) name = `${prefix}${suffix++}`
          }
          importedNames.set(key, name)
          usedNames.add(name)
        }
        if (source !== entry && name !== binding.local) binding.rename(name)
      }
    }
  }
  for (const helper of helpers.values()) {
    for (const statement of helper.getStatements()) {
      const declarations = Node.isVariableStatement(statement)
        ? statement.getDeclarations()
        : Node.isFunctionDeclaration(statement) ||
            Node.isTypeAliasDeclaration(statement) ||
            Node.isInterfaceDeclaration(statement)
          ? [statement]
          : []
      for (const declaration of declarations) {
        const name = declaration.getName()
        if (!name) continue
        const prefix = name.startsWith("use")
          ? `useInline${name.slice(3)}`
          : `Inline${name[0].toUpperCase()}${name.slice(1)}`
        let renamed = prefix
        let suffix = 2
        while (usedNames.has(renamed)) renamed = `${prefix}${suffix++}`
        usedNames.add(renamed)
        declaration.rename(renamed)
      }
    }
  }

  for (const source of [entry, ...helpers.values()]) {
    for (const declaration of source.getImportDeclarations()) {
      if (!helpers.has(declaration.getModuleSpecifierValue())) continue
      for (const specifier of declaration.getNamedImports()) {
        if (specifier.getAliasNode()) specifier.renameAlias(specifier.getName())
      }
    }
  }

  const selected = new Set<Statement>()
  const imports = new Map<string, Set<string>>()
  const include = (statement: Statement) => {
    if (selected.has(statement)) return
    selected.add(statement)
    for (const identifier of statement.getDescendantsOfKind(
      SyntaxKind.Identifier
    )) {
      const symbol = identifier.getSymbol()
      for (const declaration of symbol?.getDeclarations() ?? []) {
        const importDeclaration = declaration.getFirstAncestorByKind(
          SyntaxKind.ImportDeclaration
        )
        if (importDeclaration) {
          const modulePath = importDeclaration.getModuleSpecifierValue()
          if (helpers.has(modulePath)) {
            const target = symbol?.getAliasedSymbol()?.getDeclarations()[0]
            if (target) includeDeclaration(target)
          } else {
            if (!imports.has(importDeclaration.getText()))
              imports.set(importDeclaration.getText(), new Set())
            imports.get(importDeclaration.getText())!.add(identifier.getText())
          }
        } else {
          includeDeclaration(declaration)
        }
      }
    }
  }
  const includeDeclaration = (node: Node) => {
    if (![...helpers.values()].includes(node.getSourceFile())) return
    let top = node
    while (top.getParent() && !Node.isSourceFile(top.getParent()))
      top = top.getParentOrThrow()
    if (Node.isStatement(top) && !Node.isImportDeclaration(top)) include(top)
  }
  for (const declaration of entry.getImportDeclarations()) {
    const helper = helpers.get(declaration.getModuleSpecifierValue())
    if (!helper) continue
    for (const specifier of declaration.getNamedImports()) {
      const targets = helper.getExportedDeclarations().get(specifier.getName())
      if (!targets?.length)
        throw new Error(`Missing inline export ${specifier.getName()}`)
      for (const target of targets) includeDeclaration(target)
    }
    declaration.remove()
  }
  for (const [text, used] of imports) {
    const scratch = project.createSourceFile("/import.ts", text, {
      overwrite: true,
    })
    const declaration = scratch.getImportDeclarations()[0]
    for (const specifier of declaration.getNamedImports()) {
      if (!used.has(specifier.getAliasNode()?.getText() ?? specifier.getName()))
        specifier.remove()
    }
    entry.addStatements(declaration.getText())
  }
  for (const statement of selected) {
    entry.addStatements(statement.getText().replace(/^export\s+/, ""))
  }
  entry.organizeImports()
  return entry.getFullText()
}
