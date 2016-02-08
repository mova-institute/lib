import {markWordwiseDiffStr} from '../nlp/utils.node';
import {encloseInRootNs, removeRoot, removeXmlns} from '../xml/utils';
import {LibxmlElement} from '../xml/api/libxmljs_adapters';


////////////////////////////////////////////////////////////////////////////////
export function markConflicts(taskType: string, mine: string, theirs: string) {
  if (taskType === 'annotate') {
    let res: any = markWordwiseDiffStr(encloseInRootNs(mine), encloseInRootNs(theirs));
    res.marked = removeXmlns(removeRoot(res.marked.ownerDocument.serialize()));
    return res;
  }
  
  throw new Error('Not implemented: markConflicts');
}