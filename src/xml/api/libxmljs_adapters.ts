import {IDocument, INode, IElement} from './interfaces'
import * as libxmljs from 'libxmljs'
import {lang} from '../utils'
import {wrappedOrNull, ithGenerated} from '../../lang' 



////////////////////////////////////////////////////////////////////////////////
export class LibxmlDocument implements IDocument {
	constructor(private underlying: libxmljs.XMLDocument) {	}
	
	get documentElement() {
		return new LibxmlElement(this.underlying.root());
	}
	
	createElement(name: string) {
    let [localName, prefix] = name.split(':').reverse();
		let ret = new libxmljs.Element(this.underlying, localName);
    prefix && ret.namespace(this.getNsByPrefix(prefix));
    
    return new LibxmlElement(ret);
	}
	
	serialize() {
		return this.underlying.toString();
	}
  
  private getNsByPrefix(prefix: string) {
    return this.underlying.root().namespaces().find(x => x.prefix() === prefix);
  }
}

////////////////////////////////////////////////////////////////////////////////
export class LibxmlNode implements INode {
	constructor(public underlying) {	} // todo: protected
	
	equals(other: LibxmlNode) {
		return other && this.underlying === other.underlying;
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
	
	is(name: string) {
		return this.nodeName === name;
	}
	
	get textContent() {
		return this.underlying.text();
	}
	
	set textContent(val: string) {
		this.underlying.text(val);
	}
	
	get ownerDocument()  {
		return wrappedOrNull(LibxmlDocument, this.underlying.doc());
	}
	
	get firstChild() {
		return switchReturnNodeType(this.underlying.child(0));
	}
	
	get parentNode() {
		return wrappedOrNull(LibxmlElement, this.underlying.parent());
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
	
	insertAfter(newNode: LibxmlNode) {
		this.underlying.addNextSibling(newNode.underlying);
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
	
	get firstElementChild() {
		let firstChild = this.underlying.child(0);
		while (firstChild && firstChild.type() !== 'element') {
			firstChild = firstChild.nextSibling();
		}
				
		return wrappedOrNull(LibxmlElement, firstChild);
	}
	
	get lastChild() {
		let children = this.underlying.childNodes;
		return wrappedOrNull(LibxmlNode, children[children.length - 1]);
	}
	
	*childElements() {
		for (let child of this.underlying.childNodes()) {
			if (child.type() === 'element') {
				yield new LibxmlElement(child);
			}
		}
	}
	
	childElement(index: number) {
    for (let child of this.underlying.childNodes()) {
      if (child.type() === 'element') {
        if (--index < 0) {
          return new LibxmlElement(child);
        }
      }
    }
    
    return null;
	}
	
	get nextElementSibling() {
		return wrappedOrNull(LibxmlElement, this.underlying.nextElement());
	}
	
	nameNs() {
		let ns = this.underlying.namespace();
		let uri = ns ? ns.href() : 'http://www.tei-c.org/ns/1.0';		// todo: how to handle default properly?
		
    return '{' + uri + '}' + this.underlying.name();
	}
	
	// isNs(otherName: string) {
	// 	return this.nameNs() === otherName;
	// }
	
	getAttribute(name: string) {
		let attr = this.underlying.attr(name);
		return attr === null ? null : attr.value();
	}
	
	setAttribute(name: string, value: any) {
		this.underlying.attr({[name]: value.toString()});
	}
	
	removeAttribute(name: string) {
		throw 'Not implemented'
	}
	
	appendChild(child: LibxmlNode) {
		this.underlying.addChild(child.underlying);
		return child;
	}
  
  xpath(query: string, nsMap?) {
    return this.underlying.find(query, nsMap).map(x => new LibxmlElement(x));
  }
}





////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function switchReturnNodeType(node) {
	return wrappedOrNull(node && node.type() === 'element' ? LibxmlElement : LibxmlNode, node);
}