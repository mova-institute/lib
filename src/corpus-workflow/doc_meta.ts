export interface CorpusDoc {
  paragraphs: string[]
  title: string
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
  constructor(private referenceTitle: string) {

  }

  toObject() {
    let ret: any = {}

    return ret
  }
}
