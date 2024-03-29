import { Dict } from '../types'
import { AbstractElement } from './xmlapi/abstract_element'
import { AbstractNode } from './xmlapi/abstract_node'

// todo: move out
export const NS = {
  xml: 'http://www.w3.org/XML/1998/namespace',
  xhtml: 'http://www.w3.org/1999/xhtml',
  tei: 'http://www.tei-c.org/ns/1.0',
  mi: 'http://mova.institute/ns/corpora/0.1',
}

export function cantBeXml(str: string) {
  return !/^\s*\</.test(str)
}

export function escapeText(value: string) {
  // todo: call he everywhere directly
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;')
}

export function unescape(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

export function renameTag(xmlstr: string, from: string, to: string) {
  return xmlstr.replace(
    new RegExp(String.raw`<\s*${from}([\s>])`, 'g'),
    `<${to}$1`,
  )
}

export function removeTags(value: string) {
  return value.replace(/<[^>]+>/g, '')
}

export function removeElements(xmlstr: string, names: Array<string>) {
  let namesRe = names.join('|')
  let re = new RegExp(
    String.raw`<\s*(${namesRe})[^>]*>[^<]*</\s*(${namesRe})\s*>`,
    'g',
  )
  return xmlstr.replace(re, '')
}

export function xmlNsResolver(prefix: string) {
  return NS[prefix] || null
}

export function nameNs(ns: string, name: string) {
  return `{${ns}}${name}`
}

export function namePrefixed(prefix: string, name: string) {
  return prefix ? `${prefix}:${name}` : name
}

export function removeXmlns(xmlstr: string) {
  return xmlstr.replace(/ xmlns(:\w+)?\s*=\s*"[^"]+"/g, '')
}

export function removeNamespacing(xmlstr: string) {
  let ret = removeXmlns(xmlstr)
  ret = ret.replace(/<\s*(\/)?\s*\w+:/g, '<$1')
  return ret
}

export function removeRoot(xmlstr: string) {
  return xmlstr
    .replace(/^\s*(<\?xml[^>]+\?>)?\s*<[^>]+>/, '')
    .replace(/<\/[^>]+>\s*$/, '')
}

export function removeProcessingInstructions(xmlstr: string) {
  let len
  do {
    len = xmlstr.length
    xmlstr = xmlstr.replace(/^\s*<(\?|!DOCTYPE)[^>]*>\s*/, '')
  } while (len !== xmlstr.length)

  return xmlstr
}

export function encloseInRoot(xmlstr: string, rootName = 'root') {
  return `<${rootName}>${xmlstr}</${rootName}>`
}

export function encloseInRootNs(
  value: string,
  rootName = 'mi:fragment',
  ns = ['tei', 'mi'],
) {
  let ret = '<' + rootName
  if (NS[ns[0]]) {
    ret += ' xmlns="' + NS[ns[0]] + '"'
  }
  for (let i = 1; i < ns.length; ++i) {
    ret += ' xmlns:' + ns[i] + '="' + NS[ns[i]] + '"'
  }
  ret += '>\n  ' + value + '\n</' + rootName + '>'

  return ret
}

export function encloseInRootNsIf(
  value: string,
  rootName = 'mi:fragment',
  ns = ['tei', 'mi'],
) {
  if (cantBeXml(value)) {
    value = encloseInRootNs(value, rootName, ns)
  }

  return value
}

export function keyvalue2attributesNormalized(obj: any) {
  return Object.keys(obj)
    .filter((key) => key.trim() && obj[key] !== undefined)
    .map((key) => {
      let value = obj[key].toString().replace(/\s+/g, ' ').trim()
      value = escapeText(value)
      return `${key}="${value}"`
    })
    .join(' ')
}

export function parseTagStr(value: string) {
  let match = value.match(
    /^<(\/)?([\w\-]+)((?:\s+[\w\-]+="[^"]*")*)*\s*(\/)?\s*>(?:([^<]*)<\/\2>)?$/,
  )
  if (match) {
    let [, closer, name, attributes, empty, content] = match
    return {
      name,
      isClosing: Boolean(closer),
      attributes:
        (attributes && parseAttributeStr(attributes.trim())) || undefined,
      empty: Boolean(empty),
      content,
    }
  }
}

export function parseAttributeStr(value: string) {
  let ret: Dict<string> = {}

  let re = /(\w+)="([^"]+)"\s*/g
  let matchArray
  while ((matchArray = re.exec(value)) !== null) {
    ret[matchArray[1]] = matchArray[2]
  }

  return ret
}

export function tagStr(
  open: boolean,
  prefix: string,
  elem: string,
  attrs = new Map(),
) {
  if (!open) {
    return `</${namePrefixed(prefix, elem)}>`
  }
  let ret = `<${namePrefixed(prefix, elem)}`
  for (let [key, value] of attrs.entries()) {
    ret += ` ${key}="${value}"`
  }
  ret += '>'

  return ret
}

export function tagStr2(name: string, closing: boolean, attrs?: any) {
  let res = '<'
  if (closing) {
    res += '/'
  }
  res += name
  if (!closing && attrs) {
    let attrStr = keyvalue2attributesNormalized(attrs)
    if (attrStr) {
      res += ' ' + attrStr
    }
  }
  return res + '>'
}

export function libxmlSaxAttrs(attrs: Array<[string, string, string, string]>) {
  let ret = new Map()
  for (let [name, , , val] of attrs) {
    ret.set(name, val)
  }

  return ret
}

export function traverseDepthEl(
  node: AbstractNode,
  onEnter: (el: AbstractElement) => any,
  onLeave?: (el: AbstractElement) => any,
) {
  traverseDepth(node, callbackIfElement(onEnter), callbackIfElement(onLeave))
}

export type TraverseDirective = 'skip' | 'stop' | void
export type ITraverseCallback = (el: AbstractNode) => TraverseDirective
export function traverseDepth(
  node: AbstractNode,
  onEnter: ITraverseCallback,
  onLeave?: ITraverseCallback,
) {
  let directive = onEnter(node)
  if (directive === 'stop') {
    return false
  }
  if (directive !== 'skip' && node.isElement()) {
    for (
      let cur = node.asElement().firstChild(), next = cur && cur.nextSibling();
      cur;
      cur = next, next = next && next.nextSibling()
    ) {
      if (!traverseDepth(cur, onEnter, onLeave)) {
        return false
      }
    }
  }

  if (onLeave) {
    onLeave(node)
  }
}

export function* traverseDepthGen2(
  node: AbstractNode,
): IterableIterator<{ node: AbstractNode; entering: boolean }> {
  let directive = yield { node, entering: true }
  if (directive === 'stop') {
    return false
  }
  if (directive !== 'skip' && node.isElement()) {
    for (
      let curNode = node.asElement().firstChild(),
        next = curNode && curNode.nextSibling();
      curNode;
      curNode = next, next = next && next.nextSibling()
    ) {
      if ((yield* traverseDepthGen2(curNode)) === false) {
        return false
      }
    }
  }
  yield { node, entering: false }
}

export function* traverseDepthGen(
  node: AbstractNode,
): IterableIterator<{ node: AbstractNode; entering: boolean }> {
  yield { node, entering: true }

  if (node.isElement()) {
    for (
      let curNode = node.asElement().firstChild(),
        next = curNode && curNode.nextSibling();
      curNode;
      curNode = next, next = next && next.nextSibling()
    ) {
      yield* traverseDepthGen(curNode)
    }
  }

  yield { node, entering: false }
}

export function* traverseDocumentOrderGen(
  node: AbstractNode,
): IterableIterator<{ node: AbstractNode; entering: boolean }> {
  let curNode = node
  for (; curNode; curNode = curNode.nextSibling()) {
    yield* traverseDepthGen(curNode)
  }
  for (curNode = node && node.parent(); curNode; curNode = curNode.parent()) {
    if (curNode.nextSibling()) {
      yield* traverseDocumentOrderGen(curNode.nextSibling())
      break
    }
  }
}

export function traverseDocumentOrder(
  node: AbstractNode,
  onEnter: ITraverseCallback,
  onLeave?: ITraverseCallback,
) {
  let curNode = node
  for (; curNode; curNode = curNode.nextSibling()) {
    if (!traverseDepth(curNode, onEnter, onLeave)) {
      return false
    }
  }
  for (curNode = node && node.parent(); curNode; curNode = curNode.parent()) {
    if (curNode.nextSibling()) {
      if (!traverseDocumentOrder(curNode.nextSibling(), onEnter, onLeave)) {
        return false
      }
      break
    }
  }
}

export function traverseDocumentOrderEl(
  node: AbstractNode,
  onEnter: (el: AbstractElement) => TraverseDirective,
  onLeave?: (el: AbstractElement) => TraverseDirective,
) {
  traverseDocumentOrder(
    node,
    callbackIfElement(onEnter),
    callbackIfElement(onLeave),
  )
}

export function nextElDocumentOrder(
  context: AbstractElement,
  elsOfInterest?: Set<string>,
) {
  let ret: AbstractElement | undefined
  traverseDocumentOrder(
    context,
    callbackIfElement((el) => {
      if (
        !context.isSame(el) &&
        (!elsOfInterest ||
          !elsOfInterest.size ||
          elsOfInterest.has(el.localName()))
      ) {
        ret = el
        return 'stop'
      }
    }),
  )

  return ret
}

export function walkUpUntil(
  node: AbstractNode,
  predicate: (node: AbstractNode) => boolean,
) {
  while (node && predicate(node.parent())) {
    node = node.parent()
  }

  return node
}

export function nLevelsDeep(node, n: number) {
  while (node && n--) {
    node = node.firstChild // todo: element?
  }

  return node
}

function callbackIfElement(cb?: (el: AbstractElement) => TraverseDirective) {
  return (node) => {
    if (cb && node.isElement()) {
      return cb(node)
    }
  }
}

export function sortChildElements(
  el: AbstractElement,
  compare: (a: AbstractElement, b: AbstractElement) => number,
) {
  let childrenSorted = el.elementChildren().toArray().sort(compare)
  for (let child of childrenSorted) {
    el.appendChild(child.remove())
  }
}

export function autofixSomeEntitites(xmlstr: string) {
  return xmlstr.replace(/&(?!(amp|quot|lt|gt);)/g, '&amp;')
}
