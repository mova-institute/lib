import { xmlNsResolver, encloseInRootNs } from '../xml/utils'
import { xpath } from '../xml/utils.web'
import { serializeXmlNoNs, parseXml } from '../utils.web'
// import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { /*tokenizeTei, morphInterpret, enumerateWords, */ firstNWords } from './utils'
import { WebapiElement } from '../xml/xmlapi-web/webapi_element'


////////////////////////////////////////////////////////////////////////////////
export function fragmentCorpusText(doc: Document) {
  const NUM_WORDS = 80
  let ret = new Array<DocumentFragment>()

  let paragraphs: any[] = xpath(doc, '//*[local-name()="p"]|//*[local-name()="chunk" and not(descendant::*[local-name()="p"])]', XPathResult.ORDERED_NODE_SNAPSHOT_TYPE)
  if (!paragraphs.length) {
    paragraphs = [doc.documentElement] // todo //xpath(doc, '//div//p', XPathResult.ORDERED_NODE_SNAPSHOT_TYPE)
  }
  let curNumWords = 0
  let range = doc.createRange()
  let rangeStart = paragraphs[0]
  for (let [i, p] of paragraphs.entries()) {
    let numWords = doc.evaluate('count(.//mi:w_|.//tei:w[not(ancestor::mi:w_)])', p, <any>xmlNsResolver, XPathResult.NUMBER_TYPE, null).numberValue
    curNumWords += numWords
    if (curNumWords >= NUM_WORDS || i === paragraphs.length - 1) {
      range.setStartBefore(rangeStart)
      range.setEndAfter(p)
      ret.push(range.cloneContents())
      rangeStart = paragraphs[i + 1]
      curNumWords = 0
    }
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function textFragmentCorpusText(doc: Document) {
  return fragmentCorpusText(doc).map(x => ({
    xmlstr: serializeXmlNoNs(x),
    firstWords: firstNWords(4, new WebapiElement(x.firstElementChild)),
  }))
}

////////////////////////////////////////////////////////////////////////////////
/*export function morphTagText(value: string, tagger: MorphAnalyzer, numerate: boolean, mte = false) {
  let doc = parseXml(value)
  if (!doc || !doc.lookupNamespaceURI('mi')) {
    value = value.replace(/^\s*<\?[^>]*>/, '')
    doc = parseXml(encloseInRootNs(value, 'text'))
  }
  let root = new WebapiDocument(doc).root()
  tokenizeTei(root, tagger)
  morphInterpret(root, tagger, mte)
  if (numerate) {
    enumerateWords(root)
  }
  let ret = root.document().serialize()

  return ret
}
*/
