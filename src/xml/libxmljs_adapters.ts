import {IDocument, INode, IElement} from './interfaces'
import * as libxmljs from 'libxmljs'
import {lang} from './utils'




////////////////////////////////////////////////////////////////////////////////
export class LibxmlDocument implements IDocument {
	constructor(private underlying: libxmljs.XMLDocument) {	}
	
	get documentElement() {
		return new LibxmlElement(this.underlying.root());
	}
	
	createElement(name: string) {
		return new LibxmlElement(new libxmljs.Element(this.underlying, name));
	}
	
	toString() {
		return this.underlying.toString();
	}
}

////////////////////////////////////////////////////////////////////////////////
export class LibxmlNode implements INode {
	ELEMENT_NODE = 1;
	TEXT_NODE = 3;
	ATTRIBUTE_NODE = 2;
	COMMENT_NODE = 8;
	
	constructor(public underlying) {	} // todo: protected
	
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
	
	lang() {
		return lang(this);
	}
	
	isElement() {
		return this.underlying.type() === 'element';
	}
	
	isText() {
		return this.underlying.type() === 'text';
	}
	
	isRoot() {
		return this.underlying === this.underlying.doc().root();
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
	
	set textContent(val: string) {
		this.underlying.text(val);
	}
	
	get ownerDocument()  {
		return new LibxmlDocument(this.underlying.doc());
	}
	
	get firstChild() {
		return switchReturnNodeType(this.underlying.child(0));
	}
	
	get parentNode() {
		return this.underlying.parent() ?
			new LibxmlElement(this.underlying.parent()) : null;
	}
	
	get nextSibling() {
		return switchReturnNodeType(this.underlying.nextSibling());
	}
	
	remove() {
		this.underlying.remove();
	}
	
	replace(replacement: LibxmlNode) {
		this.underlying.replace(replacement.underlying);
	}
	
	insertBefore(newNode: LibxmlNode) {
		this.underlying.addPrevSibling(newNode.underlying);
		return newNode;
	}
}

////////////////////////////////////////////////////////////////////////////////
export class LibxmlElement extends LibxmlNode implements IElement {
	constructor(underlying: libxmljs.Element) {
		super(underlying);
	}
	
	get localName() {
		return this.underlying.name();
	}
	
	nameNs() {
		let ns = this.underlying.namespace();
		let uri = ns ? ns.href() : 'http://www.tei-c.org/ns/1.0';		// todo: how to handle default properly?
		
		return '{' + uri + '}' + this.underlying.name();
	}
	
	getAttribute(name: string) {
		let attr = this.underlying.attr(name);
		return attr === null ? null : attr.value();
	}
	
	setAttribute(name: string, value: string) {
		this.underlying.attr({[name]: value});
	}
	
	appendChild(child: LibxmlNode) {
		this.underlying.addChild(child.underlying);
		return child;
	}
}





////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function switchReturnNodeType(node: libxmljs.Node) {
	if (!node) {
		return null;
	}
	if (node.type() === 'element') {
		return new LibxmlElement(node)
	}

	return new LibxmlNode(node);
}