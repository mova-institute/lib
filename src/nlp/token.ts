import { MorphInterp } from './morph_interp'
import { keyvalue2attributesNormalized } from '../xml/utils'
import { Dict } from '../types'
import { CONJ_PROPAGATION_RELS } from './ud/uk_grammar'
import { CoolSet } from '../data_structures/cool_set'
import { uEq } from './ud/utils'



////////////////////////////////////////////////////////////////////////////////
export type TokenType = 'word' | 'glue'
export type CoreferenceType = 'equality' | 'bridge'
export type Structure =
  | 'gap'
  | 'document'
  | 'div'
  | 'paragraph'
  | 'sentence'
  | 'stanza'
  | 'line'
  | 'coref-split'
  | 'multitoken'

////////////////////////////////////////////////////////////////////////////////
export type TokenTag =
  | 'bad'

  | 'promoted'
  | 'graft'

  | 'adjdet'
  | 'nestedpunct'
  | 'error'
  | 'nomvoc'
  | 'gendisagr'
  | 'numdisagr'

  | 'commed_conj'
  | 'legal_alien'
  | 'conj_no_cc'
  | 'no_qmark'
  | 'no_dash'
  | 'inf_prep'
  | 'multi_names'
  | 'prepless_obl'
  | 'xcomp_mark'
  | 'inf-ccomp'
  | 'ok-imp-cop'
  | 'right-nummod'
  | 'not-shchojiji'
  | 'pred-right'
  | 'pred-right'
  | 'itsubj'
  | 'ok-glued-next'
  | 'ok-nonnom-subj'
  | 'promoted-not-adj'
  | 'mult-cc'
  | 'xsubj-from-head'
  | 'xsubj-is-phantom-iobj'
  | 'xsubj-is-obl'
  | 'ok-root'
  | 'orphanless-elision'
  | 'nominal-ellipsis'
  | 'iobj-agent'

////////////////////////////////////////////////////////////////////////////////
export interface Dependency {
  relation: string
  headId: string
  headIndex?: number
}

////////////////////////////////////////////////////////////////////////////////
export interface Coreference {
  type: CoreferenceType
  headId: string
  // headIndex?: number
}

////////////////////////////////////////////////////////////////////////////////
export class Token {
  private structure?: Structure
  private closing?: boolean
  private attributes: Dict<string> = {}
  private type: TokenType
  form?: string
  interps = new Array<MorphInterp>()
  id: string
  gluedNext: boolean
  opensParagraph: boolean  // temp
  deps = new Array<Dependency>()
  edeps = new Array<Dependency>()
  pdeps = new Array<Dependency>()
  hdeps = new Array<Dependency>()
  corefs = new Array<Coreference>()
  tags = new CoolSet<TokenTag>()
  index: number

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

  static word(form: string, interps: Array<MorphInterp>, attributes?: any) {
    let ret = new Token().setForm(form)
    ret.interps = interps
    ret.attributes = attributes
    return ret
  }

  get isPromoted() {
    return this.tags.has('promoted')
  }

  get isGraft() {
    return this.hasTag('graft')
  }

  hasTag(tag: TokenTag) {
    return this.tags.has(tag)
  }

  setType(type: TokenType) {
    this.type = type
    return this
  }

  setForm(form: string) {
    this.form = form
    return this
  }

  setAttribute(name: string, value: string) {
    this.attributes[name] = value
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
  getConjPropagation() {
    let rel = this.deps.find(x => CONJ_PROPAGATION_RELS.has(x.relation))
    if (rel) {
      return rel.relation
    }
  }
  isStructure() {
    return !!this.structure || this.isGlue()  // todo
  }
  isWord() { return !!this.form }

  isSentenceBoundary() {
    return this.structure === 'sentence' && this.closing
  }

  isDocumentStart() {
    return this.structure === 'document' && !this.isClosing()
  }

  isSentenceStartDeprecated() {
    return (this.structure === 'sentence' || this.structure === 'paragraph')
      && !this.closing
  }

  isGlue() { return this.type === 'glue' }
  isClosing() { return this.closing }
  isClosingStructure(name: Structure) {
    return this.isClosing() && (!name || this.getStructureName() === name)
  }

  isElided() {
    return !!this.attributes['ellipsis']
  }

  isElidedPredicate() {
    return this.attributes['ellipsis'] === 'predicate'
  }

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
    let dep = this.deps[0]
    return dep && dep.relation
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

  hasUDep(relation: string) {
    return this.deps.some(x => uEq(x.relation, relation))
  }

  getForm(corrected = true) {
    if (corrected) {
      return this.getAttribute('correct') || this.form
    }
    return this.form
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

////////////////////////////////////////////////////////////////////////////////
export function buildDep(head: Token, relation = head.rel): Dependency {
  return {
    relation,
    headId: head.id,
    headIndex: head.index,
  }
}
