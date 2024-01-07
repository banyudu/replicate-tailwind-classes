import path from 'path'
import { Project, Node, SyntaxKind, StringLiteral } from 'ts-morph'

/**
 * Recursively walk all child nodes of given node, include self
 * @param node root node
 * @param callback callback function, return false to stop walk
 */
export function walk (node: Node, callback: (node: Node) => boolean): boolean {
  return _walk(node, callback, new Set())
}

function _walk (node: Node, callback: (node: Node) => boolean, parsed: Set<Node>): boolean {
  try {
    if (parsed.has(node) || node.compilerNode === null) {
      return false
    }
    parsed.add(node)
  } catch (error) {
    return false
  }

  const children = node.getChildren()

  // visit root node
  if (!callback(node)) {
    return false
  }

  // visit children, depth-first-search
  for (let i = 0; i < children.length; i++) {
    if (!_walk(children[i], callback, parsed)) {
      return false
    }
  }
  return true
}

const sizeModifiers = [
  'xxs',
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  '2xl',
  '3xl',
  '4xl',
  '5xl',
  '6xl',
  '7xl',
  'tablet',
  'widescreen',
  'mobile',
  'desktop',
  'laptop'
]

const transformTailwindClassname = (text: string, prefix = 'md'): string => {
  return text.trim().split(/\s+/).map(item => {
    if (sizeModifiers.some(modifier => item.includes(`${modifier}:`)) || !item) {
      return item
    }
    const toAppend = `${prefix}:${item}`
    if (!text.includes(toAppend)) {
      return `${item} ${prefix}:${item}`
    }
    return item
  }).join(' ')
}

const isInsideFunction = (node: Node, funcName?: string): boolean => {
  let parentNode = node.getParent()
  let lastParentNode = node

  while (parentNode && parentNode !== lastParentNode) {
    if (parentNode.getKind() === SyntaxKind.CallExpression) {
      const innerFuncName = parentNode.getFirstChild()?.getText()
      if (!funcName || innerFuncName === funcName) {
        return true
      }
    }
    lastParentNode = parentNode
    parentNode = parentNode.getParent()
  }
  return false
}

const isTailwindCss = (node: StringLiteral): boolean => {
  const textNode = node as StringLiteral
  const text = textNode.getLiteralText()
  const patterns = [
    'flex',
    'hidden',
    'top-',
    'left-',
    'bottom-',
    'right-',
    'inset-',
    'w-',
    'h-',
    'text-',
    'max-',
    'min-',
    'bg-',
    'border-',
    'font-',
    'z-'
  ]

  const arr = text.trim().split(/\s+/)
  const strMatch = patterns.some(pattern => arr.some(item => item.startsWith(pattern)))

  const parentNode = textNode.getParent()
  if (parentNode) {
    if (parentNode.getKind() === SyntaxKind.JsxAttribute) {
      const attrNode = parentNode as any
      const attrName = attrNode.getNameNode().getText()
      if (attrName === 'className' || attrName === 'class') {
        return true
      }
    } else if (parentNode.getKind() === SyntaxKind.CallExpression) {
      const funcName = parentNode.getFirstChild()?.getText()
      if (funcName === 'cn' || funcName === 'twMerge') {
        return true
      }
    } else if (isInsideFunction(node, 'cn') || isInsideFunction(node, 'twMerge')) {
      return true
    } else if (strMatch) {
      return true
    }
  }
  return false
}

const walkTailwindcss = (node: Node): boolean => {
  if (node.getKind() === SyntaxKind.StringLiteral) {
    const textNode = node as StringLiteral
    if (isTailwindCss(textNode)) {
      const text = textNode.getLiteralText()
      textNode.setLiteralValue(transformTailwindClassname(text))
    }
  }
  return true
}

const replicateTailwindClasses = async (pkgRoot: string) => {
  // create project
  const project = new Project({
    tsConfigFilePath: path.join(pkgRoot, 'tsconfig.json')
  })

  // loop files
  const files = project.getSourceFiles()
  for (const file of files) {
    walk(file, walkTailwindcss)
    file.saveSync()
  }
}

export default replicateTailwindClasses