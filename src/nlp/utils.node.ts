import {markWordwiseDiff} from './utils';
import {string2lxmlRoot} from '../utils.node';
import {LibxmlElement} from '../xml/api/libxmljs_adapters';


////////////////////////////////////////////////////////////////////////////////
export function markWordwiseDiffStr(mineStr: string, theirsStr: string) {
  let mine = string2lxmlRoot(mineStr);
  return {
    highlighted: mine,
    numDiffs: markWordwiseDiff(mine, string2lxmlRoot(theirsStr)),
  }
}