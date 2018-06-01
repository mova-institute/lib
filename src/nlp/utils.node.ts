import { markWordwiseDiff, normalizeCorpusText } from './utils'
import { parseXml } from '../xml/utils.node'
import { LibxmljsElement } from '../xml/xmlapi_libxmljs/libxmljs_element'
import * as he from 'he'


////////////////////////////////////////////////////////////////////////////////
export function markWordwiseDiffStr(mineStr: string, theirsStr: string) {
  let mine = parseXml(mineStr)
  return {
    marked: mine,
    numDiffs: markWordwiseDiff(mine, parseXml(theirsStr)),
  }
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeCorpusTextTxt(xmlstr: string) {
  xmlstr = normalizeEntities(xmlstr)
    .replace(/(\s*)\n\s*\n(\s*)/g, '$1\n$2')
    .replace(/&nbsp;/g, ' ')
  let root = parseXml(xmlstr)

  return normalizeCorpusText(root)
}

////////////////////////////////////////////////////////////////////////////////
const mustEscapeInText = new Set(['lt', 'amp'])
export function normalizeEntities(text: string) {  // todo: wait for libxmljs issues resolved
  text = text.replace(/&(\w+);/g, (match, p1) => {
    if (mustEscapeInText.has(p1)) {
      return match
    }
    let decoded = he.escape(match)
    if (/^\s$/.test(decoded)) {  // todo: wait for unicode
      return ''
    }
    return decoded
  })

  return text
}
