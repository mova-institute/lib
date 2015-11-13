import {XmlElement} from '../xml/xml_element'
import {W, W_, P, L, SE} from './common_elements'
import {ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetweenEl} from './utils'
import {traverseDepth, traverseDocumentOrder, NS, isElement, nameNsEl, remove, insertAfter} from '../xml/utils'

export class TextToken extends XmlElement {

	constructor(public element: HTMLElement, public hasSpaceBefore = true) {
		super(element);
	}	// todo getter?
	
	tag() {
		return this.element.tagName; 	// todo
	}

	is(tagName: string) {
		return this.tag() === tagName;	// todo
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

	isWord() {
		return nameNsEl(this.element) === W_;
	}

	isAmbig() {
		return this.element.children.length > 1 && !this.element.getAttribute('ana');
	}

	isUntagged() {
		return this.morphTag() === 'X';
	}
	
	disambIndex() {
		let ana = this.element.getAttribute('ana');
		return (ana === null) ? null : parseInt(ana);
	}

	morphTag() {
		if (this.element.children.length === 1) {
			return this.element.firstElementChild.getAttribute('ana')
		}
		
		let ana = this.element.getAttribute('ana');
		if (ana !== null) {
			return this.element.children[parseInt(ana)].getAttribute('ana');
		}
	}

	morphTags() {
		let toret = [];
		for (let i = 0; i < this.element.childElementCount; ++i) {
			toret.push({
				ana: this.element.children[i].getAttribute('ana'),
				lemma: this.element.children[i].getAttribute('lemma')
			});
		}

		return toret;
	}

	breaksLine() {
		let elName = nameNsEl(this.element);
		return elName === P || elName === L;
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
				if (nameNsEl(node) === W_) {
					return 'skip';
				}
			}
		}, node => {
			if (isElement(node) && ELEMS_BREAKING_SENTENCE_NS.has(nameNsEl(node))) {
				where = node.lastChild;
				return false;
			}
		});

		if (nameNsEl(where) !== SE) {
			let se = where.ownerDocument.createElement('mi:se');
			insertAfter(se, where);
		}
	}

	nextAmbigWord() {
		let toret = null;
		traverseDocumentOrder(this.element, node => {
			if (isElement(node) && nameNsEl(node) === W_) {
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