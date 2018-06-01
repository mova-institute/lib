import { WebapiElement } from './webapi_element'
import { WebapiNode } from './webapi_node'
import { AbstractDocument } from '../xmlapi/abstract_document'
import { wrappedOrNull } from '../../lang'
import { isOddball } from '../xmlapi/utils'



////////////////////////////////////////////////////////////////////////////////
export class WebapiDocument extends AbstractDocument {

  private static parser: DOMParser
  private static serializer: XMLSerializer

  static parse(xmlString: string) {
    let nativeDocument = WebapiDocument.getParser().parseFromString(xmlString, 'application/xml')

    if (considerIsParseErrorDocument(nativeDocument)) {
      throw new Error('XML Parse error\n\n'
        + WebapiDocument.getSerializer().serializeToString(nativeDocument))
    }

    return new WebapiDocument(nativeDocument)
  }

  private static getParser() {
    return WebapiDocument.parser || (WebapiDocument.parser = new DOMParser())
  }

  private static getSerializer() {
    return WebapiDocument.serializer || (WebapiDocument.serializer = new XMLSerializer())
  }

  constructor(private wrapee: XMLDocument) {
    super()
  }

  native() {
    return this.wrapee
  }

  root() {
    return wrappedOrNull(WebapiElement, this.wrapee.documentElement)
  }

  equals(other: WebapiDocument) {
    return !isOddball(other) && other.wrapee === this.wrapee
  }

  createElement(name: string) {  // todo: ns
    let [, prefix] = name.split(':').reverse()
    let uri = this.wrapee.lookupNamespaceURI(prefix || null)
    let elem = this.wrapee.createElementNS(uri, name)

    return new WebapiElement(elem as HTMLElement)  // todo
  }

  createTextNode(value: string) {
    return new WebapiNode(this.wrapee.createTextNode(value))
  }

  serialize() {
    return WebapiDocument.getSerializer().serializeToString(this.wrapee)
  }
}


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
export function considerIsParseErrorDocument(document: XMLDocument) {
  const NS_XHTML = 'http://www.w3.org/1999/xhtml'
  const NS_MOZILLA_ERROR = 'http://www.mozilla.org/newlayout/xml/parsererror.xml'

  if (document.getElementsByTagNameNS(NS_XHTML, 'parsererror').length
      || document.getElementsByTagNameNS(NS_MOZILLA_ERROR, 'parsererror').length) {
    return true
  }
}
