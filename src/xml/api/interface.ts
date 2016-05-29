////////////////////////////////////////////////////////////////////////////////
export abstract class AbstractDocument {
  root: AbstractElement;
  abstract createElement(name: string): AbstractElement;
  abstract createTextNode(value: string): AbstractNode;
  abstract serialize(): string;

  abstract equals(other: AbstractDocument): boolean;
}

////////////////////////////////////////////////////////////////////////////////
export abstract class AbstractNode {
  document: AbstractDocument;
  firstChild: AbstractNode;
  nextSibling: AbstractNode;
  /** Returns null if parent is not an element, see http://stackoverflow.com/a/8685780/5271870 */
  parent: AbstractElement;
  name: string;
  text: string;
  abstract isElement(): boolean;
  abstract isText(): boolean;
  abstract isRoot(): boolean;
  abstract replace(replacement: AbstractNode): AbstractNode;
  abstract insertBefore(newNode: AbstractNode): AbstractNode;  // todo
  abstract insertAfter(newNode: AbstractNode);
  abstract remove(): AbstractNode;

  abstract equals(other: AbstractNode): boolean;

  get lang(): string {
    return this.parent.lang;
  }
}

////////////////////////////////////////////////////////////////////////////////
export abstract class AbstractElement extends AbstractNode {
  localName: string;
  nextElementSibling: AbstractElement;
  lastChild: AbstractNode;
  childElementCount: number;
  abstract getAttribute(name: string): string;
  abstract setAttribute(name: string, value: any): AbstractElement;
  abstract renameAttributeIfExists(nameOld: string, nameNew: string);
  abstract removeAttribute(name: string);
  abstract appendChild(child: AbstractNode): AbstractNode;
  abstract nameNs(): string;
  abstract childElements(): Iterable<AbstractElement>;
  abstract childElement(index: number): AbstractElement;
  abstract xpath(query: string, nsMap?): AbstractNode[];
  abstract xpathIt(query: string, nsMap?): IterableIterator<AbstractNode>;
  abstract clone(): AbstractElement;  // always deep(?)

  get lang(): string {
    let ret = this.getAttribute('xml:lang');  // todo: no ns?
    if (!ret) {
      if (this.isRoot()) {
        return null;
      }

      return this.parent.lang;
    }

    return ret;
  }

  setAttributes(keyvalue: Object): AbstractElement {  // todo: remove return typing when ts 2.0 comes out, see https://github.com/Microsoft/TypeScript/issues/3694
    for (let key of Object.keys(keyvalue)) {
      this.setAttribute(key, keyvalue[key]);
    }

    return this;
  }

  xpathEl(query: string, nsMap?) {
    return <AbstractElement[]>this.xpath(query, nsMap).filter(x => x.isElement());
  }

  unwrap() {
    while (this.firstChild) {
      this.insertBefore(this.firstChild);  // todo: test webapi without remove()
    }

    return this.remove();
  }

  rewrap(replacement: AbstractElement) {
    while (this.firstChild) {
      replacement.appendChild(this.firstChild);
    }
    this.replace(replacement);

    return replacement;
  }
}
