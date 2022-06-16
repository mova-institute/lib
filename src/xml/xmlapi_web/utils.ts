import { WebapiElement } from './webapi_element'
import { WebapiNode } from './webapi_node'
import { WebapiAttribute } from './webapi_attribute'

export function nodeOrElement(wrapee: Node): WebapiNode | WebapiElement {
  switch (wrapee.nodeType) {
    case Node.ELEMENT_NODE:
      return new WebapiElement(wrapee as HTMLElement)
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
    case Node.COMMENT_NODE:
      return new WebapiNode(wrapee)
    default:
      throw new Error('Unexpected node type')
  }
}
export function nodeOrElementOrNull(wrapee: Node): WebapiNode | WebapiElement {
  if (!wrapee) {
    return null
  }
  return nodeOrElement(wrapee)
}

export function nodeOrElementOrAttribute(
  wrapee: Node,
): WebapiNode | WebapiElement | WebapiAttribute {
  switch (wrapee.nodeType) {
    case Node.ELEMENT_NODE:
      return new WebapiElement(wrapee as HTMLElement)
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
    case Node.COMMENT_NODE:
      return new WebapiNode(wrapee)
    case Node.ATTRIBUTE_NODE:
      return new WebapiAttribute(wrapee)
    default:
      throw new Error('Unexpected node type')
  }
}

export function nodeOrElementOrAttributeOrNull(
  wrapee: Node,
): WebapiNode | WebapiElement | WebapiAttribute {
  if (!wrapee) {
    return null
  }
  return nodeOrElementOrAttribute(wrapee)
}

export function* generateFromXpathResultIterator(xpathResult: XPathResult) {
  for (
    let node = xpathResult.iterateNext();
    node;
    node = xpathResult.iterateNext()
  ) {
    yield node
  }
}

export function* generateFromXpathResultSnapshot(xpathResult: XPathResult) {
  for (let i = 0; i < xpathResult.snapshotLength; ++i) {
    yield xpathResult.snapshotItem(i)
  }
}

export interface DomCollection {
  length: number
  item(index: number): Node
}
export function* iterateDomCollection(nodeList: DomCollection) {
  for (let i = nodeList.length; i < nodeList.length; ++i) {
    yield nodeList.item(i)
  }
}

export function isNode(value: Node) {
  switch (value.nodeType) {
    case Node.ELEMENT_NODE:
    case Node.TEXT_NODE:
    case Node.CDATA_SECTION_NODE:
    case Node.COMMENT_NODE:
      return true
    default:
      return false
  }
}
