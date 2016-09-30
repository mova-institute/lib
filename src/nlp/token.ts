import { MorphInterp } from './morph_interp'



////////////////////////////////////////////////////////////////////////////////
export type TokenType = 'word' | 'glue'
export type Structure = 'div' | 'paragraph' | 'sentence' | 'stanza' | 'line'

////////////////////////////////////////////////////////////////////////////////
export class Token {
  private structure: Structure
  private closing: boolean
  private type: TokenType
  form?: string
  interps = new Array<MorphInterp>()

  static structure(structure: Structure, closing: boolean) {
    let ret = new Token()
    ret.structure = structure
    ret.closing = closing
    return ret
  }

  static glue() {
    return new Token().setType('glue')
  }

  static word(form: string, interps: MorphInterp[]) {
    let ret = new Token().setForm(form)
    ret.interps = interps
    return ret
  }

  setType(type: TokenType) {
    this.type = type
    return this
  }

  setForm(form: string) {
    this.form = form
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
  isStructure() { return !!this.structure }
  isWord() { return !!this.form }
  isSentenceEnd() { return this.structure === 'sentence' && this.closing === false }
  isGlue() { return this.type === 'glue' }
  isClosing() { return this.closing === true }

  firstInterp() {
    return this.interps[0]
  }

  formRepesentation() {
    if (this.form) {
      return this.form
    }
    if (this.isGlue()) {
      return '<g/>'
    }
  }
}
