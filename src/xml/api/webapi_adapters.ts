import {IDocument, INode, IElement} from './interfaces';
import {lang, nameNs} from '../utils';
import {wrappedOrNull} from '../../lang';
import {serializeXml} from '../../utils.web';


// todo: get rid of (<Element>this.underlying)

export function $el(element: Element) {
	return wrappedOrNull(WebapiElement, element);
}


////////////////////////////////////////////////////////////////////////////////
export class WebapiDocument implements IDocument {
	constructor(public underlying: Document) { }

	get documentElement() {
		return wrappedOrNull(WebapiElement, this.underlying.documentElement);
	}

	createElement(name: string) {
    let [localName, prefix] = name.split(':').reverse();
    let uri = this.underlying.lookupNamespaceURI(prefix || null);
    let elem = this.underlying.createElementNS(uri, name);
    
    return new WebapiElement(elem);
	}

	serialize() {
		return serializeXml(this.underlying);
	}
}

////////////////////////////////////////////////////////////////////////////////
export class WebapiNode implements INode {
	constructor(public underlying: Node) { } // todo: protected
	
	equals(other: WebapiNode) {
		return other && this.underlying === other.underlying;
	}
	
	lang() {
		return lang(this);
	}

	isElement() {
		return this.underlying.nodeType === Node.ELEMENT_NODE;
	}

	isText() {
		return this.underlying.nodeType === Node.TEXT_NODE;
	}

	isRoot() {
		return this.underlying === this.underlying.ownerDocument.documentElement;
	}

	get nodeName() {
		return this.underlying.nodeName;
	}
	
	is(name: string) {
		return this.nodeName === name;
	}
	
	get textContent() {
		return this.underlying.textContent;
	}

	set textContent(val: string) {
		this.underlying.textContent = val;
	}

	get ownerDocument() {
		return wrappedOrNull(WebapiDocument, this.underlying.ownerDocument);
	}

	get firstChild() {
		return switchReturnNodeType(this.underlying.firstChild);
	}

	get parentNode() {
		return wrappedOrNull(WebapiElement, this.underlying.parentElement);
	}

	get nextSibling() {
		return switchReturnNodeType(this.underlying.nextSibling);
	}

	remove() {
		this.underlying.parentNode.removeChild(this.underlying)
	}

	replace(replacement: WebapiNode) {
		this.underlying.parentNode.replaceChild(replacement.underlying, this.underlying)
	}

	insertBefore(newNode: WebapiNode) {
		this.underlying.parentNode.insertBefore(newNode.underlying, this.underlying);
		return newNode;
	}
	
	insertAfter(newNode: WebapiNode) {
		this.underlying.parentNode.insertBefore(newNode.underlying, this.underlying.nextSibling);
	}
}

////////////////////////////////////////////////////////////////////////////////
export class WebapiElement extends WebapiNode implements IElement {
	constructor(underlying: Element) {
		super(underlying);
	}

	get localName() {
		return this.underlying.localName;
	}
	
	get firstElementChild() {
		return wrappedOrNull(WebapiElement, (<Element>this.underlying).firstElementChild);
	}
	
	get nextElementSibling() {
		return wrappedOrNull(WebapiElement, (<Element>this.underlying).nextElementSibling);
	}
	
	get lastChild() {
		return wrappedOrNull(WebapiNode, this.underlying.lastChild);
	}
	
	*childElements() {
		let children = (<HTMLElement>this.underlying).children;
		for (let i = 0; i < children.length; ++i) {
			yield new WebapiElement(children.item(i));
		}
	}
	
	childElement(index: number) {
		return wrappedOrNull(WebapiElement, (<HTMLElement>this.underlying).children[index]);
	}
  
  get childElementCount() {
    return (<HTMLElement>this.underlying).childElementCount;
  }

	nameNs() {	// todo
		if (this.underlying.namespaceURI) {
			return nameNs(this.underlying.namespaceURI, this.underlying.localName);
		}
    
    throw new Error('Should not happen');
	}
	
	getAttribute(name: string) {
		return (<Element>this.underlying).getAttribute(name);
	}

	setAttribute(name: string, value: any) {
		(<Element>this.underlying).setAttribute(name, value);
	}
	
	removeAttribute(name: string) {
		(<Element>this.underlying).removeAttribute(name);
	}

	appendChild(child: WebapiNode) {
		this.underlying.appendChild(child.underlying);
		return child;
	}
  
  clone() {
    return new WebapiElement(<Element>this.underlying.cloneNode(true));
  }
  
  xpath(query: string, nsMap?) {
    throw new Error('Not implemented: xpath');
    return [];
  }
}




////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function switchReturnNodeType(node: Node) {
	return wrappedOrNull(node && node.nodeType === Node.ELEMENT_NODE ? WebapiElement : WebapiNode, node);
}