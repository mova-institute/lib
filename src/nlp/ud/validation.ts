import { Token } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'
import { mu } from '../../mu'
import { MorphInterp } from '../morph_interp'
// import { tokenStream2plaintextString, tokenStream2sentences } from '../utils'



const coreComplements = ['obj', 'xcomp', 'ccomp']
const сomplements = [...coreComplements, 'iobj']

const allowedRelations = [
  'acl',
  'advcl',
  'advmod',
  'amod',
  'appos',
  'aux:pass',
  'aux',
  'case',
  'cc',
  'ccomp',
  'compound',
  'conj',
  'cop',
  'csubj:pass',
  'csubj',
  'det:numgov',
  'det:nummod',
  'det',
  'discourse',
  'dislocated',
  'expl',
  'fixed',
  'flat:foreign',
  'flat:name',
  'flat',
  'goeswith',
  'iobj',
  // 'list',
  'mark',
  'nmod',
  'nsubj:pass',
  'nsubj',
  'nummod:gov',
  'nummod',
  'obj',
  'obl:agent',
  'obl',
  'orphan',
  'parataxis',
  'punct',
  'reparandum',
  'root',
  'vocative',
  'xcomp',
]

const rightHeadedRelations = [
  'case',
  'cc',
  'reparandum',
]

const leftHeadedRelations = [
  'appos',
  'conj',
  'dislocated',
  'fixed',
  'flat',
  'flat:foreign',
  'flat:name',
  // 'parataxis',
]

export interface Problem {
  message: string
  index: number
}

////////////////////////////////////////////////////////////////////////////////
export function validateSentence(sentence: Token[]) {
  let problems = new Array<Problem>()

  const reportIfNot = (message: string, fn: (x: Token, i?: number) => boolean) => {
    problems.push(...mu(sentence).findAllIndexes(fn).map(index => ({ message, index })))
  }

  leftHeadedRelations.forEach(rel => reportIfNot(`${rel} не може вказувати ліворуч`, (tok, i) => tok.relation === rel && tok.head > i))
  rightHeadedRelations.forEach(rel => reportIfNot(`${rel} не може вказувати праворуч`, (tok, i) => tok.relation === rel && tok.head < i))

  reportIfNot('до б(би) має йти aux',
    x => ['б', 'би'].includes(x.form.toLowerCase()) && !['fixed', 'aux'].includes(x.relation))

  if (sentence.every(x => x.relation !== 'obj')) {
    reportIfNot('не буває iobj без obj',
      x => x.relation === 'iobj')
  }

  reportIfNot('до пунктуації йде тільки punct',
    x => x.interp0().isPunctuation() && !['punct', 'goeswith', 'discourse', undefined].includes(x.relation))


  reportIfNot('не/ні підключається advmod’ом',
    x => ['не', 'ні'].includes(x.form.toLowerCase()) && !['advmod', undefined].includes(x.relation))

  reportIfNot('до DET не йде amod',
    x => toUd(x.interp0()).pos === 'DET' && x.relation === 'amod')

  reportIfNot('до сурядного сполучника на початку речення йде cc',
    (x, i) => i === 0 && x.interp0().isCoordinating() && !['cc'].includes(x.relation))

  // reportIfNot('речення може мати лише о',
  //     x => )
  // mu(sentence).count(x => x.relation === 'obj')
  /*

    reportIfNot('',
      x => )

  */

  // reportIfNot('неперехідне дієслово не може мати додатків',
  //   (x, i) => сomplements.includes(x.relation) && isIntransitiveVerb(sentence[x.head].interp0()))

  // let predicates = new Set<number>()
  // sentence.forEach((x, i) => {
  //   if (coreComplements.includes(x.relation)) {
  //     if (predicates.has(x.head)) {

  //     } else {
  //       predicates.add(x.head)
  //     }
  //   }
  // })



  return problems
}

//------------------------------------------------------------------------------
function isIntransitiveVerb(interp: MorphInterp) {
  return interp.isVerb() && interp.isReflexive()
}
