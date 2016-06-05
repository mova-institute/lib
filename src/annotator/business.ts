import { encloseInRoot, encloseInRootNs } from '../xml/utils';
import { AbstractElement } from 'xmlapi';
import { NS } from '../xml/utils';
import { TextToken } from '../nlp/text_token';

export const MAX_CONCUR_ANNOT = 3;

////////////////////////////////////////////////////////////////////////////////
export function isSupervisor(roles) {
  return roles && Object.keys(roles).some(x => roles[x] === 'supervisor');
}

////////////////////////////////////////////////////////////////////////////////
export function canEditTask(task) {
  return task && task.isMine && task.status !== 'done';
}

////////////////////////////////////////////////////////////////////////////////
export function canDisownTask(task) {
  return canEditTask(task) && (task.step === 'annotate' || task.step === 'resolve');
}

////////////////////////////////////////////////////////////////////////////////
export function mergeXmlFragments(fragments: Array<string>) {
  fragments = fragments.map(x => encloseInRoot(x, 'mi:fragment'));
  return encloseInRootNs(fragments.join(''), 'mi:segment');
}

////////////////////////////////////////////////////////////////////////////////
export function nextTaskStep(type: string) {
  if (type === 'annotate') {
    return 'review';
  }

  throw new Error('Not implemented: nextTaskType');
}

////////////////////////////////////////////////////////////////////////////////
export function markResolveConflicts(hisName: string, his: AbstractElement, herName: string, her: AbstractElement) {
  const XPATH = `//mi:w_[@mark='reviewed']`;
  let hisWords = [...his.evaluateElements(XPATH, NS)];
  let herWords = [...her.evaluateElements(XPATH, NS)];

  if (hisWords.length !== herWords.length) {
    throw new Error('markResolveConflicts for docs with uneven word count is not implemented');
  }

  let numDiffs = 0;
  for (let [i, hisWordEl] of hisWords.entries()) {
    let hisWord = new TextToken(hisWordEl);
    let herWord = new TextToken(herWords[i]);

    if (hisWord.morphTag() !== herWord.morphTag() || hisWord.lemma() !== herWord.lemma()) {
      ++numDiffs;
      hisWord.markOnly('to-resolve');
      hisWord.setDisambedInterpAuthor(hisName);
      herWord.setDisambedInterpAuthor(herName);
      hisWord.resetDisamb();

      let herChoiseInHisInterps = hisWord.getInterpElem(herWord.morphTag(), herWord.lemma());
      if (!herChoiseInHisInterps) {
        herChoiseInHisInterps = <AbstractElement>herWord.getDisambedInterpElem().clone();
        hisWord.elem.appendChild(herChoiseInHisInterps);
      }
      // herChoiseInHisInterps.setAttribute('author', herName);
    }
  }

  return numDiffs;
}
