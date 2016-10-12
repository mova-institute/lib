import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { parseXml } from '../xml/utils.node'
import { tokenizeTei } from '../nlp/utils'
import { getLibRootRelative } from '../path.node'

let morphAnalyzer = createMorphAnalyzerSync(getLibRootRelative('..', 'data', 'dict', 'vesum'))

////////////////////////////////////////////////////////////////////////////////
export function tokenize(input: { xmlstr: string }) {
  let root = parseXml(input.xmlstr)
  let ret = tokenizeTei(root, morphAnalyzer)

  return ret.document().serialize()
}

////////////////////////////////////////////////////////////////////////////////
export function findUnknownWords(input: { words: string[] }) {
  // console.error(words)
  return input.words.map(x => morphAnalyzer.hasAnyCase(x))
}
