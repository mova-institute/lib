import {XmlElement} from '../xml/xml_element'
import {W, W_} from './common_tags'
import {ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetweenEl} from './utils'
import {traverseDepth, traverseDocumentOrder, NS, isElement, nameNsEl, remove, insertAfter} from '../xml/utils'

export class TextToken extends XmlElement {

	constructor(element: HTMLElement, public hasSpaceBefore = true) {
		super(element);
	}	// todo getter?
	
	tag() {
		return this.element.tagName; 	// todo
	}
	
	is(tagName: string) {
		return this.tag() === tagName;
	}
	
	equals(other: TextToken) {
		return other && other.element === this.element;
	}
	
	text() {	// todo
		if (nameNsEl(this.element) === W_) {
			return this.element.children[0].textContent;
		}
		return this.element.textContent;
	}

	ana() {
		return this.element.getAttribute('ana');
	}

	isWord() {
		return this.element.tagName === 'mi:w_' || this.element.tagName === 'w';	// todo
	}

	isAmbig() {
		return nameNsEl(this.element) === W_ && !this.ana();
	}

	isUntagged() {
		return this.ana() === 'X';
	}
	
	morphTag() {
		if (this.element.tagName === 'mi:w_') {
			let disambIndex = parseInt(this.element.getAttribute('ana'));
			return this.element.children[disambIndex].getAttribute('ana');
		}
		return this.ana();
	}

	tags() {
		let toret = [];
		traverseDepth(this.element, (node) => {
			if (isElement(node) && node !== this.element) {
				toret.push({
					ana: node.getAttribute('ana'),
					lemma: node.getAttribute('lemma')
				});
			}
		});
		
		return toret;
	}

	breaksLine() {
		return this.element.tagName === 'p' || this.element.tagName === 'l';
	}

	disambig(index: number) {
		this.element.setAttribute('ana', index.toString());
	}

	insertSentenceEnd() {
		let where = this.element;
		traverseDocumentOrder(where, (node): any => {
			if (isElement(node)) {
				if (ELEMS_BREAKING_SENTENCE_NS.has(nameNsEl(node))) {

				}
				else if (!node.nextElementSibling || haveSpaceBetweenEl(node, node.nextElementSibling)) {
					where = node;
					return false;
				}
				if (node.tagName === 'mi:w_') {
					return 'skip';
				}
			}
		}, node => {
			if (isElement(node) && ELEMS_BREAKING_SENTENCE_NS.has(nameNsEl(node))) {
				where = node.lastChild;
				return false;
			}
		});

		if (where.tagName !== 'mi:se') {
			let se = where.ownerDocument.createElement('mi:se');
			insertAfter(se, where);
		}
	}

	nextAmbigWord() {
		let toret = null;
		traverseDocumentOrder(this.element, node => {
			if (isElement(node)) {
				let token = new TextToken(node);
				if (token.isAmbig()) {
					toret = token;
					return false;
				}
			}
		});

		return toret;
	}
}