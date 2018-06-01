import { xmlNsResolver } from '../xml/utils'
import { xpath } from '../xml/utils.web'
import { serializeXmlNoNs } from '../utils.web'
import { WebapiElement } from '../xml/xmlapi_web/webapi_element'



////////////////////////////////////////////////////////////////////////////////
export function fragmentCorpusText(doc: Document) {
  const NUM_WORDS = 80
  let ret = new Array<DocumentFragment>()

  let paragraphs = xpath(doc, '//*[local-name()="p"]|//*[local-name()="chunk" and not(descendant::*[local-name()="p"])]',
    XPathResult.ORDERED_NODE_SNAPSHOT_TYPE) as Array<any>
  if (!paragraphs.length) {
    paragraphs = [doc.documentElement] // todo //xpath(doc, '//div//p', XPathResult.ORDERED_NODE_SNAPSHOT_TYPE)
  }
  let curNumWords = 0
  let range = doc.createRange()
  let rangeStart = paragraphs[0]
  for (let [i, p] of paragraphs.entries()) {
    let numWords = doc.evaluate('count(.//mi:w_|.//tei:w[not(ancestor::mi:w_)])', p, xmlNsResolver as any, XPathResult.NUMBER_TYPE, null).numberValue
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
