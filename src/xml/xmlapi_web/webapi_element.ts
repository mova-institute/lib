import { WebapiNode } from './webapi_node'
import { WebapiAttribute } from './webapi_attribute'
import { nodeOrElementOrNull } from './utils'
import { mixin } from '../xmlapi/utils'
import { AbstractElement } from '../xmlapi/abstract_element'
import { Mu } from '../../mu'
import { wrappedOrNull } from '../../lang'



////////////////////////////////////////////////////////////////////////////////
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

  namespacePrefix() {  // todo: track https://bugzilla.mozilla.org/show_bug.cgi?id=312019
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
    let attributes = this.wrapee.attributes
    let ret = new Array<WebapiAttribute>()
    for (let i = 0; i < attributes.length; ++i) {
      ret.push(new WebapiAttribute(attributes.item(i)))
    }
    return ret
  }

  firstChild() {
    return nodeOrElementOrNull(this.wrapee.firstChild)
  }

  lastChild() {
    return nodeOrElementOrNull(this.wrapee.lastChild)
  }

  lastElementChild() {
    return wrappedOrNull(WebapiElement, this.wrapee.lastElementChild)
  }

  child(index: number) {  // todo
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

  appendChild(child: WebapiNode) {
    this.wrapee.appendChild((child as WebapiElement).wrapee)  // see http://stackoverflow.com/a/13723325/5271870
    return child
  }

  attribute(name: string) {
    return this.wrapee.getAttribute(name)
  }

  attributeNs(nsUri: string, localName: string) {
    return this.wrapee.getAttributeNS(nsUri, localName)
  }

  attributesObj() {
    throw new Error('Not implemented')
  }

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

  clone() {
    return super.clone() as WebapiElement
  }


  // mixins
  name: () => string
  attributeUp: (name: string) => string
  prependChild: () => WebapiNode
  children: () => Mu<WebapiNode | WebapiElement>
  rchildren: () => Mu<WebapiNode | WebapiElement>
  elementChildren: () => Mu<WebapiElement>
  elementChild: (index: number) => WebapiElement
  countChildren: () => number
  countElementChildren: () => number
  getElementChild: (index: number) => WebapiElement
  clear: () => void
  setAttributes: (keyvalue: Object) => WebapiElement
  unwrap: () => WebapiElement
  rewrap: (replacement: WebapiElement) => WebapiElement
}
