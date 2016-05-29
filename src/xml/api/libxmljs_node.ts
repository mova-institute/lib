import { AbstractNode } from './abstract_node';
import { LibxmlDocument } from './libxmljs_document';
import { LibxmlElement } from './libxmljs_element';
import { wrappedOrNull } from './utils';



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



//------------------------------------------------------------------------------
function switchReturnNodeType(node: Node) {
  return wrappedOrNull(node && node.nodeType === Node.ELEMENT_NODE ? LibxmlElement : LibxmlNode, node);
}
