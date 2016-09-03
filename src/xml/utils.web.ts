import { walkUpUntil, nLevelsDeep, xmlNsResolver } from './utils'
import { parseXml, serializeXml } from '../utils.web'

// ////////////////////////////////////////////////////////////////////////////////
// export function replaceRangeWithStr(range: Range, rangeStr: string) {
//   let holeStart = range.startContainer.previousSibling || range.startContainer.parentNode
//   let holeEnd = range.endContainer.nextSibling || range.endContainer.parentNode.nextSibling
//   //range.deleteContents()
//   range.setStartBefore(holeStart)
//   range.setEndAfter(holeEnd)
//   insertRangeStr(range, rangeStr)
// }

// ////////////////////////////////////////////////////////////////////////////////
// export function insertRangeStr(hole: Range, rangeStr: string) {
//   let rootClone = hole.startContainer.ownerDocument.documentElement.cloneNode(false)
//   let rootName = rootClone.nodeName
//   let rootStr = serializeXml(rootClone).slice(0, -2) + '>'

//   let fragment = parseXml(rootStr + rangeStr + `</${rootName}>`)  // contextual?

//   let destDepth = -1
//   walkUpUntil(new WebapiNode(hole.startContainer), x => {
//     ++destDepth
//     return x.parent === hole.commonAncestorContainer
//   })

//   let source = nLevelsDeep(fragment.documentElement.firstChild, destDepth)

//   mergeTrees(source, hole.startContainer, hole.endContainer)
// }


////////////////////////////////////////////////////////////////////////////////
function mergeTrees(source: Node, dest: Node, destEnd: Node) {
  //(<HTMLElement>dest).innerHTML = '<mi:w_><w lemma="loh">oooo</w></mi:w_>'
  //console.log('mergetrees')
}

////////////////////////////////////////////////////////////////////////////////
export function xpath(context: Node, query: string, type: number) {
  let doc = context.ownerDocument || <Document>context
  let res = doc.evaluate(query, context, xmlNsResolver, type, null)

  if (type === XPathResult.ORDERED_NODE_SNAPSHOT_TYPE
    || type === XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE) {
    let ret = []
    for (let i = 0; i < res.snapshotLength; ++i) {
      ret.push(res.snapshotItem(i))
    }

    return ret
  }

  if (type === XPathResult.NUMBER_TYPE) {
    return res.numberValue
  }

  if (type === XPathResult.FIRST_ORDERED_NODE_TYPE) {
    return res.singleNodeValue
  }

  return res
}
