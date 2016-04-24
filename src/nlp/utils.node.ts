import {markWordwiseDiff, normalizeCorpusText} from './utils';
import {string2lxmlRoot} from '../utils.node';
import {LibxmlElement} from '../xml/api/libxmljs_implementation';
import {normalizeEntities} from '../xml/utils';


////////////////////////////////////////////////////////////////////////////////
export function markWordwiseDiffStr(mineStr: string, theirsStr: string) {
  let mine = string2lxmlRoot(mineStr);
  return {
    marked: mine,
    numDiffs: markWordwiseDiff(mine, string2lxmlRoot(theirsStr)),
  };
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeCorpusText(xmlstr: string) {
  xmlstr = normalizeEntities(xmlstr)
    .replace(/(\s*)\n\s*\n(\s*)/g, '$1\n$2');
  let root = string2lxmlRoot(xmlstr);

  return normalizeCorpusText(root);
}
