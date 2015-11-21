import {INode, IElement} from '../xml/api/interfaces'
import {W, W_, P, L, SE} from './common_elements'
import {ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetweenEl} from './utils'
import {traverseDocumentOrderEl, NS} from '../xml/utils'

export class TextToken {

	constructor(public elem: IElement, public hasSpaceBefore = true) {
	}

	equals(other: TextToken) {
		return other && other.elem.equals(this.elem);
	}

	text() {	// todo
		if (this.elem.nameNs() === W_) {
			return this.elem.childElement(0).textContent;
		}
		
		return this.elem.textContent;
	}

	isWord() {
		return this.elem.nameNs() === W_;
	}

	isAmbig() {
		return this.elem.childElement(1) && !this.elem.getAttribute('ana');
	}

	isUntagged() {
		return this.morphTag() === 'X';
	}
	
	disambIndex() {
		let ana = this.elem.getAttribute('ana');
		return (ana === null) ? null : parseInt(ana);
	}

	morphTag() {
		if (!this.elem.childElement(1)) {
			return this.elem.childElement(0).getAttribute('ana')
		}
		
		let ana = this.elem.getAttribute('ana');
		if (ana !== null) {
			return this.elem.childElement(parseInt(ana)).getAttribute('ana');
		}
	}

	morphTags() {
		let toret = [];
		for (let child of this.elem.childElements()) {
			toret.push({
				ana: child.getAttribute('ana'),
				lemma: child.getAttribute('lemma')
			});
		}

		return toret;
	}

	breaksLine() {
		let elName = this.elem.nameNs();
		return elName === P || elName === L;
	}

	disambig(index: number) {
		this.elem.setAttribute('ana', index.toString());
	}

	insertSentenceEnd() {
		let where: INode = this.elem;
		traverseDocumentOrderEl(where, el => {
			if (ELEMS_BREAKING_SENTENCE_NS.has(el.nameNs())) {

			}
			else if (!el.nextElementSibling || haveSpaceBetweenEl(el, el.nextElementSibling)) {
				where = el;
				return false;
			}
			if (el.nameNs() === W_) {
				return 'skip';
			}
		}, el => {
			if (ELEMS_BREAKING_SENTENCE_NS.has(el.nameNs())) {
				where = el.lastChild;
				return false;
			}
		});

		if (where.isElement() && (<IElement>where).nameNs() !== SE) {
			let se = where.ownerDocument.createElement('mi:se');
			where.insertAfter(se);
		}
	}

	nextAmbigWord() {
		let toret = null;
		traverseDocumentOrderEl(this.elem, el => {
			if (el.nameNs() === W_) {
				let token = new TextToken(el);
				if (token.isAmbig()) {
					toret = token;
					return false;
				}
			}
		});

		return toret;
	}
}