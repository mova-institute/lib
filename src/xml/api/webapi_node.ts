import { AbstractNode } from './abstract_node';
import { WebapiDocument } from './webapi_document';
import { WebapiElement } from './webapi_element';
import { wrappedOrNull } from './utils';



export class WebapiNode extends AbstractNode {
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


//------------------------------------------------------------------------------
function switchReturnNodeType(node: Node) {
  return wrappedOrNull(node && node.nodeType === Node.ELEMENT_NODE ? WebapiElement : WebapiNode, node);
}
