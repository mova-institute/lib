import { MorphInterp } from './morph_interp'
import { keyvalue2attributesNormalized } from '../xml/utils'



////////////////////////////////////////////////////////////////////////////////
export type TokenType = 'word' | 'glue'
export type Structure = 'document' | 'div' | 'paragraph' | 'sentence' | 'stanza' | 'line'
export type TokenTag =
  | 'promoted'
  | 'graft'

  | 'adjdet'
  | 'nestedpunct'
  | 'error'
  | 'nomvoc'
  | 'gendisagr'

export interface Dependency {
  relation: string
  headId: string
  headIndex?: number
}

////////////////////////////////////////////////////////////////////////////////
export class Token {
  private structure?: Structure
  private closing?: boolean
  private attributes?: any
  private type: TokenType
  form?: string
  interps = new Array<MorphInterp>()
  id: string
  glued: boolean
  opensParagraph: boolean  // temp
  deps = new Array<Dependency>()
  tags = new Array<TokenTag>()

  static structure(structure: Structure, closing: boolean, attributes?: any) {
    let ret = new Token()
    ret.structure = structure
    ret.closing = closing
    ret.attributes = attributes || {}
    return ret
  }

  static glue() {
    return new Token().setType('glue')
  }

  static word(form: string, interps: MorphInterp[], attributes?: any) {
    let ret = new Token().setForm(form)
    ret.interps = interps
    ret.attributes = attributes
    return ret
  }

  get isPromoted() {
    return this.tags.includes('promoted')
  }

  get isGraft() {
    return this.hasTag('graft')
  }

  hasTag(tag: TokenTag) {
    return this.tags.includes(tag)
  }

  setType(type: TokenType) {
    this.type = type
    return this
  }

  setForm(form: string) {
    this.form = form
    return this
  }

  setAttributes(attributes: any) {
    this.attributes = attributes
    return this
  }

  addInterp(interp: MorphInterp) {
    this.interps.push(interp)
    return this
  }

  addInterps(interps: Iterable<MorphInterp>) {
    this.interps.push(...interps)
    return this
  }

  getStructureName() { return this.structure }
  getAttributes() { return this.attributes }
  getAttribute(name: string) {
    return this.attributes && this.attributes[name]
  }
  isStructure() {
    return !!this.structure || this.isGlue()  // todo
  }
  isWord() { return !!this.form }

  isSentenceBoundary() {
    return this.structure === 'sentence' && this.closing === true
  }

  isSentenceStartDeprecated() {
    return (this.structure === 'sentence' || this.structure === 'paragraph')
      && this.closing === false
  }

  isGlue() { return this.type === 'glue' }
  isClosing() { return this.closing === true }

  interp0() {
    return this.interps[0]
  }

  get interp() {
    return this.interps[0]
  }

  set interp(interp: MorphInterp) {
    this.interps[0] = interp
  }

  get headIndex() {
    return this.deps.length > 0 ? this.deps[0].headIndex : undefined
  }

  set headIndex(val: number) {
    this.deps[0].headIndex = val
  }

  get rel() {
    return this.deps.length > 0 ? this.deps[0].relation : undefined
  }

  set rel(val: string) {
    this.deps[0].relation = val
  }

  get comment() {
    return this.getAttribute('comment')
  }

  set comment(comment: string) {
    this.attributes.comment = comment
  }

  hasDeps() {
    return !!this.deps.length
  }

  correctedForm() {
    return this.getAttribute('correct') || this.form
  }

  toString() {
    if (this.form) {
      return this.form
    }
    if (this.isGlue()) {
      return '<g/>'
    }
    if (this.isStructure()) {
      let tagName = this.getStructureName()
      if (!tagName) {
        // let message = `Unknown structure`
        // console.error()
        // throw new Error('Unknown structure')
      }
      if (this.isClosing()) {
        return `</${tagName}>`
      }
      let attributes = this.getAttributes()
      if (attributes) {
        let attributesStr = keyvalue2attributesNormalized(attributes)
        if (attributesStr) {
          return `<${tagName} ${keyvalue2attributesNormalized(attributes)}>`
        }
      }
      return `<${tagName}>`
    }
  }
}
