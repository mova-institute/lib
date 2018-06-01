import { WebapiDocument } from './webapi_document'
import { WebapiElement } from './webapi_element'
import { WebapiAttribute } from './webapi_attribute'
import { nodeOrElement, nodeOrElementOrNull, nodeOrElementOrAttribute,
  generateFromXpathResultIterator, generateFromXpathResultSnapshot, isNode } from './utils'
import { AbstractNode, XmlapiXpathResult } from '../xmlapi/abstract_node'
import { wrappedOrNull, isOddball, NS_XML } from '../xmlapi/utils'
import { mu, Mu } from '../../mu'



////////////////////////////////////////////////////////////////////////////////
export class WebapiNode extends AbstractNode {
  constructor(protected wrapee: Node) {
    super()
  } // todo: protected

  native() {
    return this.wrapee
  }

  document() {
    return wrappedOrNull(WebapiDocument, this.wrapee.ownerDocument)
  }

  parent() {
    return wrappedOrNull(WebapiElement, this.wrapee.parentElement)
  }

  previousSibling() {
    return nodeOrElementOrNull(this.wrapee.previousSibling)
  }

  nextSibling() {
    return nodeOrElementOrNull(this.wrapee.nextSibling)
  }

  text(value?: string) {
    if (value !== undefined) {
      this.wrapee.textContent = value
    } else {
      return this.wrapee.textContent
    }
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
        throw new Error('Unexpected Node type: ' + this.wrapee.nodeType)
    }
  }

  isSame(other: WebapiNode) {
    return !isOddball(other) && other.wrapee === this.wrapee
  }

  remove() {
    this.wrapee.parentNode.removeChild(this.wrapee)
    return this
  }

  replace(replacement: WebapiNode) {
    this.wrapee.parentNode.replaceChild(replacement.wrapee, this.wrapee)
  }

  insertBefore(newNode: WebapiNode) {
    this.wrapee.parentNode.insertBefore(newNode.wrapee, this.wrapee)
  }

  insertAfter(newNode: WebapiNode) {
    this.wrapee.parentNode.insertBefore(newNode.wrapee, this.wrapee.nextSibling)
  }

  getPath(): string {
    throw new Error('Not implemented')  // todo
  }

  evaluate(xpath: string, nsMap?: Object): XmlapiXpathResult {
    let result = this.wrapee.ownerDocument.evaluate(
      xpath, this.wrapee, createNsResolver(nsMap), XPathResult.ANY_TYPE, null)

    switch (result.resultType) {
      case XPathResult.BOOLEAN_TYPE:
        return result.booleanValue
      case XPathResult.NUMBER_TYPE:
        return result.numberValue
      case XPathResult.STRING_TYPE:
        return result.stringValue
      case XPathResult.FIRST_ORDERED_NODE_TYPE:
        return nodeOrElementOrNull(result.singleNodeValue)
      case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
      case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
        return mu(generateFromXpathResultIterator(result)).map(x => nodeOrElementOrAttribute(x))
      case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
      case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
        return mu(generateFromXpathResultSnapshot(result)).map(x => nodeOrElementOrAttribute(x))
      default:
        throw new Error('Unexpected XPath result type')
    }
  }

  evaluateNode(xpath: string, nsMap?: Object) {
    let wrapee = this.wrapee.ownerDocument.evaluate(xpath, this.wrapee, createNsResolver(nsMap),
      XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    if (!wrapee) {
      return null
    }
    if (!isNode(wrapee)) {
      throw new Error('Non-node XPath result')
    }
    return nodeOrElement(wrapee)
  }

  evaluateElement(xpath: string, nsMap?: Object) {
    let ret = this.evaluateNode(xpath, nsMap)
    if (!ret) {
      return null
    }
    if (!ret.isElement()) {
      throw new Error('Non-element XPath result')
    }
    return ret as WebapiElement
  }

  evaluateAttribute(xpath: string, nsMap?: Object) {
    let wrapee = this.wrapee.ownerDocument.evaluate(xpath, this.wrapee, createNsResolver(nsMap),
      XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    if (!wrapee) {
      return null
    }
    if (wrapee.nodeType !== Node.ATTRIBUTE_NODE) {
      throw new Error('Non-attribute XPath result')
    }
    return new WebapiAttribute(wrapee)
  }

  evaluateNodes(xpath: string, nsMap?: Object): Mu<AbstractNode> {
    return this._evaluateManyOrdered(xpath, nsMap).map(x => {
      if (!isNode(x)) {
        throw new Error('Xpath result is not a list of attributes')
      }
      return nodeOrElement(x)
    })
  }

  evaluateElements(xpath: string, nsMap?: Object) {
    return this._evaluateManyOrdered(xpath, nsMap).map(x => {
      if (x.nodeType !== Node.ELEMENT_NODE) {
        throw new Error('Xpath result is not a list of elements')
      }
      return new WebapiElement(x as HTMLElement)
    })
  }

  evaluateAttributes(xpath: string, nsMap?: Object) {
    return this._evaluateManyOrdered(xpath, nsMap).map(x => {
      if (x.nodeType !== Node.ATTRIBUTE_NODE) {
        throw new Error('Xpath result is not a list of attributes')
      }
      return new WebapiAttribute(x)
    })
  }

  serialize(): string {
    throw new Error('Not implemented')  // todo
  }

  clone() {
    return nodeOrElement(this.wrapee.cloneNode(true))
  }

  protected _evaluateManyOrdered(xpath: string, nsMap?: Object) {
    let result = this.wrapee.ownerDocument.evaluate(
      xpath, this.wrapee, createNsResolver(nsMap), XPathResult.ORDERED_NODE_ITERATOR_TYPE, null)
    return mu(generateFromXpathResultIterator(result))
  }
}



//--------------------------------------------------------------------
export function createNsResolver(nsMap: Object) {
  const defaultNsMap = {
    'xml': NS_XML,
  }
  if (nsMap) {
    nsMap = {...defaultNsMap, ...nsMap}
  } else {
    nsMap = defaultNsMap
  }
  return {
    lookupNamespaceURI(key) {
      return nsMap[key]
    },
  }
}
