import {INode, IElement} from '../xml/api/interfaces'
import {W, W_, P, L, SE} from './common_elements'
import {ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetweenEl} from './utils'
import {traverseDocumentOrderEl, NS} from '../xml/utils'
import {highlightIndexwiseStringDiff} from '../html_utils'

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
		return ana ? parseInt(ana) : null;
	}

	morphTag() {
		let ana = this.elem.getAttribute('ana');
		if (ana !== null) {
			let wElem = this.elem.childElement(parseInt(ana));
			return wElem ? wElem.getAttribute('ana') : '*';
		}
		
		if (!this.elem.childElement(1)) {
			return this.elem.childElement(0).getAttribute('ana')
		}
	}

	morphTags() {
		let tags = new Array<string>();
		let lemmas = new Array<string>();
		for (let child of this.elem.childElements()) {
			tags.push(child.getAttribute('ana'));
			lemmas.push(child.getAttribute('lemma'));
		}
		
		return {tags, lemmas};
		//return highlightIndexwiseStringDiff(ret, 'morph-feature-highlight');
	}

	breaksLine() {
		let elName = this.elem.nameNs();
		return elName === P || elName === L;
	}

	disambig(index: number) {
		if (this.disambIndex() === index) {
			this.elem.removeAttribute('ana');
		} else {
			this.elem.setAttribute('ana', index.toString());
		}
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
		let ret = null;
		traverseDocumentOrderEl(this.elem, el => {
			if (el.nameNs() === W_) {
				let token = new TextToken(el);
				if (token.isAmbig()) {
					ret = token;
					return false;
				}
			}
		});

		return ret;
	}
	
	wordNum() {
		return parseInt(this.elem.getAttribute('word-id'));
	}
}