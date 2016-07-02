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
  private static FLAGS_X = 'x';
  private static DISAMB_ATTR = 'disamb';
  private static FLAGS_ATTR = 'ana';
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
    this.elem.setAttribute(TextToken.DISAMB_ATTR, index);
  }

  toggleDisamb(index: number) {
    if (this.disambIndex() === index) {
      this.elem.removeAttribute(TextToken.DISAMB_ATTR);
    } else {
      this.disamb(index);
    }
  }

  resetDisamb() {
    this.elem.removeAttribute(TextToken.DISAMB_ATTR);
  }

  interps() {
    let ret = new Array<IMorphInterp>();
    for (let child of this.elem.elementChildren()) {
      ret.push({
        flags: child.attribute(TextToken.FLAGS_ATTR),
        lemma: child.attribute(TextToken.LEMMA_ATTR),
      });
    }

    return ret;
  }

  definiteInterps() {
    return this.interps().filter(x => x.flags !== TextToken.FLAGS_X);
  }

  possibleInterps() {
    if (this.isDisambed()) {
      return [this.interp()];
    }
    return this.definiteInterps();
  }

  possibleInterpsUnzipped() {
    let interp = this.interp();
    if (interp) {
      return [[interp.flags], [interp.lemma]];
    }
    let flagss = new Set<string>();
    let lemmas = new Set<string>();
    let interps = this.definiteInterps();
    if (!interps.length) {
      interps = this.interps();
    }
    for (let {flags, lemma} of interps) {
      flagss.add(flags);
      lemmas.add(lemma);
    }
    return [[...flagss], [...lemmas]];
  }

  hasDefiniteInterps() {
    return !!this.definiteInterps().length;  // todo: optimize
  }

  hasInterp(flags: string, lemma?: string) {
    return this.interps().some(x => x.flags === flags && (lemma === undefined || x.lemma === lemma));
  }

  getDisambedInterpElem() {
    let disambIndex = this.disambIndex();
    if (disambIndex !== undefined) {
      return this.elem.elementChild(disambIndex);
    }
  }

  interp() {
    let interpElem = this.getDisambedInterpElem();
    return interpElem && {
      flags: interpElem.attribute(TextToken.FLAGS_ATTR),
      lemma: interpElem.attribute(TextToken.LEMMA_ATTR),
    };
  }

  flags() {
    let interpElem = this.getDisambedInterpElem();
    if (interpElem) {
      return interpElem.attribute(TextToken.FLAGS_ATTR);
    }
  }

  flagsOfUnambig() {
    let interps = this.definiteInterps();
    if (interps.length === 1) {
      return interps[0].flags;
    }
  }

  lemma() {
    let interpElem = this.getDisambedInterpElem();
    if (interpElem) {
      return interpElem.attribute(TextToken.LEMMA_ATTR);
    }
  }

  setInterp(flags: string, lemma?: string) {
    this.disamb(this.assureHasInterp(flags, lemma));
  }

  toggleInterp(flags: string, lemma?: string) {
    this.toggleDisamb(this.assureHasInterp(flags, lemma));
  }

  isInterpreted(flags: string, lemma?: string) {
    return this.flags() === flags && (lemma === undefined || this.lemma() === lemma);
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

  isToResolve() {
    return this.elem.attribute('mark') === 'to-resolve';
  }

  getInterpElem(flags: string, lemma: string) {
    return this.elem.evaluateElement(`w[@ana='${flags}' and @lemma='${lemma}']`);
  }

  lemmaIfUnamb() {
    let tags = this.interps();
    if (tags.every(x => x.lemma === tags[0].lemma)) {
      return tags[0].lemma;
    }
  }

  getDisambAuthorName(flags: string, lemma?: string) {
    let elem = this.findInterpElem(flags, lemma);
    if (elem) {
      let author = elem.attribute('author');
      if (author) {
        return author.split(':')[1];
      }
    }
  }

  disambLast() {
    this.elem.setAttribute(TextToken.DISAMB_ATTR, this.elem.countElementChildren() - 1);
    return this;
  }

  mark(value?: string) {
    if (value === undefined) {
      return this.elem.attribute('mark');
    }
    this.elem.setAttribute('mark', value);
  }

  setDisambedInterpAuthor(value: string) {
    this.getDisambedInterpElem().setAttribute('author', value);
  }

  setInterpAuthor(flags: string, lemma: string, value: string) {
    let elem = this.findInterpElem(flags, lemma);
    if (!elem) {
      throw new Error('No such interpretation');
    }
    elem.setAttribute('author', value);
  }

  addInterp(flags: string, lemma: string) {
    this.doAddInterp({
      lemma,
      ana: flags,
      type: 'manual',
    });

    return this;
  }

  review(flags: string, lemma?: string) {
    this.setInterp(flags, lemma);
    this.mark('reviewed');
  }

  isReviewed() {
    return this.elem.attribute('mark') === 'reviewed';
  }

  resolve(flags: string, lemma?: string) {
    this.setInterp(flags, lemma);
    this.mark('resolved');
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

  breaksLine() {
    let elName = this.elem.name();
    return elName === P || elName === L;
  }

  isEquallyInterpreted(other: TextToken) {
    if (this.equals(other)) {
      return true;
    }
    let thisInterp = this.interp();
    let otherInterp = other.interp();
    return thisInterp === otherInterp
      || (thisInterp.flags === otherInterp.flags && thisInterp.lemma === otherInterp.lemma);
  }

  assureHasInterp(flags: string, lemma?: string) {
    lemma = lemma || this.text();
    let index = this.interps().findIndex(x => x.lemma === lemma && x.flags === flags);
    if (index === -1) {
      this.doAddMorphInterp(flags, lemma);
      index = this.elem.countElementChildren() - 1;
    }
    return index;
  }

  appendInterps(value: Iterable<IMorphInterp>) {
    for (let interp of value) {
      this.doAddMorphInterp(interp.flags, interp.lemma);
    }
  }

  private doAddInterp(attributes: Object) {
    let newInterp = this.elem.document().createElement('w');
    newInterp.text(this.text());
    newInterp.setAttributes(attributes);
    this.elem.appendChild(newInterp);

    return newInterp;
  }

  private doAddMorphInterp(flags: string, lemma: string) {
    this.doAddInterp({
      [TextToken.FLAGS_ATTR]: flags,
      [TextToken.LEMMA_ATTR]: lemma,
    });
  }

  private findInterpElem(flags: string, lemma?: string) {
    return this.elem.elementChildren().find(x => x.attribute(TextToken.FLAGS_ATTR) === flags
      && (!lemma || x.attribute(TextToken.LEMMA_ATTR) === lemma));
  }
}
