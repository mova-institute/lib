import { Token } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'
import { mu } from '../../mu'
import { MorphInterp } from '../morph_interp'
// import { tokenStream2plaintextString, tokenStream2sentences } from '../utils'



const CORE_COMPLEMENTS = ['obj', 'xcomp', 'ccomp']
const COMPLEMENTS = [...CORE_COMPLEMENTS, 'iobj']
const SUBJECTS = ['nsubj', 'nsubj:pass', 'csubj', 'csubj:pass']
const NOMINAL_HEAD_MODIFIERS = ['nmod', 'appos', 'amod', 'nummod', 'acl', 'det', 'case']
const CONTINUOUS_REL = ['flat', 'fixed', 'compound', 'goeswith']

const ALLOWED_RELATIONS = [
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

  const reportIfNot = (message: string, fn: (x: Token, i?: number) => any) => {
    problems.push(...mu(sentence).findAllIndexes(fn).map(index => ({ message, index })))
  }

  const hasDependantWhich = (i: number, fn: (x: Token, i?: number) => any) =>
    sentence.some((xx, ii) => xx.head === i && fn(xx, ii))

  reportIfNot('тільки дозволені реляції можливі',
    x => x.relation && !ALLOWED_RELATIONS.includes(x.relation))

  leftHeadedRelations.forEach(rel => reportIfNot(`${rel} не може вказувати ліворуч`, (tok, i) => tok.relation === rel && tok.head > i))
  rightHeadedRelations.forEach(rel => reportIfNot(`${rel} не може вказувати праворуч`, (tok, i) => tok.relation === rel && tok.head < i))

  reportIfNot('до б(би) має йти aux',
    x => ['б', 'би'].includes(x.form.toLowerCase()) && x.interp.isParticle() && !['fixed', 'aux'].includes(x.relation))

  if (sentence.every(x => x.relation !== 'obj')) {
    reportIfNot('не буває iobj без obj',
      x => x.relation === 'iobj')
  }

  reportIfNot('до пунктуації йде тільки punct',
    x => x.interp.isPunctuation() && !['punct', 'goeswith', 'discourse', undefined].includes(x.relation))

  reportIfNot('не/ні підключаються advmod’ом',
    x => x.interp.isParticle() && ['не', 'ні'/*, 'лише'*/].includes(x.form.toLowerCase()) && !['advmod', undefined].includes(x.relation))

  reportIfNot('до DET не йде amod',
    x => toUd(x.interp).pos === 'DET' && x.relation === 'amod')

  reportIfNot('до сурядного сполучника на початку речення йде cc',
    (x, i) => i === 0 && x.interp.isCoordinating() && !['cc'].includes(x.relation))

  reportIfNot('неперехідне дієслово не може мати додатків',
    (x, i) => COMPLEMENTS.includes(x.relation) && isIntransitiveVerb(sentence[x.head].interp))

  var predicates = new Set<number>()
  sentence.forEach((x, i) => {
    if (CORE_COMPLEMENTS.includes(x.relation)) {
      if (predicates.has(x.head)) {
        problems.push({ index: x.head, message: `(??) у присудка може бути тільки один прямий додаток (${CORE_COMPLEMENTS.join('/')})` })
      } else {
        predicates.add(x.head)
      }
    }
  })

  let predicates2 = new Set<number>()
  sentence.forEach((x, i) => {
    if (SUBJECTS.includes(x.relation)) {
      if (predicates2.has(x.head)) {
        problems.push({ index: x.head, message: `у присудка може бути тільки один підмет (${SUBJECTS.join('/')})` })
      } else {
        predicates2.add(x.head)
      }
    }
  })

  reportIfNot('obj та iobj не можуть мати прийменників',
    (x, i) => ['obj', 'iobj'].includes(x.relation) && sentence.some(xx => xx.relation === 'case' && xx.head === i))

  reportIfNot('',
    x => x.relation === 'vocative' && !x.interp.isNominative() && !x.interp.isVocative())

  reportIfNot('керівні числівники позначаються nummod:gov',
    x => x.relation === 'nummod' && x.interp.isCardinalNumeral() && !x.interp.isPronoun()
      && (x.interp.isNominative() || x.interp.isAccusative() /*|| /^\d+$/.test(x.form)*/)
      && sentence[x.head].interp.isGenitive())

  reportIfNot(`можливо тут :pass-реляція?`,
    x => ['aux', 'csubj', 'nsubj'].includes(x.relation) && isPassive(sentence[x.head].interp))  // todo: навпаки

  reportIfNot(`можливо тут :obl:agent?`,
    (x, i) => x.relation === 'obl' && x.interp.isInstrumental() && isPassive(sentence[x.head].interp) && !hasDependantWhich(i, xx => xx.relation === 'case'))










  /*

    reportIfNot(``,
      x => )

  */

  //////// trash
  // reportIfNot(`іменники можуть модифікуватися тільки ${NOMINAL_HEAD_MODIFIERS.join(', ')}`,
  //   (x, i) => x.interp.isNounish() && sentence.some(xx => xx.head === i && !NOMINAL_HEAD_MODIFIERS.includes(xx.relation)))


  return problems
}

//------------------------------------------------------------------------------
function isPassive(interp: MorphInterp) {
  return interp.isImpersonal() || interp.isPassive()
}

//------------------------------------------------------------------------------
function isIntransitiveVerb(interp: MorphInterp) {
  return interp.isVerb() && interp.isReflexiveVerb()
}
