////////////////////////////////////////////////////////////////////////////////
export interface CorpusDoc {
  paragraphs: Array<string>
  title: string
  source: string
  url?: string
  authors?: Array<string>
  date?: string
  author?: string
}
