import { AbstractElement } from './abstract_element';
import { LibxmlNode } from './libxmljs_node';
import { mixin, wrappedOrNull, ithGenerated, countGenerated } from './utils';



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
