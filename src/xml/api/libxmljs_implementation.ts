import { IDocument, INode, IElement } from './interface';
import { wrappedOrNull, ithGenerated, countGenerated, mixin } from '../../lang';
const libxmljs = require('libxmljs');  // typings are wrong, use none


////////////////////////////////////////////////////////////////////////////////
export class LibxmlDocument extends IDocument {

  constructor(private underlying) {
    super();
  }

  get root() {
    return new LibxmlElement(this.underlying.root());
  }

  createElement(name: string) {
    let [localName, prefix] = name.split(':').reverse();
    let el = new libxmljs.Element(this.underlying, localName);
    if (prefix) {
      el.namespace(this.getNsByPrefix(prefix));
    }

    return new LibxmlElement(el);
  }

  createTextNode(value: string) {
    return new LibxmlNode(new libxmljs.Text(this.underlying, value));
  }

  serialize() {
    return this.underlying.root().toString(/*{
     // declaration: false,
     //format: true,
     // whitespace: true,
     // type: 'xml',
     }*/);
  }

  equals(other: LibxmlDocument) {
    return this.underlying === other.underlying;
  }

  private getNsByPrefix(prefix: string) {
    return this.underlying.root().namespaces().find(x => x.prefix() === prefix);
  }
}

////////////////////////////////////////////////////////////////////////////////
export class LibxmlNode extends INode {
  constructor(protected underlying) {
    super();
  }

  equals(other: LibxmlNode) {
    return other && this.underlying === other.underlying;
  }

  isElement() {
    return this.underlying.type() === 'element';
  }

  isText() {
    return this.underlying.type() === 'text';
  }

  isRoot() {
    return this.underlying === this.underlying.doc().root();
  }

  get name() {
    let type = this.underlying.type();
    if (type === 'element') {
      return this.underlying.name();
    }
    return '#' + this.underlying.type();
  }

  get text() {
    return this.underlying.text();
  }

  set text(val: string) {
    this.underlying.text(val);
  }

  get document() {
    return wrappedOrNull(LibxmlDocument, this.underlying.doc());
  }

  get firstChild() {
    return switchReturnNodeType(this.underlying.child(0));
  }

  get nextSibling() {
    return switchReturnNodeType(this.underlying.nextSibling());
  }

  get parent() {
    if (this.isRoot()) {
      return null;
    }

    return new LibxmlElement(this.underlying.parent());
  }

  remove() {
    return wrappedOrNull(LibxmlNode, this.underlying.remove());
  }

  replace(replacement: LibxmlNode) {
    this.underlying.replace(replacement.underlying);
    return replacement;
  }

  insertBefore(newNode: LibxmlNode) {
    this.underlying.addPrevSibling(newNode.underlying);
    return newNode;
  }

  insertAfter(newNode: LibxmlNode) {
    this.underlying.addNextSibling(newNode.underlying);
  }
}

////////////////////////////////////////////////////////////////////////////////
@mixin(IElement)
export class LibxmlElement extends LibxmlNode implements IElement {
  constructor(underlying) {
    super(underlying);
  }

  get localName() {
    return this.underlying.name();
  }

  get firstElementChild() {
    let firstChild = this.underlying.child(0);
    while (firstChild && firstChild.type() !== 'element') {
      firstChild = firstChild.nextSibling();
    }

    return wrappedOrNull(LibxmlElement, firstChild);
  }

  get lastChild() {
    let children = this.underlying.childNodes;
    return wrappedOrNull(LibxmlNode, children[children.length - 1]);
  }

  *childElements() {
    for (let child of this.underlying.childNodes()) {
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
    return wrappedOrNull(LibxmlElement, this.underlying.nextElement());
  }

  nameNs() {
    let ns = this.underlying.namespace();
    let uri = ns ? ns.href() : 'http://www.tei-c.org/ns/1.0';    // todo: how to handle default properly?

    return '{' + uri + '}' + this.underlying.name();
  }

  // isNs(otherName: string) {
  // 	return this.nameNs() === otherName;
  // }

  getAttribute(name: string) {
    let attr = this.underlying.attr(name);
    return attr === null ? null : attr.value();
  }

  setAttribute(name: string, value: any) {
    this.underlying.attr({ [name]: value.toString() });
    return this;
  }

  renameAttributeIfExists(nameOld: string, nameNew: string) {
    let attr = this.underlying.attr(nameOld);
    if (attr) {
      this.underlying.attr({ [nameNew]: attr.value() });
      attr.remove();
    }
  }

  removeAttribute(name: string) {
    let attr = this.underlying.attr(name);
    if (attr) {
      attr.remove();
    }
  }

  appendChild(child: LibxmlNode) {
    this.underlying.addChild((<LibxmlElement>child).underlying);  // see http://stackoverflow.com/a/13723325/5271870
    return child;
  }

  clone() {
    return new LibxmlElement(this.underlying.clone());
  }

  xpath(query: string, nsMap?) {
    let result = this.underlying.find(query, nsMap);

    return (result || [])
      .map(x => x.type() === 'element' ? new LibxmlElement(x) : new LibxmlNode(x));
  }

  *xpathIt(query: string, nsMap?) {
    yield* this.xpath(query, nsMap);
  }

  // mixins
  xpathEl: (query: string, nsMap?) => Array<IElement>;
  setAttributes: (keyvalue: Object) => LibxmlElement;
  unwrap: () => LibxmlElement;
  rewrap: (replacement: IElement) => LibxmlElement;
}


////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function switchReturnNodeType(node) {
  return wrappedOrNull(node && node.type() === 'element' ? LibxmlElement : LibxmlNode, node);
}
