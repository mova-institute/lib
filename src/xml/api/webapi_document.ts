import { AbstractDocument } from './abstract_document';
import { WebapiElement } from './webapi_element';
import { WebapiNode } from './webapi_node';
import { wrappedOrNull } from './utils';



export class WebapiDocument extends AbstractDocument {

  private static parser: DOMParser;
  private static serializer: XMLSerializer;

  static parse(xmlString: string, parser?: DOMParser) {
    return new WebapiDocument((parser || this.getParser())
      .parseFromString(xmlString, 'application/xml'));
  }

  private static getParser() {
    return this.parser || (this.parser = new DOMParser());
  }

  private static getSerializer() {
    return this.serializer || (this.serializer = new XMLSerializer());
  }

  constructor(private wrapee: XMLDocument) {
    super();
  }

  get native() {
    return this.wrapee;
  }

  get root() {
    return wrappedOrNull(WebapiElement, this.wrapee.documentElement);
  }

  createElement(name: string) {
    let [, prefix] = name.split(':').reverse();
    let uri = this.wrapee.lookupNamespaceURI(prefix || null);
    let elem = this.wrapee.createElementNS(uri, name);

    return new WebapiElement(elem);
  }

  createTextNode(value: string) {
    return new WebapiNode(this.wrapee.createTextNode(value));
  }

  serialize() {
    return WebapiDocument.getSerializer().serializeToString(this.wrapee);
  }

  equals(other: WebapiDocument) {
    return this.wrapee === other.wrapee;
  }
}
