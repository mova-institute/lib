import {encloseInRoot, encloseInRootNs, removeXmlns} from '../xml/utils';
import {IElement} from '../xml/api/interfaces';
import {NS} from '../xml/utils';
import {TextToken} from '../nlp/text_token';

export const MAX_CONCUR_ANNOT = 3;

////////////////////////////////////////////////////////////////////////////////
export function mergeXmlFragments(fragments: Array<string>) {
  fragments = fragments.map(x => encloseInRoot(x, 'mi:fragment'));
  return encloseInRootNs(fragments.join(''), 'mi:segment');
}

////////////////////////////////////////////////////////////////////////////////
export function nextTaskType(type: string) {
  if (type === 'annotate') {
    return 'review';
  }
  
  throw new Error('Not implemented: nextTaskType');
}

////////////////////////////////////////////////////////////////////////////////
export function markResolveConflicts(hisName: string, his: IElement, herName: string, her: IElement) {
  const XPATH = `//mi:w_[@mark and contains(@mark, 'reviewed')]`;
  let hisWords = <IElement[]>his.xpath(XPATH, NS);
  let herWords = <IElement[]>her.xpath(XPATH, NS);
  
  if (hisWords.length !== herWords.length) {
    throw new Error('markResolveConflicts for docs with uneven word count is not implemented');
  }
  
  let numDiffs = 0;
  for (let [i, hisWordEl] of hisWords.entries()) {
    let hisWord = new TextToken(hisWordEl);
    let herWord = new TextToken(herWords[i]);
    
    if (hisWord.morphTag() !== herWord.morphTag() || hisWord.lemma() !== herWord.lemma()) {
      ++numDiffs;
      hisWord.elem.setAttribute('mark', 'diff');
      hisWord.setDisambedInterpAuthor(hisName);
      herWord.setDisambedInterpAuthor(herName);
      
      let herChoiseInHisInterps = hisWord.getInterpElem(herWord.morphTag(), herWord.lemma());
      if (!herChoiseInHisInterps) {
        herChoiseInHisInterps = <IElement>herWord.getDisambedInterpElem().clone();
        hisWord.elem.appendChild(herChoiseInHisInterps);
      }
      // herChoiseInHisInterps.setAttribute('author', herName);
    }
  }
  
  return numDiffs;
}