import {IDocument, INode, IElement} from './interface';
import {wrappedOrNull, ithGenerated, countGenerated, mixin} from '../../lang';
const libxmljs = require('libxmljs');  // typings are wrong, use none


////////////////////////////////////////////////////////////////////////////////
export class LibxmlDocument extends IDocument {

  constructor(private _underlying) {
    super();
  }

  get root() {
    return new LibxmlElement(this._underlying.root());
  }

  createElement(name: string) {
    let [localName, prefix] = name.split(':').reverse();
    let el = new libxmljs.Element(this._underlying, localName);
    if (prefix) {
      el.namespace(this._getNsByPrefix(prefix));
    }

    return new LibxmlElement(el);
  }

  createTextNode(value: string) {
    return new LibxmlNode(new libxmljs.Text(this._underlying, value));
  }

  serialize() {
    return this._underlying.root().toString(/*{
      // declaration: false,
      //format: true,
      // whitespace: true,
      // type: 'xml',
    }*/);
  }

  equals(other: LibxmlDocument) {
    return this._underlying === other._underlying;
  }

  private _getNsByPrefix(prefix: string) {
    return this._underlying.root().namespaces().find(x => x.prefix() === prefix);
  }
}

////////////////////////////////////////////////////////////////////////////////
export class LibxmlNode extends INode {
  constructor(protected _underlying) {
    super();
  }

  equals(other: LibxmlNode) {
    return other && this._underlying === other._underlying;
  }

  isElement() {
    return this._underlying.type() === 'element';
  }

  isText() {
    return this._underlying.type() === 'text';
  }

  isRoot() {
    return this._underlying === this._underlying.doc().root();
  }

  get name() {
    let type = this._underlying.type();
    if (type === 'element') {
      return this._underlying.name();
    }
    return '#' + this._underlying.type();
  }

  get text() {
    return this._underlying.text();
  }

  set text(val: string) {
    this._underlying.text(val);
  }

  get document() {
    return wrappedOrNull(LibxmlDocument, this._underlying.doc());
  }

  get firstChild() {
    return switchReturnNodeType(this._underlying.child(0));
  }

  get nextSibling() {
    return switchReturnNodeType(this._underlying.nextSibling());
  }

  get parent() {
    if (this.isRoot()) {
      return null;
    }

    return new LibxmlElement(this._underlying.parent());
  }

  remove() {
    return wrappedOrNull(LibxmlNode, this._underlying.remove());
  }

  replace(replacement: LibxmlNode) {
    this._underlying.replace(replacement._underlying);
    return replacement;
  }

  insertBefore(newNode: LibxmlNode) {
    this._underlying.addPrevSibling(newNode._underlying);
    return newNode;
  }

  insertAfter(newNode: LibxmlNode) {
    this._underlying.addNextSibling(newNode._underlying);
  }
}

////////////////////////////////////////////////////////////////////////////////
@mixin(IElement)
export class LibxmlElement extends LibxmlNode implements IElement {
  constructor(underlying) {
    super(underlying);
  }

  get localName() {
    return this._underlying.name();
  }

  get firstElementChild() {
    let firstChild = this._underlying.child(0);
    while (firstChild && firstChild.type() !== 'element') {
      firstChild = firstChild.nextSibling();
    }

    return wrappedOrNull(LibxmlElement, firstChild);
  }

  get lastChild() {
    let children = this._underlying.childNodes;
    return wrappedOrNull(LibxmlNode, children[children.length - 1]);
  }

  *childElements() {
    for (let child of this._underlying.childNodes()) {
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
    return wrappedOrNull(LibxmlElement, this._underlying.nextElement());
  }

  nameNs() {
    let ns = this._underlying.namespace();
    let uri = ns ? ns.href() : 'http://www.tei-c.org/ns/1.0';    // todo: how to handle default properly?

    return '{' + uri + '}' + this._underlying.name();
  }

  // isNs(otherName: string) {
  // 	return this.nameNs() === otherName;
  // }

  getAttribute(name: string) {
    let attr = this._underlying.attr(name);
    return attr === null ? null : attr.value();
  }

  setAttribute(name: string, value: any) {
    this._underlying.attr({ [name]: value.toString() });
    return this;
  }

  renameAttributeIfExists(nameOld: string, nameNew: string) {
    let attr = this._underlying.attr(nameOld);
    if (attr) {
      this._underlying.attr({ [nameNew]: attr.value() });
      attr.remove();
    }
  }

  removeAttribute(name: string) {
    let attr = this._underlying.attr(name);
    if (attr) {
      attr.remove();
    }
  }

  appendChild(child: LibxmlNode) {
    this._underlying.addChild((<LibxmlElement>child)._underlying);  // see http://stackoverflow.com/a/13723325/5271870
    return child;
  }

  clone() {
    return new LibxmlElement(this._underlying.clone());
  }

  xpath(query: string, nsMap?) {
    let result = this._underlying.find(query, nsMap);

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
