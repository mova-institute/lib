import { CorpusDoc } from './doc_meta'


export interface StreamingExtractor {
  feed(line: string): CorpusDoc | undefined
}
