import { AbstractNode } from './abstract_node'
import { AbstractAttribute } from './abstract_attribute'
import { mu, Mu } from '../../mu'



export abstract class AbstractElement extends AbstractNode {

  /*
   * names
   */

  abstract localName(): string
  abstract prefixedName(): string

  name() {
    let ns = this.namespaceUri()
    if (ns) {
      return '{' + ns + '}' + this.localName()
    }
    return this.localName()
  }

  abstract namespaceUri(): string
  abstract namespacePrefix(): string


  /*
   * children
   */

  children(): Mu<AbstractNode> {
    if (!this.firstChild()) {
      return mu([])
    }
    return Mu.chain([this.firstChild()], this.firstChild().nextSiblings())
  }

  elementChildren() {
    return this.children().filter(x => x.isElement()) as Mu<AbstractElement>
  }

  abstract firstChild(): AbstractNode

  firstElementChild() {
    return this.elementChildren().next().value || null
  }

  abstract child(index: number): AbstractNode

  elementChild(index: number) {
    return this.elementChildren().drop(index).next().value || null  // todo: wait for method in wu
  }

  abstract lastChild(): AbstractNode

  lastElementChild() {
    return this.rchildren().filter(x => x.isElement()).next().value as AbstractElement || null
  }

  rchildren(): Mu<AbstractNode> {
    if (!this.lastChild()) {
      return mu([])
    }
    return Mu.chain([this.lastChild()], this.lastChild().previousSiblings())
  }

  countChildren() {
    return this.children().length()  // todo: wait for .count() in wu
  }

  countElementChildren() {
    return this.children().filter(x => x.isElement()).length()  // todo: wait for .count() in wu
  }

  clear() {
    for (let child = this.firstChild(); child; child = this.firstChild()) {
      child.remove()
    }
  }


  /*
   * manipulation
   */

  prependChild(child: AbstractNode) {
    if (this.firstChild()) {
      this.firstChild().insertBefore(child)
    } else {
      this.appendChild(child)  // see http://stackoverflow.com/a/13723325/5271870
    }
    return child
  }

  abstract appendChild(child: AbstractNode): AbstractNode


  /*
   * attributes
   */

  abstract hasAttributes(): boolean
  abstract attributes(): AbstractAttribute[]
  abstract attributeNs(nsUri: string, localName: string): string
  abstract attribute(name: string): string
  abstract setAttribute(name: string, value: string | number): AbstractElement
  abstract removeAttribute(name: string)
  abstract renameAttributeIfExists(nameOld: string, nameNew: string)

  // attributeDefault(name: string, defaultValue = '') {
  //   let ret = this.attribute(name)
  //   if (ret === undefined) {
  //     return defaultValue
  //   }
  //   return ret
  // }

  attributeUp(name: string) {
    for (let cursor = this as AbstractElement /* wut?? */; cursor; cursor = cursor.parent()) {
      let value = cursor.attribute(name)
      if (value !== null) {
        return value
      }
    }
  }

  setAttributes(keyvalue: Object): AbstractElement {  // todo: remove return typing when ts 2.0 comes out, see https://github.com/Microsoft/TypeScript/issues/3694
    for (let key of Object.keys(keyvalue)) {
      this.setAttribute(key, keyvalue[key])
    }

    return this
  }

  attributesObj() {
    let ret: any = {}
    this.attributes().forEach(x => ret[x.nameLocal().toString()] = x.value().toString())
    // this.attributes().forEach(x => console.log(x.value()))
    return ret
  }

  /*
   * other
   */

  lang() {  // ancestor-or-self::*[@xml:lang][1]/@xml:lang
    return Mu.chain([this], this.ancestors())
      .map(x => x.attribute('lang'))
      .find(x => x !== null)
  }

  abstract buildNsMap(): { [prefix: string]: string }

  unwrap() {
    while (this.firstChild()) {
      this.insertBefore(this.firstChild())  // todo: test webapi without remove()
    }

    return this.remove() as AbstractElement
  }

  rewrap(replacement: AbstractElement) {
    while (this.firstChild()) {
      replacement.appendChild(this.firstChild())
    }
    this.replace(replacement)

    return replacement
  }

  // serializeChildren() {
  //   return [...this.children().map(x => x.serialize())].join('');  // todo add join to wu
  // }

  abstract clone(): AbstractElement
}
