import { markWordwiseDiffStr } from '../nlp/utils.node';
import { encloseInRootNs, removeRoot, removeXmlns } from '../xml/utils';
import { LibxmlDocument } from '../xml/api/libxmljs_implementation';
import { string2lxmlRoot } from '../utils.node';
import * as business from './business';

////////////////////////////////////////////////////////////////////////////////
export function markConflicts(taskType: string, mine: string, theirs: string) {
  if (taskType === 'annotate') {
    let res: any = markWordwiseDiffStr(encloseInRootNs(mine), encloseInRootNs(theirs));
    res.marked = removeXmlns(removeRoot(res.marked.ownerDocument.serialize()));
    return res;
  }

  throw new Error('Not implemented: markConflicts');
}

////////////////////////////////////////////////////////////////////////////////
export function markResolveConflicts(hisName: string, hisStr: string, herName: string, herStr: string) {
  let his = string2lxmlRoot(encloseInRootNs(hisStr));
  let her = string2lxmlRoot(encloseInRootNs(herStr));

  let numDiffs = business.markResolveConflicts(hisName, his, herName, her);
  return {
    numDiffs,
    markedStr: removeXmlns(removeRoot(his.document.serialize())),
    markedDoc: his.document,
  };
}
