import { LibxmljsNode } from './libxmljs_node'
import { LibxmljsAttribute } from './libxmljs_attribute'
import { nodeOrElementOrNull } from './utils'
import { AbstractElement } from '../xmlapi/abstract_element'
import { mixin } from '../xmlapi/utils'
import { Mu } from '../../mu'




@mixin(AbstractElement)
export class LibxmljsElement extends LibxmljsNode implements AbstractElement {
  constructor(wrapee) {
    super(wrapee)
  }

  native() {
    return this.wrapee
  }

  namespaceUri() {
    let ns = this.wrapee.namespace()
    if (ns) {
      return ns.href() as string
    }
    return null
  }

  namespacePrefix() {
    let ns = this.wrapee.namespace()
    if (ns) {
      return ns.prefix() as string
    }
    return null
  }

  localName() {
    return this.wrapee.name() as string
  }

  prefixedName() {
    let ns = this.wrapee.namespace()
    if (ns && ns.prefix()) {
      return ns.prefix() + ':' + this.localName()
    }

    return this.localName()
  }

  firstChild() {
    return this.child(0)
  }

  child(index: number) {
    return nodeOrElementOrNull(this.wrapee.child(index))
  }

  // todo: make it constant-time in libxmljs!!
  // see https://github.com/libxmljs/libxmljs/issues/420
  lastChild() {
    let children = this.wrapee.childNodes()
    return nodeOrElementOrNull(children[children.length - 1])
  }

  lastElementChild() {
    let children = this.wrapee.childNodes()
    for (let i = children.length - 1; i >= 0; --i) {
      if (children[i].type() === 'element') {
        return new LibxmljsElement(children[i])
      }
    }
  }

  hasAttributes() {
    return !!this.wrapee.attrs().length  // todo: try constant time
  }

  attributes() {
    return this.wrapee.attrs().map(x => new LibxmljsAttribute(x)) as LibxmljsAttribute[]
  }

  attribute(name: string) {
    let attr = this.wrapee.attr(name)
    return attr === null ? null : attr.value() as string
  }

  attributeNs(nsUri: string, localName: string) {
    let attr = this.wrapee.attrs().find(
      x => x.namespace() && x.namespace().href() === nsUri && x.name() === localName)
    if (attr) {
      return attr.value()
    }
    return null
  }

  setAttribute(name: string, value: any) {
    if (value === undefined) {
      this.removeAttribute(name)
    } else {
      this.wrapee.attr({ [name]: value.toString() })
    }
    return this as LibxmljsElement  // todo
  }

  renameAttributeIfExists(nameOld: string, nameNew: string) {
    let attr = this.wrapee.attr(nameOld)
    if (attr) {
      this.wrapee.attr({ [nameNew]: attr.value() })
      attr.remove()
    }
  }

  removeAttribute(name: string) {
    let attr = this.wrapee.attr(name)
    if (attr) {
      attr.remove()
    }
  }

  appendChild(child: LibxmljsNode) {
    this.wrapee.addChild(child.native())  // see http://stackoverflow.com/a/13723325/5271870
    return child
  }

  buildNsMap() {
    let ret: { [prefix: string]: string } = {}
    // for (let el of merge(this, this.walkAncestors())) {
    //   let wrapee = (el as LibxmlElement).wrapee;
    //   for (let ns of wrapee.namespaces()) {
    //     let prefix = ns.prefix() || '';
    //     if (!(prefix in ret)) {
    //       ret[prefix] = ns.href();
    //     }
    //   }
    // }
    return ret
  }

  clone() {
    return super.clone() as LibxmljsElement
  }


  // mixins
  name: () => string
  attributeUp: (name: string) => string
  prependChild: () => LibxmljsNode
  children: () => Mu<LibxmljsNode>
  rchildren: () => Mu<LibxmljsNode>
  elementChildren: () => Mu<LibxmljsElement>
  elementChild: (index: number) => LibxmljsElement
  firstElementChild: () => LibxmljsElement
  setAttributes: (keyvalue: Object) => LibxmljsElement
  countChildren: () => number
  countElementChildren: () => number
  clear: () => void
  unwrap: () => LibxmljsElement
  rewrap: (replacement: LibxmljsElement) => LibxmljsElement
  attributesObj: () => any
}
