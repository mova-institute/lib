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

  constructor(public elem: AbstractElement, public hasSpaceBefore = true) {

  }

  equals(other: TextToken) {
    return other && other.elem.isSame(this.elem);
  }

  text() {  // todo
    if (this.elem.name() === W_) {
      return this.elem.firstElementChild().text();
    }

    return this.elem.text();
  }

  isWord() {  // todo: more name
    return this.elem.name() === W_;
  }

  isAmbig() {
    return !!this.elem.elementChild(1) && !this.elem.attribute('disamb');
  }

  isDisambed() {
    return this.elem.attribute('disamb') !== null;
  }

  isUntagged() {
    let tag = this.morphTag();
    return tag && tag.toLowerCase() === 'x';
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

  getDisambedInterpElem() {
    let disamb = this.elem.attribute('disamb');
    if (disamb !== null) {
      return this.elem.elementChild(Number(disamb));
    }

    return null;
  }

  disambIndex() {
    let attr = this.elem.attribute('disamb');
    if (attr) {
      let ret = Number.parseInt(attr);
      if (!Number.isNaN(ret)) {
        return ret;
      }
    }

    return null;
  }

  morphTag() {
    let index = this.disambIndex();
    if (index !== null) {
      let wElem = this.elem.elementChild(index);
      return wElem ? wElem.attribute('ana') : '*';  // todo: throw?
    }

    if (!this.elem.elementChild(1)) {
      return this.elem.elementChild(0).attribute('ana');
    }

    // todo: return null?
  }

  interps() {
    let ret = new Array<IMorphInterp>();
    for (let child of this.elem.elementChildren()) {
      ret.push({
        tag: child.attribute('ana'),
        lemma: child.attribute('lemma'),
      });
    }

    return ret;
  }

  lemma() {
    let disamb = this.getDisambedInterpElem();
    if (disamb) {
      return disamb.attribute('lemma');
    }
  }

  lemmaIfUnamb() {
    let tags = this.interps();
    if (tags.every(x => x.lemma === tags[0].lemma)) {
      return tags[0].lemma;
    }
  }

  breaksLine() {
    let elName = this.elem.name();
    return elName === P || elName === L;
  }

  getDisambAuthorName(i: number) {
    let author = this.elem.elementChild(i).attribute('author');
    if (author) {
      return author.split(':')[1];
    }
  }

  getDisambOptions() {
    let ret = new Array<{ lemma: string, tag: string }>();
    for (let child of this.elem.elementChildren()) {
      if (child.name() === W) {
        ret.push({
          lemma: child.attribute('lemma'),
          tag: child.attribute('ana'),
        });
      }
    }

    return ret;
  }

  disamb(index: number) {
    if (this.disambIndex() === index) {
      this.elem.removeAttribute('disamb');
    } else {
      this.elem.setAttribute('disamb', index);
    }
  }

  disambLast() {
    this.elem.setAttribute('disamb', this.elem.countElementChildren() - 1);
    return this;
  }

  resetDisamb() {
    this.elem.removeAttribute('disamb');
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
    this.elem.setAttribute('disamb', index.toString());
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

  private doAddInterp(attributes: Object) {
    let newInterp = this.elem.document().createElement('w');
    newInterp.text(this.text());
    newInterp.setAttributes(attributes);
    this.elem.appendChild(newInterp);

    return newInterp;
  }
}

//------------------------------------------------------------------------------
// function addFeature(setStr: string, feature: string) {
//   let set = new Set(setStr.split(':'));
//   set.add(feature);
//   let ret = [...set].sort().join(':');

//   return ret;
// }
