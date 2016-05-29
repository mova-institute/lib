import { AbstractNode } from './abstract_node';



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
