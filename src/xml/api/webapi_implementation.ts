import { IDocument, INode, IElement } from './interface';
import { nameNs } from '../utils';
import { xpath } from '../utils.web';
import { wrappedOrNull, mixin } from '../../lang';
import { serializeXml } from '../../utils.web';


// todo: get rid of (<Element>this.wrapee)

export function $el(element: Element) {
  return wrappedOrNull(WebapiElement, element);
}


////////////////////////////////////////////////////////////////////////////////
export class WebapiDocument extends IDocument {
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
    return serializeXml(this.wrapee);
  }

  equals(other: WebapiDocument) {
    return this.wrapee === other.wrapee;
  }
}

////////////////////////////////////////////////////////////////////////////////
export class WebapiNode extends INode {
  constructor(protected wrapee: Node) {
    super();
  } // todo: protected

  get native() {
    return this.wrapee;
  }

  equals(other: WebapiNode) {
    return other && this.wrapee === other.wrapee;
  }

  isElement() {
    return this.wrapee.nodeType === Node.ELEMENT_NODE;
  }

  isText() {
    return this.wrapee.nodeType === Node.TEXT_NODE;
  }

  isRoot() {
    return this.wrapee === this.wrapee.ownerDocument.documentElement;
  }

  get name() {
    return this.wrapee.nodeName;
  }

  get text() {
    return this.wrapee.textContent;
  }

  set text(val: string) {
    this.wrapee.textContent = val;
  }

  get document() {
    return wrappedOrNull(WebapiDocument, this.wrapee.ownerDocument);
  }

  get firstChild() {
    return switchReturnNodeType(this.wrapee.firstChild);
  }

  get nextSibling() {
    return switchReturnNodeType(this.wrapee.nextSibling);
  }

  get parent() {
    return wrappedOrNull(WebapiElement, this.wrapee.parentElement);
  }

  remove() {
    return wrappedOrNull(WebapiNode, this.wrapee.parentNode.removeChild(this.wrapee));
  }

  replace(replacement: WebapiNode) {
    this.wrapee.parentNode.replaceChild(replacement.wrapee, this.wrapee);
    return replacement;
  }

  insertBefore(newNode: WebapiNode) {
    this.wrapee.parentNode.insertBefore(newNode.wrapee, this.wrapee);
    return newNode;
  }

  insertAfter(newNode: WebapiNode) {
    this.wrapee.parentNode.insertBefore(newNode.wrapee, this.wrapee.nextSibling);
  }
}

////////////////////////////////////////////////////////////////////////////////
@mixin(IElement)
export class WebapiElement extends WebapiNode implements IElement {
  constructor(wrapee: Element) {
    super(wrapee);
  }

  get native() {
    return this.wrapee;
  }

  get localName() {
    return this.wrapee.localName;
  }

  get firstElementChild() {
    return wrappedOrNull(WebapiElement, (<Element>this.wrapee).firstElementChild);
  }

  get nextElementSibling() {
    return wrappedOrNull(WebapiElement, (<Element>this.wrapee).nextElementSibling);
  }

  get lastChild() {
    return wrappedOrNull(WebapiNode, this.wrapee.lastChild);
  }

  *childElements() {
    let children = (<HTMLElement>this.wrapee).children;
    for (let i = 0; i < children.length; ++i) {
      yield new WebapiElement(children.item(i));
    }
  }

  childElement(index: number) {
    return wrappedOrNull(WebapiElement, (<HTMLElement>this.wrapee).children[index]);
  }

  get childElementCount() {
    return (<HTMLElement>this.wrapee).childElementCount;
  }

  nameNs() {
    return nameNs(this.wrapee.namespaceURI || 'nons', this.wrapee.localName);
  }

  getAttribute(name: string) {
    return (<Element>this.wrapee).getAttribute(name);
  }

  setAttribute(name: string, value: any) {
    (<Element>this.wrapee).setAttribute(name, value);
    return this;
  }

  renameAttributeIfExists(nameOld: string, nameNew: string) {
    throw new Error('renameAttribute() not implemented for WebapiElement yet');
  }

  removeAttribute(name: string) {
    (<Element>this.wrapee).removeAttribute(name);
  }

  appendChild(child: WebapiNode) {
    this.wrapee.appendChild((<WebapiElement>child).wrapee);  // see http://stackoverflow.com/a/13723325/5271870
    return child;
  }

  clone() {
    return new WebapiElement(<Element>this.wrapee.cloneNode(true));
  }

  xpath(query: string, nsMap?) {
    return xpath(this.wrapee, query, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE)
      .map(x => x.nodeType === Node.ELEMENT_NODE ? new WebapiElement(x) : new WebapiNode(x));
  }

  *xpathIt(query: string, nsMap?) {
    let result = xpath(this.wrapee, query, XPathResult.ORDERED_NODE_ITERATOR_TYPE);
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
