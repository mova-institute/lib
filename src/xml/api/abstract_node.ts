import { AbstractDocument } from './abstract_document';
import { AbstractElement } from './abstract_element';



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
