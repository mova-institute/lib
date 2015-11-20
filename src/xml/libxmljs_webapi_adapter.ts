import {IDocument, INode, IElement} from './interfaces'
import * as libxmljs from 'libxmljs'




export class LibxmlDocument implements IDocument {
	constructor(private underlying: libxmljs.XMLDocument) {	}
	
	get documentElement() {
		return new LibxmlElement(this.underlying.root());
	}
	
	toString() {
		return this.underlying.toString();
	}
}

export class LibxmlNode implements INode {
	ELEMENT_NODE = 1;
	TEXT_NODE = 3;
	ATTRIBUTE_NODE = 2;
	COMMENT_NODE = 8;
	
	constructor(protected underlying) {	}
	
	get nodeType() {
		switch (this.underlying.type()) {
			case 'element':
				return this.ELEMENT_NODE;
			case 'text':
				return this.TEXT_NODE;
			case 'attribute':
				return this.ATTRIBUTE_NODE;
			case 'comment':
				return this.COMMENT_NODE;
			default:
				throw 'Can’t be';
		}
	}
	
	get nodeName() {
		let type = this.underlying.type();
		if (type === 'element') {
			return this.underlying.name();
		}
		return '#' + this.underlying.type();
	}
	
	get textContent() {
		return this.underlying.text();
	}
	
	get ownerDocument()  {
		return new LibxmlDocument(this.underlying.doc());
	}
	
	get firstChild() {
		return this.underlying.child(0) ?
			new LibxmlElement(this.underlying.child(0)) : null;
	}
	
	get parentNode() {
		return this.underlying.parent() ?
			new LibxmlNode(this.underlying.parent()) : null;
	}
	
	get nextSibling() {
		return this.underlying.nextSibling() ?
			new LibxmlNode(this.underlying.nextSibling()) : null;
	}
}



export class LibxmlElement extends LibxmlNode implements IElement {
	constructor(underlying: libxmljs.Element) {
		super(underlying);
	}
	
	get localName() {
		return this.underlying.name();
	}
	
	getAttribute(name: string) {
		let attr = this.underlying.attr(name);
		return attr === null ? null : attr.value();
	}
	
	setAttribute(name: string, value: string) {
		this.underlying.attr({[name]: value});
	}
	
}