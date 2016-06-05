import { markWordwiseDiff, normalizeCorpusText } from './utils';
import { string2lxmlRoot } from '../utils.node';
import { LibxmljsElement } from 'xmlapi-libxmljs';
import { AllHtmlEntities } from 'html-entities';


////////////////////////////////////////////////////////////////////////////////
export function markWordwiseDiffStr(mineStr: string, theirsStr: string) {
  let mine = string2lxmlRoot(mineStr);
  return {
    marked: mine,
    numDiffs: markWordwiseDiff(mine, string2lxmlRoot(theirsStr)),
  };
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeCorpusTextNode(xmlstr: string) {
  xmlstr = normalizeEntities(xmlstr)
    .replace(/(\s*)\n\s*\n(\s*)/g, '$1\n$2');
  let root = string2lxmlRoot(xmlstr);

  return normalizeCorpusText(root);
}

const entities = new AllHtmlEntities();
const mustEscapeInText = new Set(['lt', 'amp']);


////////////////////////////////////////////////////////////////////////////////
export function normalizeEntities(text: string) {  // todo: wait for libxmljs issues resolved
  text = text.replace(/&(\w+);/g, (match, p1) => {
    if (mustEscapeInText.has(p1)) {
      return match;
    }
    let decoded = entities.decode(match);
    if (/^\s$/.test(decoded)) {  // todo: wait for unicode
      return match;
    }
    return decoded;
  });

  return text;
}
