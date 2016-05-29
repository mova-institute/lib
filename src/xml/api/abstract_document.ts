import { AbstractNode } from './abstract_node';
import { AbstractElement } from './abstract_element';



export abstract class AbstractDocument {
  root: AbstractElement;
  abstract createElement(name: string): AbstractElement;
  abstract createTextNode(value: string): AbstractNode;
  abstract serialize(): string;

  abstract equals(other: AbstractDocument): boolean;
}
