import { LibxmljsElement } from './libxmljs_element'
import { LibxmljsNode } from './libxmljs_node'
import { AbstractDocument } from '../xmlapi/abstract_document'
import { isOddball } from '../xmlapi/utils'

declare const require // because libxmljs typings are wrong and outdated (May 2016)
const libxmljs = require('libxmljs')

export class LibxmljsDocument extends AbstractDocument {
  static parse(xmlString: string) {
    return new LibxmljsDocument(libxmljs.parseXmlString(xmlString))
  }

  constructor(private wrapee?) {
    super()
    this.wrapee = wrapee || new libxmljs.Document()
  }

  native() {
    return this.wrapee
  }

  root() {
    return new LibxmljsElement(this.wrapee.root())
  }

  equals(other: LibxmljsDocument) {
    return !isOddball(other) && other.wrapee === this.wrapee
  }

  createElement(name: string, nsUri?: string) {
    let el
    if (nsUri) {
      el = new libxmljs.Element(this.wrapee, name)
      let ns = this.wrapee
        .root()
        .namespaces()
        .find((x) => x.href() === nsUri) // todo
      el.namespace(ns || nsUri)
    } else {
      let [localName, prefix] = name.split(':').reverse()
      el = new libxmljs.Element(this.wrapee, localName)
      if (prefix) {
        el.namespace(this.getNsByPrefix(prefix))
      }
    }

    return new LibxmljsElement(el)
  }

  createTextNode(value: string) {
    return new LibxmljsNode(new libxmljs.Text(this.wrapee, value))
  }

  serialize(pretty = false) {
    let ret = this.wrapee.root().toString(pretty)
    // if (pretty) {
    //   ret = prettify(ret);
    // }
    return ret
  }

  private getNsByPrefix(prefix: string) {
    return this.wrapee
      .root()
      .namespaces()
      .find((x) => x.prefix() === prefix)
  }
}
