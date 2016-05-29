import { AbstractElement } from './abstract_element';
import { WebapiNode } from './webapi_node';
import { mixin, wrappedOrNull } from './utils';




@mixin(AbstractElement)
export class WebapiElement extends WebapiNode implements AbstractElement {
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
    return `{${this.wrapee.namespaceURI || 'nons'}}this.wrapee.localName`;
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
    return [...this.xpathIt(query, nsMap)];
  }

  *xpathIt(query: string, nsMap?) {
    let result = this.wrapee.ownerDocument.evaluate(
      query, this.wrapee, nsMap, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let node;
    while (node = result.iterateNext()) {
      yield node.nodeType === Node.ELEMENT_NODE ? new WebapiElement(node) : new WebapiNode(node);  // todo: dedupe?
    }
  }

  // mixins
  xpathEl: (query: string, nsMap?) => Array<WebapiElement>;
  setAttributes: (keyvalue: Object) => WebapiElement;
  unwrap: () => WebapiElement;
  rewrap: (replacement: AbstractElement) => WebapiElement;
}
