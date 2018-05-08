import { AbstractDocument } from './abstract_document';
import { AbstractElement } from './abstract_element';
import { AbstractAttribute } from './abstract_attribute';

const wu: Wu.WuStatic = require('wu');



export type XmlapiXpathResult = boolean | number | string | AbstractNode
  | Wu.WuIterable<AbstractNode | AbstractAttribute>;


export abstract class AbstractNode {

  /*
   * properties
   */

  abstract document(): AbstractDocument;
  abstract text(value?: string): string;
  abstract type(): 'element' | 'text' | 'cdata' | 'comment';

  isElement() {
    return this.type() === 'element';
  }

  isText() {
    return this.type() === 'text';
  }

  isCdata() {
    return this.type() === 'cdata';
  }

  isComment() {
    return this.type() === 'comment';
  }

  isRoot() {
    return this.document().root().isSame(this);  // todo: fragments?
  }

  lang(): string {
    if (this.isElement()) {
      throw new Error('lang() must be overriden in Element');
    }
    return this.parent().lang();
  }


  /*
   * traversal
   */

  abstract parent(): AbstractElement;

  ancestors() {
    return wu(this._ancestors());
  }

  abstract previousSibling(): AbstractNode;

  previousSiblings() {
    return wu(this._previousSiblings());
  }

  previousElementSiblings() {
    return this.previousSiblings().filter(x => x.isElement()) as Wu.WuIterable<AbstractElement>;
  }

  previousElementSibling() {
    return this.previousElementSiblings().next().value || null;
  }

  abstract nextSibling(): AbstractNode;

  nextSiblings() {
    return wu(this._nextSiblings());
  }

  nextElementSiblings() {
    return this.nextSiblings().filter(x => x.isElement()) as Wu.WuIterable<AbstractElement>;
  }

  nextElementSibling() {
    return this.nextElementSiblings().next().value || null;
  }

  /** Document order */
  next(): AbstractNode {  // todo: why return type is not inferred?
    if (this.isElement()) {
      let firstChild = this.asElement().firstChild();
      if (firstChild) {
        return firstChild;
      }
    }
    // todo: wait for tail call optimization, check it jumps
    return this.nextSibling() || this.ancestors().map(x => x.nextSibling()).find(x => !!x) || null;
  }


  /*
   * manipulation
   */

  abstract remove(): AbstractNode;
  abstract replace(replacement: AbstractNode);  // todo: what to return, naming
  // abstract replaceWithElement(name: string, nsUri: string): AbstractNode;
  abstract insertBefore(newNode: AbstractNode);  // todo: what to return
  abstract insertAfter(newNode: AbstractNode);


  /*
   * XPath
   */

  abstract evaluate(xpath: string, nsMap?: Object): XmlapiXpathResult;
  abstract evaluateNode(xpath: string, nsMap?: Object): AbstractNode;
  abstract evaluateNodes(xpath: string, nsMap?: Object): Wu.WuIterable<AbstractNode>;
  abstract evaluateElement(xpath: string, nsMap?: Object): AbstractElement;
  abstract evaluateElements(xpath: string, nsMap?: Object): Wu.WuIterable<AbstractElement>;
  abstract evaluateAttribute(xpath: string, nsMap?: Object): AbstractAttribute;
  abstract evaluateAttributes(xpath: string, nsMap?: Object): Wu.WuIterable<AbstractAttribute>;

  evaluateBoolean(xpath: string, nsMap?: Object) {
    let ret = this.evaluate(xpath, nsMap);
    if (typeof ret !== 'boolean') {
      throw new Error('XPath result is not a boolean');
    }
    return ret as boolean;
  }

  evaluateNumber(xpath: string, nsMap?: Object) {
    let ret = this.evaluate(xpath, nsMap);
    if (typeof ret !== 'number') {
      throw new Error('XPath result is not a number');
    }
    return ret as number;
  }

  evaluateString(xpath: string, nsMap?: Object) {
    let ret = this.evaluate(xpath, nsMap);
    if (typeof ret !== 'string') {
      throw new Error('XPath result is not a string');
    }
    return ret as string;
  }


  /*
   * other
   */

  abstract isSame(other: AbstractNode): boolean;
  abstract serialize(): string;  // todo: pretty params
  abstract clone(): AbstractNode;

  asElement() {
    if (!this.isElement()) {
      throw new Error('asElement() called on non-element');
    }
    return ((this as any) as AbstractElement);  // todo: wait for ts 2.0
  }

  // isAttached() {
  //   return this.r
  // }

  // lookupPrefix(nsUri: string) {
  //   // todo: ts 2.0
  //   let chain = wu.chain(this.isElement() ? [(this as any) as AbstractElement] : [], this.ancestors());
  //   for (let el of chain) {

  //   }
  // }


  /*
   * private
   */

  /*protected*/ *_ancestors() {  // todo: investigate "protected/private" bug
    for (let pointer = this.parent(); pointer; pointer = pointer.parent()) {
      yield pointer;
    }
  }

  /*protected*/ *_previousSiblings() {
    for (let pointer = this.previousSibling(); pointer; pointer = pointer.previousSibling()) {
      yield pointer;
    }
  }

  /*protected*/ *_nextSiblings() {
    for (let pointer = this.nextSibling(); pointer; pointer = pointer.nextSibling()) {
      yield pointer;
    }
  }
}
