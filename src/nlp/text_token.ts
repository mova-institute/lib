import { AbstractNode, AbstractElement } from 'xmlapi';
import { W, W_, P, L, SE, PC } from './common_elements';
import { ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetweenEl } from './utils';
import { traverseDocumentOrderEl, nextElDocumentOrder } from '../xml/utils';
import { wrappedOrNull } from '../lang';
import { IMorphInterp } from './interfaces';



////////////////////////////////////////////////////////////////////////////////
export function $t(elem: AbstractElement) {
  return elem ? new TextToken(elem) : null;
}

////////////////////////////////////////////////////////////////////////////////
export class TextToken {
  private static TOKEN_ELEMS = new Set<string>([W_, PC]);
  private static TAG_X = 'x';
  private static DISAMB_ATTR = 'disamb';
  private static TAG_ATTR = 'ana';
  private static LEMMA_ATTR = 'lemma';

  constructor(public elem: AbstractElement, public hasSpaceBefore = true) {
  }

  isWord() {  // todo: more name
    return this.elem.name() === W_;
  }

  equals(other: TextToken) {
    return other && other.elem.isSame(this.elem);
  }

  disambIndex() {
    let attr = this.elem.attribute(TextToken.DISAMB_ATTR);
    if (attr) {
      let ret = Number.parseInt(attr);
      if (!Number.isNaN(ret)) {
        return ret;
      }
    }
  }

  isDisambed() {
    return this.disambIndex() !== undefined;
  }

  disamb(index: number) {
    if (this.disambIndex() === index) {
      this.elem.removeAttribute(TextToken.DISAMB_ATTR);
    } else {
      this.elem.setAttribute(TextToken.DISAMB_ATTR, index);  // todo: throw?
    }
  }

  resetDisamb() {
    this.elem.removeAttribute(TextToken.DISAMB_ATTR);
  }

  interps() {
    let ret = new Array<IMorphInterp>();
    for (let child of this.elem.elementChildren().filter(x => x.attribute(TextToken.TAG_ATTR) !== TextToken.TAG_X)) {
      ret.push({
        tag: child.attribute(TextToken.TAG_ATTR),
        lemma: child.attribute(TextToken.LEMMA_ATTR),
      });
    }

    return ret;
  }

  hasNoInterps() {
    return this.interps().length;  // todo: optimize
  }

  getDisambedInterpElem() {
    let disambIndex = this.elem.attribute(TextToken.DISAMB_ATTR);
    if (disambIndex !== null) {
      return this.elem.elementChild(Number(disambIndex));
    }
  }

  morphTag() {
    let disamb = this.getDisambedInterpElem();
    if (disamb) {
      return disamb.attribute(TextToken.TAG_ATTR);
    }
  }

  lemma() {
    let disamb = this.getDisambedInterpElem();
    if (disamb) {
      return disamb.attribute(TextToken.LEMMA_ATTR);
    }
  }

  interpAs(tag: string, lemma?: string) {
    lemma = lemma || this.text();
    let index = this.interps().findIndex(x => x.lemma === lemma && x.tag === tag);
    if (index === -1) {
      this.doAddMorphInterp(tag, lemma);
      index = this.elem.countElementChildren() - 1;
    }
    this.disamb(index);
    alert(index);
    return index;
  }

  text() {  // todo
    if (this.elem.name() === W_) {
      return this.elem.firstElementChild().text();
    }

    return this.elem.text();
  }

  isMarked() {
    return !!this.elem.attribute('mark');
  }

  isReviewed() {
    return this.elem.attribute('mark') === 'reviewed';
  }

  getInterpElem(tag: string, lemma: string) {
    return this.elem.evaluateElement(`w[@ana='${tag}' and @lemma='${lemma}']`);
  }

  lemmaIfUnamb() {
    let tags = this.interps();
    if (tags.every(x => x.lemma === tags[0].lemma)) {
      return tags[0].lemma;
    }
  }

  getDisambAuthorName(i: number) {
    let author = this.elem.elementChild(i).attribute('author');
    if (author) {
      return author.split(':')[1];
    }
  }

  disambLast() {
    this.elem.setAttribute(TextToken.DISAMB_ATTR, this.elem.countElementChildren() - 1);
    return this;
  }

  markOnly(value: string) {
    this.elem.setAttribute('mark', value);
  }

  setDisambedInterpAuthor(value: string) {
    this.getDisambedInterpElem().setAttribute('author', value);
  }

  addInterp(tag: string, lemma: string) {
    this.doAddInterp({
      lemma,
      ana: tag,
      type: 'manual',
    });

    return this;
  }

  review(index: number) {
    this.elem.setAttribute(TextToken.DISAMB_ATTR, index.toString());
    this.markOnly('reviewed');

    return this;
  }

  insertSentenceEnd() {
    let where: AbstractNode = this.elem;
    traverseDocumentOrderEl(where, el => {
      if (ELEMS_BREAKING_SENTENCE_NS.has(el.name())) {

      }
      else if (!el.nextElementSibling() || haveSpaceBetweenEl(el, el.nextElementSibling())) {
        where = el;
        return 'stop';
      }
      if (el.name() === W_) {
        return 'skip';
      }
    }, el => {
      if (ELEMS_BREAKING_SENTENCE_NS.has(el.name())) {
        where = el.lastChild();
        return 'stop';
      }
    });

    if (where.isElement() && (where as AbstractElement).name() !== SE) {
      let se = where.document().createElement('mi:se');
      where.insertAfter(se);
    }

    return this;
  }

  next(f: (token: TextToken) => boolean) {
    let ret = null;
    traverseDocumentOrderEl(this.elem, el => {
      if (el !== this.elem && el.name() === W_) {
        let token = new TextToken(el);
        if (f(token)) {
          ret = token;
          return 'stop';
        }
      }
    });

    return ret;
  }

  nextToken() {
    let next = nextElDocumentOrder(this.elem, TextToken.TOKEN_ELEMS);
    return wrappedOrNull(TextToken, next);
  }

  wordNum() {  // todo: real, ordered num?
    let n = this.elem.attribute('n');
    return n ? Number.parseInt(n, 10) : null;
  }

  hashtag(value: string) {
    let hashtag = '#' + value;
    let interpElemIndex = this.interps().findIndex(x => x.tag === hashtag);
    if (interpElemIndex === -1) {
      this.doAddInterp({ ana: hashtag });
      return this.interps().length - 1;
    }

    return interpElemIndex;
  }

  breaksLine() {
    let elName = this.elem.name();
    return elName === P || elName === L;
  }

  private doAddInterp(attributes: Object) {
    let newInterp = this.elem.document().createElement('w');
    newInterp.text(this.text());
    newInterp.setAttributes(attributes);
    this.elem.appendChild(newInterp);

    return newInterp;
  }

  private doAddMorphInterp(tag: string, lemma: string) {
    this.doAddInterp({
      [TextToken.TAG_ATTR]: tag,
      [TextToken.LEMMA_ATTR]: lemma,
    });
  }
}
