import {IDocument, INode, IElement} from './interface';
import {nameNs} from '../utils';
import {xpath} from '../utils.web';
import {wrappedOrNull, mixin} from '../../lang';
import {serializeXml} from '../../utils.web';


// todo: get rid of (<Element>this.underlying)

export function $el(element: Element) {
  return wrappedOrNull(WebapiElement, element);
}


////////////////////////////////////////////////////////////////////////////////
export class WebapiDocument extends IDocument {
  constructor(private _underlying: Document) {
    super();
  }

  get root() {
    return wrappedOrNull(WebapiElement, this._underlying.documentElement);
  }

  createElement(name: string) {
    let [, prefix] = name.split(':').reverse();
    let uri = this._underlying.lookupNamespaceURI(prefix || null);
    let elem = this._underlying.createElementNS(uri, name);

    return new WebapiElement(elem);
  }

  createTextNode(value: string) {
    return new WebapiNode(this._underlying.createTextNode(value));
  }

  serialize() {
    return serializeXml(this._underlying);
  }

  equals(other: WebapiDocument) {
    return this._underlying === other._underlying;
  }
}

////////////////////////////////////////////////////////////////////////////////
export class WebapiNode extends INode {
  constructor(protected _underlying: Node) {
    super();
  } // todo: protected

  equals(other: WebapiNode) {
    return other && this._underlying === other._underlying;
  }

  isElement() {
    return this._underlying.nodeType === Node.ELEMENT_NODE;
  }

  isText() {
    return this._underlying.nodeType === Node.TEXT_NODE;
  }

  isRoot() {
    return this._underlying === this._underlying.ownerDocument.documentElement;
  }

  get name() {
    return this._underlying.nodeName;
  }

  get text() {
    return this._underlying.textContent;
  }

  set text(val: string) {
    this._underlying.textContent = val;
  }

  get document() {
    return wrappedOrNull(WebapiDocument, this._underlying.ownerDocument);
  }

  get firstChild() {
    return switchReturnNodeType(this._underlying.firstChild);
  }

  get nextSibling() {
    return switchReturnNodeType(this._underlying.nextSibling);
  }

  get parent() {
    return wrappedOrNull(WebapiElement, this._underlying.parentElement);
  }

  remove() {
    return wrappedOrNull(WebapiNode, this._underlying.parentNode.removeChild(this._underlying));
  }

  replace(replacement: WebapiNode) {
    this._underlying.parentNode.replaceChild(replacement._underlying, this._underlying);
    return replacement;
  }

  insertBefore(newNode: WebapiNode) {
    this._underlying.parentNode.insertBefore(newNode._underlying, this._underlying);
    return newNode;
  }

  insertAfter(newNode: WebapiNode) {
    this._underlying.parentNode.insertBefore(newNode._underlying, this._underlying.nextSibling);
  }
}

////////////////////////////////////////////////////////////////////////////////
@mixin(IElement)
export class WebapiElement extends WebapiNode implements IElement {
  constructor(underlying: Element) {
    super(underlying);
  }

  get localName() {
    return this._underlying.localName;
  }

  get firstElementChild() {
    return wrappedOrNull(WebapiElement, (<Element>this._underlying).firstElementChild);
  }

  get nextElementSibling() {
    return wrappedOrNull(WebapiElement, (<Element>this._underlying).nextElementSibling);
  }

  get lastChild() {
    return wrappedOrNull(WebapiNode, this._underlying.lastChild);
  }

  *childElements() {
    let children = (<HTMLElement>this._underlying).children;
    for (let i = 0; i < children.length; ++i) {
      yield new WebapiElement(children.item(i));
    }
  }

  childElement(index: number) {
    return wrappedOrNull(WebapiElement, (<HTMLElement>this._underlying).children[index]);
  }

  get childElementCount() {
    return (<HTMLElement>this._underlying).childElementCount;
  }

  nameNs() {
    return nameNs(this._underlying.namespaceURI || 'nons', this._underlying.localName);
  }

  getAttribute(name: string) {
    return (<Element>this._underlying).getAttribute(name);
  }

  setAttribute(name: string, value: any) {
    (<Element>this._underlying).setAttribute(name, value);
    return this;
  }

  renameAttributeIfExists(nameOld: string, nameNew: string) {
    throw new Error('renameAttribute() not implemented for WebapiElement yet');
  }

  removeAttribute(name: string) {
    (<Element>this._underlying).removeAttribute(name);
  }

  appendChild(child: WebapiNode) {
    this._underlying.appendChild((<WebapiElement>child)._underlying);  // see http://stackoverflow.com/a/13723325/5271870
    return child;
  }

  clone() {
    return new WebapiElement(<Element>this._underlying.cloneNode(true));
  }

  xpath(query: string, nsMap?) {
    return xpath(this._underlying, query, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE)
      .map(x => x.nodeType === Node.ELEMENT_NODE ? new WebapiElement(x) : new WebapiNode(x));
  }

  *xpathIt(query: string, nsMap?) {
    let result = xpath(this._underlying, query, XPathResult.ORDERED_NODE_ITERATOR_TYPE);
    let node;
    while (node = result.iterateNext()) {
      yield new WebapiNode(node);
    }
  }

  // mixins
  xpathEl: (query: string, nsMap?) => Array<WebapiElement>;
  setAttributes: (keyvalue: Object) => WebapiElement;
  unwrap: () => WebapiElement;
  rewrap: (replacement: IElement) => WebapiElement;
}
// applyMixins(WebapiElement, [IElement]);




////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function switchReturnNodeType(node: Node) {
  return wrappedOrNull(node && node.nodeType === Node.ELEMENT_NODE ? WebapiElement : WebapiNode, node);
}
