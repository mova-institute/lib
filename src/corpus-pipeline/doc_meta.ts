export interface CorpusDoc {
  paragraphs: Array<string>
  title: string
  source: string
  url?: string
  authors?: Array<string>
  date?: string
  author?: string
}


export type Disamb = 'жодного' | 'часткове-правила' | 'руками-Політехніка' | 'руками-стандарт'
export type Type = 'невизначені'
export type Domain = 'невизначені'

export interface CorpusDocumentAttributes {
  reference_title: string
  type: Type
  disamb: Disamb
  domain: Domain

  title?: string
  date?: string
  author?: string
  original_author?: string
  url?: string
  comment?: string
}

export class DocMeta {
  constructor() {

  }

  toObject() {
    let ret: any = {}

    return ret
  }
}
