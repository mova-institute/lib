import { AbstractDocument, AbstractNode, AbstractElement } from './interface';
import { wrappedOrNull, ithGenerated, countGenerated, mixin } from '../../lang';
const libxmljs = require('libxmljs');  // May 2016: current typings are wrong, use none


////////////////////////////////////////////////////////////////////////////////
export class LibxmlDocument extends AbstractDocument {

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
     //format: true,
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

////////////////////////////////////////////////////////////////////////////////
export class LibxmlNode extends AbstractNode {
  constructor(protected wrapee) {
    super();
  }

  get native() {
    return this.wrapee;
  }

  equals(other: LibxmlNode) {
    return other && this.wrapee === other.wrapee;
  }

  isElement() {
    return this.wrapee.type() === 'element';
  }

  isText() {
    return this.wrapee.type() === 'text';
  }

  isRoot() {
    return this.wrapee === this.wrapee.doc().root();
  }

  get name() {
    let type = this.wrapee.type();
    if (type === 'element') {
      return this.wrapee.name();
    }
    return '#' + this.wrapee.type();
  }

  get text() {
    return this.wrapee.text();
  }

  set text(val: string) {
    this.wrapee.text(val);
  }

  get document() {
    return wrappedOrNull(LibxmlDocument, this.wrapee.doc());
  }

  get firstChild() {
    if (!this.isElement()) {
      return null;
    }

    return switchReturnNodeType(this.wrapee.child(0));
  }

  get nextSibling() {
    return switchReturnNodeType(this.wrapee.nextSibling());
  }

  get parent() {
    if (this.isRoot()) {
      return null;
    }

    return new LibxmlElement(this.wrapee.parent());
  }

  remove() {
    return wrappedOrNull(LibxmlNode, this.wrapee.remove());
  }

  replace(replacement: LibxmlNode) {
    this.wrapee.replace(replacement.wrapee);
    return replacement;
  }

  insertBefore(newNode: LibxmlNode) {
    this.wrapee.addPrevSibling(newNode.wrapee);
    return newNode;
  }

  insertAfter(newNode: LibxmlNode) {
    this.wrapee.addNextSibling(newNode.wrapee);
  }
}

////////////////////////////////////////////////////////////////////////////////
@mixin(AbstractElement)
export class LibxmlElement extends LibxmlNode implements AbstractElement {
  constructor(wrapee) {
    super(wrapee);
  }

  get native() {
    return this.wrapee;
  }

  get localName() {
    return this.wrapee.name();
  }

  get firstElementChild() {
    let firstChild = this.wrapee.child(0);
    while (firstChild && firstChild.type() !== 'element') {
      firstChild = firstChild.nextSibling();
    }

    return wrappedOrNull(LibxmlElement, firstChild);
  }

  get lastChild() {
    let children = this.wrapee.childNodes;
    return wrappedOrNull(LibxmlNode, children[children.length - 1]);
  }

  *childElements() {
    for (let child of this.wrapee.childNodes()) {
      if (child.type() === 'element') {
        yield new LibxmlElement(child);
      }
    }
  }

  childElement(index: number) {
    return ithGenerated(this.childElements(), index) || null;
  }

  get childElementCount() {
    return countGenerated(this.childElements());
  }

  get nextElementSibling() {
    return wrappedOrNull(LibxmlElement, this.wrapee.nextElement());
  }

  nameNs() {
    let ns = this.wrapee.namespace();
    let uri = ns ? ns.href() : 'http://www.tei-c.org/ns/1.0';    // todo: how to handle default properly?

    return '{' + uri + '}' + this.wrapee.name();
  }

  // isNs(otherName: string) {
  // 	return this.nameNs() === otherName;
  // }

  getAttribute(name: string) {
    let attr = this.wrapee.attr(name);
    return attr === null ? null : attr.value();
  }

  setAttribute(name: string, value: any) {
    this.wrapee.attr({ [name]: value.toString() });
    return this;
  }

  renameAttributeIfExists(nameOld: string, nameNew: string) {
    let attr = this.wrapee.attr(nameOld);
    if (attr) {
      this.wrapee.attr({ [nameNew]: attr.value() });
      attr.remove();
    }
  }

  removeAttribute(name: string) {
    let attr = this.wrapee.attr(name);
    if (attr) {
      attr.remove();
    }
  }

  appendChild(child: LibxmlNode) {
    this.wrapee.addChild((<LibxmlElement>child).wrapee);  // see http://stackoverflow.com/a/13723325/5271870
    return child;
  }

  clone() {
    return new LibxmlElement(this.wrapee.clone());
  }

  xpath(query: string, nsMap?) {
    let result = this.wrapee.find(query, nsMap);

    return (result || [])
      .map(x => x.type() === 'element' ? new LibxmlElement(x) : new LibxmlNode(x));
  }

  *xpathIt(query: string, nsMap?) {
    yield* this.xpath(query, nsMap);
  }

  // mixins
  xpathEl: (query: string, nsMap?) => Array<AbstractElement>;
  setAttributes: (keyvalue: Object) => LibxmlElement;
  unwrap: () => LibxmlElement;
  rewrap: (replacement: AbstractElement) => LibxmlElement;
}


//------------------------------------------------------------------------------
function switchReturnNodeType(node) {
  return wrappedOrNull(node && node.type() === 'element' ? LibxmlElement : LibxmlNode, node);
}
