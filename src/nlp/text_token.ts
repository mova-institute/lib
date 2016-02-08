import {INode, IElement} from '../xml/api/interfaces'
import {W, W_, P, L, SE, PC} from './common_elements'
import {ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetweenEl} from './utils'
import {traverseDocumentOrderEl, NS, nextElDocumentOrder} from '../xml/utils'
import {markIndexwiseStringDiff} from '../html_utils'
import {wrappedOrNull} from '../lang';

////////////////////////////////////////////////////////////////////////////////
export class TextToken {
  private static TOKEN_ELEMS = new Set<string>([W_, PC]);

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
    return !!this.elem.childElement(1) && !this.elem.getAttribute('disamb');
  }

  isUntagged() {
    return this.morphTag() === 'X';
  }
  
  isMarked() {
    let mark = this.elem.getAttribute('mark');
    return mark ? new Set(mark.split(':')).has('diff') : false;
  }
  
  isReviewed() {
    let mark = this.elem.getAttribute('mark');
    return mark ? new Set(mark.split(':')).has('reviewed') : false;
  }

  disambIndex() {
    let ret = this.elem.getAttribute('disamb');
    return ret ? parseInt(ret) : null;
  }

  morphTag() {
    return getUnambMorphTag(this.elem);
  }

  morphTags() {
    let tags = new Array<string>();
    let lemmas = new Array<string>();
    for (let child of this.elem.childElements()) {
      tags.push(child.getAttribute('ana'));
      lemmas.push(child.getAttribute('lemma'));
    }

    return { tags, lemmas };
    //return markedIndexwiseStringDiff(ret, 'morph-feature-marked');
  }
  
  lemmaIfUnamb() {
    let lemmas = this.morphTags().lemmas;
    if (lemmas.every(x => x === lemmas[0])) {
      return lemmas[0];
    }
  }

  breaksLine() {
    let elName = this.elem.nameNs();
    return elName === P || elName === L;
  }

  disambig(index: number) {
    if (this.disambIndex() === index) {
      this.elem.removeAttribute('disamb');
    } else {
      this.elem.setAttribute('disamb', index);
    }
  }
  
  disambigLast() {
    this.elem.setAttribute('disamb', this.elem.childElementCount - 1);
    return this;
  }
  
  addInterp(tag: string, lemma: string) {
    let newInterp = this.elem.ownerDocument.createElement('w');
    newInterp.textContent = this.text();
    newInterp.setAttribute('lemma', lemma);
    newInterp.setAttribute('ana', tag);
    newInterp.setAttribute('type', 'manual');
    this.elem.appendChild(newInterp);
    
    return this;
  }
  
  review(index: number) {
    this.elem.setAttribute('disamb', index.toString());
    this.elem.setAttribute('mark', addFeature(this.elem.getAttribute('mark'), 'reviewed'));
    
    return this;
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
    
    return this;
  }

  next(f: (token: TextToken) => boolean) {
    let ret = null;
    traverseDocumentOrderEl(this.elem, el => {
      if (el !== this.elem && el.nameNs() === W_) {
        let token = new TextToken(el);
        if (f(token)) {
          ret = token;
          return false;
        }
      }
    });
    
    return ret;
  }

  nextAmbigWord() {
    return this.next(token => token.isAmbig());
  }

  nextMarked() {
    let ret = this.next(token => token.isMarked());//console.log(ret);
    return ret;    
  }

  nextToken() {
    let next = nextElDocumentOrder(this.elem, TextToken.TOKEN_ELEMS);
    return wrappedOrNull(TextToken, next);
  }

  wordNum() {  // todo: real, ordered num?
    let n = this.elem.getAttribute('n');
    return n ? parseInt(n) : null;
  }
}

////////////////////////////////////////////////////////////////////////////////
export function getUnambMorphTag(w_: IElement) {
  let disamb = w_.getAttribute('disamb');
  if (disamb !== null) {
    let wElem = w_.childElement(Number(disamb));
    return wElem ? wElem.getAttribute('ana') : '*';  // todo: throw?
  }

  if (!w_.childElement(1)) {
    return w_.childElement(0).getAttribute('ana');
  }
}

//------------------------------------------------------------------------------
function addFeature(setStr: string, feature: string) {
  let set = new Set(setStr.split(':'));
  set.add(feature);
  let ret = Array.from(set).sort().join(':');
  
  return ret;
}