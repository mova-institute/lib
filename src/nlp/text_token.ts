import { ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetweenEl } from './utils'
import { traverseDocumentOrderEl, nextElDocumentOrder } from '../xml/utils'
import { wrappedOrNull } from '../lang'
import { IStringMorphInterp } from './interfaces'
import { uniq } from '../algo'
import { AbstractElement } from '../xml/xmlapi/abstract_element'
import { AbstractNode } from '../xml/xmlapi/abstract_node'



////////////////////////////////////////////////////////////////////////////////
export function $t(elem: AbstractElement) {
  return elem ? new TextToken(elem) : null
}

////////////////////////////////////////////////////////////////////////////////
export class TextToken {
  private static TOKEN_ELEMS = new Set<string>(['w_'])
  private static FLAGS_X = 'x'
  private static DISAMB_ATTR = 'disamb'
  private static FLAGS_ATTR = 'ana'
  private static LEMMA_ATTR = 'lemma'
  private static MARK_ATTR = 'mark'
  private static AUTHOR_ATTR = 'author'
  private static UNRESOLVABLE_AMBIGUITY_SEPARATOR = '|'

  constructor(public elem: AbstractElement, public hasSpaceBefore = true) {
  }

  isWord() {  // todo: more name
    return this.elem.localName() === 'w_'
  }

  equals(other: TextToken) {
    return other && other.elem.isSame(this.elem)
  }

  isDisambed() {
    return !!this.getDisambIndexes().length
  }

  clearDisamb() {
    this.elem.removeAttribute(TextToken.DISAMB_ATTR)
  }

  getNumDisambedInterps() {
    return this.getDisambIndexes().length
  }

  getDefiniteInterps() {
    return this.getAllInterps().filter(x => x.flags !== TextToken.FLAGS_X)
  }

  disambedOrDefiniteInterps() {
    let disambedInterps = this.getDisambedInterps()
    if (disambedInterps.length) {
      return disambedInterps
    }
    let interps = this.getAllInterps()
    let definiteInterps = interps.filter(x => x.flags !== TextToken.FLAGS_X)
    if (definiteInterps.length) {
      return definiteInterps
    }

    return interps
  }

  hasDefiniteInterps() {
    return !!this.getDefiniteInterps().length  // todo: optimize
  }

  hasInterp(flags: string, lemma?: string) {
    return this.getAllInterps().some(x => x.flags === flags && (lemma === undefined || x.lemma === lemma))
  }

  hasAllInterps(tags: Array<IStringMorphInterp>) {
    // return tags this.getAllInterps().some(x => x.flags === flags && (lemma === undefined || x.lemma === lemma))
  }

  getDisambedInterps() {
    return this.getDisambedInterpElems().filter(x => x).map(x => ({
      flags: x.attribute(TextToken.FLAGS_ATTR),
      lemma: x.attribute(TextToken.LEMMA_ATTR),
    }))
  }

  flagsIfSingleDisamb() {
    let ret = this.getDisambedInterpElems().map(x => x.attribute(TextToken.FLAGS_ATTR))
    if (ret.length === 1) {
      return ret
    }
  }

  flagsIfUnambig() {
    let interps = this.getDefiniteInterps()
    if (interps.length === 1) {
      return interps[0].flags
    }
  }

  lemmas() {
    return this.getDisambedInterpElems().map(x => x.attribute(TextToken.LEMMA_ATTR))
  }

  interpAs(tags: Array<IStringMorphInterp>) {
    this.setDisambIndexes(tags.map(x => this.assureHasInterp(x.flags, x.lemma)))
  }

  onlyInterpAs(flags: string, lemma: string) {
    this.setDisambIndexes([this.assureHasInterp(flags, lemma)])
  }

  alsoInterpAs(flags: string, lemma: string) {
    let disambIndexes = this.getDisambIndexes()
    disambIndexes.push(this.assureHasInterp(flags, lemma))
    this.setDisambIndexes(disambIndexes)
  }

  keepOnlyDisambed() {
    let indexes = this.getDisambIndexes()
    if (indexes.length) {
      let interpElems = this.elem.children().toArray()
      for (let i = 0; i < interpElems.length; ++i) {
        if (indexes.indexOf(i) === -1) {
          interpElems[i].remove()
        }
      }
    }
  }

  // dontInterpAs(tag: IMorphInterp) {
  //   let index = this.getAllInterps().findIndex(x => x.flags === tag.flags && x.lemma === tag.lemma)
  //   if (index >= 0) {
  //     this.setDisambIndexes(this.getDisambIndexes().filter(x => x !== index))
  //   }
  // }

  hasDisambedInterp(flags: string, lemma?: string) {
    return !!this.getDisambedInterps().find(x =>
      flags === x.flags && (lemma === undefined || x.lemma === lemma))
  }

  toggleOnlyInterp(flags: string, lemma?: string) {
    if (this.hasDisambedInterp(flags, lemma)) {
      this.clearDisamb()
    } else {
      this.onlyInterpAs(flags, lemma)
    }
  }

  toggleAlsoInterp(flags: string, lemma?: string) {
    this.toggleDisamb(this.assureHasInterp(flags, lemma))
  }

  text() {  // todo
    if (this.elem.localName() === 'w_') {
      return this.elem.firstElementChild().text()
    }

    return this.elem.text()
  }

  isMarked() {
    return !!this.elem.attribute('mark')
  }

  isToResolve() {
    return this.elem.attribute('mark') === 'to-resolve'
  }

  lemmaIfUnamb() {
    let tags = this.getAllInterps()
    if (tags.every(x => x.lemma === tags[0].lemma)) {
      return tags[0].lemma
    }
  }

  getDisambAuthors(flags: string, lemma?: string) {  // todo
    let elem = this.findInterpElem(flags, lemma)
    if (elem) {
      let author = elem.attribute(TextToken.AUTHOR_ATTR)
      if (author) {
        return author.split('|')
      }
    }
    return []
  }

  getMark() {
    return this.elem.attribute(TextToken.MARK_ATTR)
  }

  setMark(value: string) {
    this.elem.setAttribute(TextToken.MARK_ATTR, value)
  }

  setDisambedInterpsAuthor(value: string) {
    this.getDisambedInterpElems().forEach(x => x.setAttribute(TextToken.AUTHOR_ATTR, value))
  }

  addInterpAuthor(flags: string, lemma: string, value: string) {
    let elem = this.findInterpElem(flags, lemma)
    if (!elem) {
      throw new Error('No such interpretation')
    }
    let existing = elem.attribute(TextToken.AUTHOR_ATTR)
    if (existing) {
      value = existing + '|' + value
    }
    elem.setAttribute(TextToken.AUTHOR_ATTR, value)
  }

  markReviewed() {
    this.setMark('reviewed')
  }

  markResolved() {
    this.setMark('resolved')
  }

  isReviewed() {
    return this.elem.attribute(TextToken.MARK_ATTR) === 'reviewed'
  }

  insertSentenceEnd() {
    let where: AbstractNode = this.elem
    traverseDocumentOrderEl(where, el => {
      if (ELEMS_BREAKING_SENTENCE_NS.has(el.localName())) {

      } else if (!el.nextElementSibling() || haveSpaceBetweenEl(el, el.nextElementSibling())) {
        where = el
        return 'stop'
      }
      if (el.localName() === 'w_') {
        return 'skip'
      }
    }, el => {
      if (ELEMS_BREAKING_SENTENCE_NS.has(el.localName())) {
        where = el.lastChild()
        return 'stop'
      }
    })

    if (where.isElement() && (where as AbstractElement).localName() !== 'sb') {
      let sb = where.document().createElement('mi:sb')
      where.insertAfter(sb)
    }

    return this
  }

  next(f: (token: TextToken) => boolean) {
    let ret = null
    traverseDocumentOrderEl(this.elem, el => {
      if (el !== this.elem && el.localName() === 'w_') {
        let token = new TextToken(el)
        if (f(token)) {
          ret = token
          return 'stop'
        }
      }
    })

    return ret
  }

  nextToken() {
    let next = nextElDocumentOrder(this.elem, TextToken.TOKEN_ELEMS)
    return wrappedOrNull(TextToken, next)
  }

  breaksLine() {
    let elName = this.elem.localName()
    return elName === 'p' || elName === 'l' || elName === 'chunk'
  }

  isEquallyInterpreted(other: TextToken) {
    if (this.equals(other)) {
      return true
    }
    let thisInterps = this.getDisambedInterps()
    let otherInterps = other.getDisambedInterps()
    if (thisInterps.length === otherInterps.length) {
      return thisInterps.every(x => !!otherInterps.find(
        xx => xx.flags === x.flags && xx.lemma === x.lemma))
    }
    return false
  }

  assureHasInterp(flags: string, lemma?: string) {
    lemma = lemma || this.text()
    let index = this.getAllInterps().findIndex(x => x.lemma === lemma && x.flags === flags)
    if (index === -1) {
      this.doAddMorphInterp(flags, lemma)
      index = this.elem.countElementChildren() - 1
    }
    return index
  }

  private getDisambedInterpElems() {
    return this.getDisambIndexes().map(x => this.elem.elementChild(x))
  }

  private getAllInterps() {
    return this.elem.elementChildren().map(x => ({
      flags: x.attribute(TextToken.FLAGS_ATTR),
      lemma: x.attribute(TextToken.LEMMA_ATTR),
    })).toArray() as Array<{ flags: string, lemma: string }>
  }

  private toggleDisamb(index: number) {
    let disambIndexes = this.getDisambIndexes()
    if (disambIndexes.indexOf(index) >= 0) {
      this.setDisambIndexes(disambIndexes.filter(x => x !== index))
    } else {
      disambIndexes.push(index)
      this.setDisambIndexes(disambIndexes)
    }
  }

  private getDisambIndexes() {
    let attr = this.elem.attribute(TextToken.DISAMB_ATTR)
    if (attr) {
      return attr.split(TextToken.UNRESOLVABLE_AMBIGUITY_SEPARATOR).map(x => Number(x))
    }
    return []
  }

  private setDisambIndexes(value: Array<number>) {
    value = uniq(value)
    this.elem.setAttribute(TextToken.DISAMB_ATTR, value.join(TextToken.UNRESOLVABLE_AMBIGUITY_SEPARATOR))
  }

  private doAddInterp(attributes: Object) {
    let newInterp = this.elem.document().createElement('w')
    newInterp.text(this.text())
    newInterp.setAttributes(attributes)
    this.elem.appendChild(newInterp)

    return newInterp
  }

  private doAddMorphInterp(flags: string, lemma: string) {
    this.doAddInterp({
      [TextToken.FLAGS_ATTR]: flags,
      [TextToken.LEMMA_ATTR]: lemma,
    })
  }

  private findInterpElem(flags: string, lemma?: string) {
    return this.elem.elementChildren().find(x => x.attribute(TextToken.FLAGS_ATTR) === flags
      && (!lemma || x.attribute(TextToken.LEMMA_ATTR) === lemma))
  }
}
