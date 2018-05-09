import { adoptMorphDisambs } from '../nlp/utils'
import { markWordwiseDiffStr } from '../nlp/utils.node'
import { encloseInRootNs, removeRoot, removeXmlns } from '../xml/utils'
import { parseXml } from '../xml/utils.node'
import { AbstractElement } from '../xml/xmlapi/abstract_element'
import { LibxmljsDocument } from '../xml/xmlapi-libxmljs/libxmljs_document'
import * as business from './business'



////////////////////////////////////////////////////////////////////////////////
export function markConflicts(taskType: string, mine: string, theirs: string) {
  if (taskType === 'annotate') {
    let res: any = markWordwiseDiffStr(encloseInRootNs(mine), encloseInRootNs(theirs))
    res.marked = removeXmlns(removeRoot(res.marked.document().serialize()))
    return res
  }

  throw new Error('Not implemented: markConflicts')
}

////////////////////////////////////////////////////////////////////////////////
export function markResolveConflicts(hisName: string, hisStr: string, herName: string, herStr: string) {
  let his = parseXml(encloseInRootNs(hisStr))
  let her = parseXml(encloseInRootNs(herStr))

  let numDiffs = business.markResolveConflicts(hisName, his, herName, her)
  return {
    numDiffs,
    markedStr: removeXmlns(removeRoot(his.document().serialize())),
    markedDoc: his.document(),
  }
}

////////////////////////////////////////////////////////////////////////////////
export function adoptMorphDisambsStr(destRoot: AbstractElement, sourceRootStr: string) {
  let sourceRoot = parseXml(encloseInRootNs(sourceRootStr))
  return adoptMorphDisambs(destRoot, sourceRoot)
}
