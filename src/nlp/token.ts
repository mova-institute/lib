import { MorphInterp } from './morph_interp'
import { keyvalue2attributesNormalized } from '../xml/utils'



////////////////////////////////////////////////////////////////////////////////
export type TokenType = 'word' | 'glue'
export type Structure = 'document' | 'div' | 'paragraph' | 'sentence' | 'stanza' | 'line'

////////////////////////////////////////////////////////////////////////////////
export class Token {
  private structure?: Structure
  private closing?: boolean
  private attributes?: any
  private type: TokenType
  form?: string
  interps = new Array<MorphInterp>()

  static structure(structure: Structure, closing: boolean, attributes?: any) {
    let ret = new Token()
    ret.structure = structure
    ret.closing = closing
    ret.attributes = attributes
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
    return this.attributes[name]
  }
  isStructure() {
    return !!this.structure || this.isGlue()  // todo
  }
  isWord() { return !!this.form }

  isSentenceStart() {
    return (this.structure === 'sentence' || this.structure === 'paragraph')
      && this.closing === false
  }

  isSentenceEnd() {
    return (this.structure === 'sentence' || this.structure === 'paragraph')
      && this.closing === true
  }

  isGlue() { return this.type === 'glue' }
  isClosing() { return this.closing === true }

  firstInterp() {
    return this.interps[0]
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
