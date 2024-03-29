import { mu, Mu } from '../../mu'
import { AbstractNode, XmlapiXpathResult } from '../xmlapi/abstract_node'
import { isOddball, NS_XML, wrappedOrNull } from '../xmlapi/utils'
import {
  generateFromXpathResultIterator,
  generateFromXpathResultSnapshot,
  isNode,
  nodeOrElement,
  nodeOrElementOrAttribute,
  nodeOrElementOrNull,
} from './utils'
import { WebapiAttribute } from './webapi_attribute'
import { WebapiDocument } from './webapi_document'
import { WebapiElement } from './webapi_element'

export class WebapiNode extends AbstractNode {
  constructor(protected wrapee: Node) {
    super()
  } // todo: protected

  native() {
    return this.wrapee
  }

  // @ts-ignore
  document() {
    return wrappedOrNull(WebapiDocument, this.wrapee.ownerDocument)
  }

  // @ts-ignore
  parent() {
    return wrappedOrNull(WebapiElement, this.wrapee.parentElement)
  }

  // @ts-ignore
  previousSibling() {
    return nodeOrElementOrNull(this.wrapee.previousSibling)
  }

  // @ts-ignore
  nextSibling() {
    return nodeOrElementOrNull(this.wrapee.nextSibling)
  }

  text(value?: string) {
    if (value === undefined) {
      return this.wrapee.textContent
    }
    this.wrapee.textContent = value
  }

  type(): 'element' | 'text' | 'comment' | 'cdata' {
    switch (this.wrapee.nodeType) {
      case Node.ELEMENT_NODE:
        return 'element'
      case Node.TEXT_NODE:
        return 'text'
      case Node.COMMENT_NODE:
        return 'comment'
      case Node.CDATA_SECTION_NODE:
        return 'cdata'
      default:
        throw new Error(`Unexpected Node type: ${this.wrapee.nodeType}`)
    }
  }

  // @ts-ignore
  isSame(other: WebapiNode) {
    return !isOddball(other) && other.wrapee === this.wrapee
  }

  // @ts-ignore
  remove() {
    this.wrapee.parentNode.removeChild(this.wrapee)
    return this
  }

  // @ts-ignore
  replace(replacement: WebapiNode) {
    this.wrapee.parentNode.replaceChild(replacement.wrapee, this.wrapee)
  }

  // @ts-ignore
  insertBefore(newNode: WebapiNode) {
    this.wrapee.parentNode.insertBefore(newNode.wrapee, this.wrapee)
    return this
  }

  // @ts-ignore
  insertAfter(newNode: WebapiNode) {
    this.wrapee.parentNode.insertBefore(newNode.wrapee, this.wrapee.nextSibling)
    return this
  }

  getPath(): string {
    throw new Error('Not implemented') // todo
  }

  evaluate(xpath: string, nsMap?: Record<string, string>): XmlapiXpathResult {
    let result = this.wrapee.ownerDocument.evaluate(
      xpath,
      this.wrapee,
      createNsResolver(nsMap),
      XPathResult.ANY_TYPE,
      null,
    )

    switch (result.resultType) {
      case XPathResult.BOOLEAN_TYPE:
        return result.booleanValue
      case XPathResult.NUMBER_TYPE:
        return result.numberValue
      case XPathResult.STRING_TYPE:
        return result.stringValue
      case XPathResult.FIRST_ORDERED_NODE_TYPE:
        // @ts-ignore
        return nodeOrElementOrNull(result.singleNodeValue)
      case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
      case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
        // @ts-ignore
        return mu(generateFromXpathResultIterator(result)).map((x) =>
          nodeOrElementOrAttribute(x),
        )
      case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
      case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
        // @ts-ignore
        return mu(generateFromXpathResultSnapshot(result)).map((x) =>
          nodeOrElementOrAttribute(x),
        )
      default:
        throw new Error('Unexpected XPath result type')
    }
  }

  evaluateNode(xpath: string, nsMap?: Record<string, string>) {
    let wrapee = this.wrapee.ownerDocument.evaluate(
      xpath,
      this.wrapee,
      createNsResolver(nsMap),
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue
    if (!wrapee) {
      return null
    }
    if (!isNode(wrapee)) {
      throw new Error('Non-node XPath result')
    }
    return nodeOrElement(wrapee)
  }

  evaluateElement(xpath: string, nsMap?: Record<string, string>) {
    let ret = this.evaluateNode(xpath, nsMap)
    if (!ret) {
      return null
    }
    if (!ret.isElement()) {
      throw new Error('Non-element XPath result')
    }
    return ret as WebapiElement
  }

  evaluateAttribute(xpath: string, nsMap?: Record<string, string>) {
    let wrapee = this.wrapee.ownerDocument.evaluate(
      xpath,
      this.wrapee,
      createNsResolver(nsMap),
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null,
    ).singleNodeValue
    if (!wrapee) {
      return null
    }
    if (wrapee.nodeType !== Node.ATTRIBUTE_NODE) {
      throw new Error('Non-attribute XPath result')
    }
    return new WebapiAttribute(wrapee)
  }

  evaluateNodes(
    xpath: string,
    nsMap?: Record<string, string>,
  ): Mu<AbstractNode> {
    // @ts-ignore
    return this._evaluateManyOrdered(xpath, nsMap).map((x) => {
      if (!isNode(x)) {
        throw new Error('Xpath result is not a list of attributes')
      }
      return nodeOrElement(x)
    })
  }

  // @ts-ignore
  evaluateElements(xpath: string, nsMap?: Record<string, string>) {
    return this._evaluateManyOrdered(xpath, nsMap).map((x) => {
      if (x.nodeType !== Node.ELEMENT_NODE) {
        throw new Error('Xpath result is not a list of elements')
      }
      return new WebapiElement(x as HTMLElement)
    })
  }

  evaluateAttributes(xpath: string, nsMap?: Record<string, string>) {
    return this._evaluateManyOrdered(xpath, nsMap).map((x) => {
      if (x.nodeType !== Node.ATTRIBUTE_NODE) {
        throw new Error('Xpath result is not a list of attributes')
      }
      return new WebapiAttribute(x)
    })
  }

  serialize(): string {
    throw new Error('Not implemented') // todo
  }

  // @ts-ignore
  clone() {
    return nodeOrElement(this.wrapee.cloneNode(true))
  }

  protected _evaluateManyOrdered(
    xpath: string,
    nsMap?: Record<string, string>,
  ) {
    let result = this.wrapee.ownerDocument.evaluate(
      xpath,
      this.wrapee,
      createNsResolver(nsMap),
      XPathResult.ORDERED_NODE_ITERATOR_TYPE,
      null,
    )
    return mu(generateFromXpathResultIterator(result))
  }
}

export function createNsResolver(nsMap: Record<string, string>) {
  const defaultNsMap = {
    xml: NS_XML,
  }
  if (nsMap) {
    nsMap = { ...defaultNsMap, ...nsMap }
  } else {
    nsMap = defaultNsMap
  }
  return {
    lookupNamespaceURI(key) {
      return nsMap[key]
    },
  }
}
