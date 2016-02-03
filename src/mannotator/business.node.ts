import {markWordwiseDiffStr} from '../nlp/utils.node';
import {encloseInRootNs} from '../xml/utils';
import {LibxmlElement} from '../xml/api/libxmljs_adapters';


////////////////////////////////////////////////////////////////////////////////
export function highlightConflicts(taskType: string, mine: string, theirs: string) {
  if (taskType === 'annotate') {
    return markWordwiseDiffStr(encloseInRootNs(mine), encloseInRootNs(theirs));
  }
  
  throw new Error('Not implemented');
}