import { encloseInRoot, encloseInRootNs } from '../xml/utils'
import { AbstractElement } from '../xml/xmlapi/abstract_element'
import { NS } from '../xml/utils'
import { $t, TextToken } from '../nlp/text_token'

export const MAX_CONCUR_ANNOT = 3

export function isSupervisor(roles) {
  return roles && Object.keys(roles).some((x) => roles[x] === 'supervisor')
}

export function canEditTask(task) {
  return task && task.isMine && task.status !== 'done'
}

export function canDisownTask(task) {
  return (
    canEditTask(task) && (task.step === 'annotate' || task.step === 'resolve')
  )
}

export function mergeXmlFragments(fragments: Array<string>) {
  fragments = fragments.map((x) => encloseInRoot(x, 'mi:fragment'))
  return encloseInRootNs(fragments.join(''), 'mi:segment')
}

export function nextTaskStep(type: string) {
  if (type === 'annotate') {
    return 'review'
  }

  throw new Error('Not implemented: nextTaskType')
}

export function markResolveConflicts(
  hisName: string,
  his: AbstractElement,
  herName: string,
  her: AbstractElement,
) {
  const XPATH = `//mi:w_[@mark='reviewed']`
  let hisWords = his.evaluateElements(XPATH, NS).toArray()
  let herWords = her.evaluateElements(XPATH, NS).toArray()

  if (hisWords.length !== herWords.length) {
    throw new Error(
      'markResolveConflicts for docs with uneven word count is not implemented',
    )
  }

  let numDiffs = 0
  for (let [i, hisWordEl] of hisWords.entries()) {
    let hisWord = $t(hisWordEl)
    let herWord = $t(herWords[i])
    let herInterps = herWord.getDisambedInterps()

    if (!hisWord.isEquallyInterpreted(herWord)) {
      ++numDiffs
      hisWord.setMark('to-resolve')
      hisWord.setDisambedInterpsAuthor(hisName)
      hisWord.clearDisamb()
      herInterps.forEach((x) => {
        hisWord.assureHasInterp(x.flags, x.lemma)
        hisWord.addInterpAuthor(x.flags, x.lemma, herName)
      })
    }
  }

  return numDiffs
}
