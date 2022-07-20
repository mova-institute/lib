import { wrappedOrNull } from '../../lang'
import { Mu } from '../../mu'
import { AbstractElement } from '../xmlapi/abstract_element'
import { mixin } from '../xmlapi/utils'
import { nodeOrElementOrNull } from './utils'
import { WebapiAttribute } from './webapi_attribute'
import { WebapiNode } from './webapi_node'

@mixin(AbstractElement)
export class WebapiElement extends WebapiNode implements AbstractElement {
  constructor(protected wrapee: HTMLElement) {
    super(wrapee)
  }

  native() {
    return this.wrapee
  }

  namespaceUri() {
    return this.wrapee.namespaceURI
  }

  namespacePrefix() {
    // todo: track https://bugzilla.mozilla.org/show_bug.cgi?id=312019
    return this.wrapee.lookupPrefix(this.namespaceUri())
  }

  localName() {
    return this.wrapee.localName
  }

  prefixedName() {
    return this.wrapee.tagName
  }

  hasAttributes() {
    return this.wrapee.hasAttributes()
  }

  attributes() {
    let { attributes } = this.wrapee
    let ret = new Array<WebapiAttribute>()
    for (let i = 0; i < attributes.length; ++i) {
      ret.push(new WebapiAttribute(attributes.item(i)))
    }
    return ret
  }

  // @ts-ignore
  firstChild() {
    return nodeOrElementOrNull(this.wrapee.firstChild)
  }

  // @ts-ignore
  lastChild() {
    return nodeOrElementOrNull(this.wrapee.lastChild)
  }

  // @ts-ignore
  lastElementChild() {
    return wrappedOrNull(WebapiElement, this.wrapee.lastElementChild)
  }

  // @ts-ignore
  child(index: number) {
    // todo
    return nodeOrElementOrNull(this.wrapee.childNodes.item(index))
  }

  firstElementChild() {
    return wrappedOrNull(WebapiElement, this.wrapee.firstElementChild)
  }

  previousElementSibling() {
    return wrappedOrNull(WebapiElement, this.wrapee.previousElementSibling)
  }

  nextElementSibling() {
    return wrappedOrNull(WebapiElement, this.wrapee.nextElementSibling)
  }

  // @ts-ignore
  appendChild(child: WebapiNode) {
    this.wrapee.appendChild((child as WebapiElement).wrapee) // see http://stackoverflow.com/a/13723325/5271870
    return child
  }

  attribute(name: string) {
    return this.wrapee.getAttribute(name)
  }

  attributeNs(nsUri: string, localName: string) {
    return this.wrapee.getAttributeNS(nsUri, localName)
  }

  // @ts-ignore
  attributesObj() {
    throw new Error('Not implemented')
  }

  // @ts-ignore
  setAttribute(name: string, value: string | number) {
    if (value === undefined) {
      this.removeAttribute(name)
    } else {
      this.wrapee.setAttribute(name, value.toString())
    }
    return this
  }

  renameAttributeIfExists(nameOld: string, nameNew: string) {
    throw new Error('renameAttribute() not implemented for WebapiElement yet')
  }

  removeAttribute(name: string) {
    this.wrapee.removeAttribute(name)
  }

  buildNsMap() {
    let ret: any = {}
    // for (let el of merge(this, this.walkAncestors())) {
    //   for (let attribute of el.getAttributes()) {
    //     let prefix = attribute.namespacePrefix;
    //     if (prefix === 'xmlns' && !(prefix in ret)) {
    //       ret[attribute.localName] = attribute.value;
    //     }
    //     else if (!prefix && attribute.localName === 'xmlns' && !('' in ret)) {
    //       ret[''] = attribute.value;
    //     }
    //   }
    // }
    return ret
  }

  serialize() {
    return this.wrapee.outerHTML
  }

  serializeChildren() {
    return this.wrapee.innerHTML
  }

  // @ts-ignore
  clone() {
    return super.clone() as WebapiElement
  }

  // mixins
  name: () => string
  attributeUp: (name: string) => string
  // @ts-ignore
  prependChild: () => WebapiNode
  // @ts-ignore
  children: () => Mu<WebapiNode | WebapiElement>
  // @ts-ignore
  rchildren: () => Mu<WebapiNode | WebapiElement>
  // @ts-ignore
  elementChildren: () => Mu<WebapiElement>
  elementChild: (index: number) => WebapiElement
  countChildren: () => number
  countElementChildren: () => number
  getElementChild: (index: number) => WebapiElement
  clear: () => void
  // @ts-ignore
  setAttributes: (keyvalue: Object) => WebapiElement
  // @ts-ignore
  unwrap: () => WebapiElement
  // @ts-ignore
  rewrap: (replacement: WebapiElement) => WebapiElement
}
