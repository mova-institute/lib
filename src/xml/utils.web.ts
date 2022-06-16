import { xmlNsResolver } from './utils'



export function xpath(context: Node, query: string, type: number) {
  let doc = context.ownerDocument || context as Document
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
