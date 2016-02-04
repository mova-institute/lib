import {markWordwiseDiffStr} from '../nlp/utils.node';
import {encloseInRootNs, removeRoot, removeXmlns} from '../xml/utils';
import {LibxmlElement} from '../xml/api/libxmljs_adapters';


////////////////////////////////////////////////////////////////////////////////
export function highlightConflicts(taskType: string, mine: string, theirs: string) {
  if (taskType === 'annotate') {
    let res: any = markWordwiseDiffStr(encloseInRootNs(mine), encloseInRootNs(theirs));
    res.highlighted = removeXmlns(removeRoot(res.highlighted.ownerDocument.serialize()))
    return res;
  }
  
  throw new Error('Not implemented');
}