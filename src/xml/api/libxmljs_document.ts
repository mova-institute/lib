import { AbstractDocument } from './abstract_document';
import { LibxmlElement } from './libxmljs_element';
import { LibxmlNode } from './libxmljs_node';

const libxmljs = require('libxmljs');



export class LibxmlDocument extends AbstractDocument {

  static parse(xmlString: string) {
    return new LibxmlDocument(libxmljs.parseXmlString(xmlString));
  }

  constructor(private wrapee) {
    super();
  }

  get native() {
    return this.wrapee;
  }

  get root() {
    return new LibxmlElement(this.wrapee.root());
  }

  createElement(name: string) {
    let [localName, prefix] = name.split(':').reverse();
    let el = new libxmljs.Element(this.wrapee, localName);
    if (prefix) {
      el.namespace(this.getNsByPrefix(prefix));
    }

    return new LibxmlElement(el);
  }

  createTextNode(value: string) {
    return new LibxmlNode(new libxmljs.Text(this.wrapee, value));
  }

  serialize() {
    return this.wrapee.root().toString(/*{
     // declaration: false,
     // format: true,
     // whitespace: true,
     // type: 'xml',
     }*/);
  }

  equals(other: LibxmlDocument) {
    return this.wrapee === other.wrapee;
  }

  private getNsByPrefix(prefix: string) {
    return this.wrapee.root().namespaces().find(x => x.prefix() === prefix);
  }
}
