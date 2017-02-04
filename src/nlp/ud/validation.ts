import { Token } from '../token'
import { toUd } from './tagset'
import { mu } from '../../mu'
import { MorphInterp } from '../morph_interp'



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
  'compound:svc',
  'compound',
  'conj:parataxis',
  'conj:repeat',
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
  'list',
  'mark:iobj',
  'mark:nsubj',
  'mark:obj',
  'mark:obl',
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

const CORE_COMPLEMENTS = [
  'obj',
  // 'xcomp',
  'ccomp',
  'mark:obj',
]

const COMPLEMENTS = [
  ...CORE_COMPLEMENTS,
  'iobj',
]

const OBLIQUES = [
  'obl',
  'mark:obl',
]

const SUBJECTS = [
  'nsubj',
  'nsubj:pass',
  'csubj',
  'csubj:pass',
  'mark:subj',
]

const NOMINAL_HEAD_MODIFIERS = [
  'nmod',
  'appos',
  'amod',
  'nummod',
  'nummod_gov',
  'acl',
  'det',
  'case',
  'punct',
  'conj',
  'cc',
  'advmod',
  'discourse',
]

const CONTINUOUS_REL = [
  'flat',
  'fixed',
  'compound',
]

const LEAF_RELATIONS = [
  'cop',
  'expl',
  'fixed',
  'flat:foreign',
  'flat:name',
  'flat',
  'goeswith',
  'punct',
]

const RIGHT_HEADED_RELATIONS = [
  'case',
  'cc',
  'reparandum',
]

const LEFT_HEADED_RELATIONS = [
  'appos',
  'conj',
  'dislocated',
  'fixed',
  'flat',
  'flat:foreign',
  'flat:name',
  // 'parataxis',
]

const CONTINUOUS_SUBREES = [
  'advcl',
  'acl',
  'ccomp',
  'csubj',
]

const DET_RELATIONS = [
  'det',
  'det:numgov',
  'det:nummod',
  'mark:iobj',
  'mark:nsubj',
  'mark:obj',
  'mark:obl',
]

const NON_SCONJ_RELS = [
  'mark:iobj',
  'mark:nsubj',
  'mark:obj',
  'mark:obl',
]


////////////////////////////////////////////////////////////////////////////////
export interface Problem {
  message: string
  index: number
}

type SentencePredicate = (x: Token, i?: number) => any
////////////////////////////////////////////////////////////////////////////////
export function validateSentence(sentence: Token[]) {

  let problems = new Array<Problem>()

  const reportIf = (message: string, fn: SentencePredicate) => {
    problems.push(...mu(sentence).findAllIndexes(fn).map(index => ({ message, index })))
  }

  const hasDependantWhich = (i: number, fn: SentencePredicate) =>
    sentence.some((xx, ii) => xx.head === i && fn(xx, ii))


  const childrenMap = sentence.map((x, i) => mu(sentence).findAllIndexes(xx => xx.head === i).toArray())


  reportIf(`до сполучника йде mark:*`,
    (x, i) => x.relation
      && x.interp.isSubordinative()
      // && NON_SCONJ_RELS.includes(x.relation)
      && x.relation.startsWith('mark:')
  )
  // return problems

  reportIf(`в двокрапку йде punct зліва`,
    (x, i) => x.form === ':'
      && x.interp.isPunctuation()
      && x.head < i)

  reportIf(`у залежника ccomp немає підмета`,
    (x, i) => x.relation === 'ccomp'
      && !x.isEllipsis
      && !sentence.some(xx => SUBJECTS.includes(xx.relation) && xx.head === i))

  reportIf(`у залежника xcomp є підмет`,
    (x, i) => x.relation === 'xcomp'
      && sentence.some(xx => SUBJECTS.includes(xx.relation) && xx.head === i))


  reportIf('до часток йде не discourse',
    x => x.relation
      && !['б', 'би', 'не'].includes(x.form.toLowerCase())
      && x.interp.isParticle()
      && !['discourse', 'fixed'])

  // if (mu(sentence).count(x => !x.relation) > 1) {
  //   reportIfNot(`речення недороблене: в більше ніж одне слово не входить реляція`,
  //     x => x.relation === undefined)
  // }

  reportIf('вжито заборонену реляцію',
    x => x.relation && !ALLOWED_RELATIONS.includes(x.relation))

  LEFT_HEADED_RELATIONS.forEach(rel => reportIf(`${rel} вказує ліворуч`, (tok, i) => tok.relation === rel && tok.head > i))
  RIGHT_HEADED_RELATIONS.forEach(rel => reportIf(`${rel} вказувати праворуч`, (tok, i) => tok.relation === rel && tok.head < i))

  reportIf('до б(би) йде не aux',
    x => ['б', 'би'].includes(x.form.toLowerCase())
      && x.interp.isParticle()
      && !['fixed', 'aux', undefined].includes(x.relation))

  if (sentence.every(x => x.relation !== 'obj')) {
    reportIf('iobj без obj',
      x => x.relation === 'iobj')
  }

  reportIf('до пунктуації йде не punct',
    x => x.interp.isPunctuation()
      && !['punct', 'goeswith', 'discourse', undefined].includes(x.relation))

  reportIf('не/ні підключені не advmod’ом',
    x => x.interp.isParticle()
      && ['не', 'ні'/*, 'лише'*/].includes(x.form.toLowerCase())
      && !['advmod', undefined].includes(x.relation))

  // reportIfNot('до DET не йде amod',
  //   x => toUd(x.interp).pos === 'DET' && x.relation === 'amod')

  reportIf(`до DET йде не ${DET_RELATIONS.join('/')}`,
    x => toUd(x.interp).pos === 'DET' && !DET_RELATIONS.includes(x.relation))

  reportIf('до сурядного сполучника на початку речення йде не cc',
    (x, i) => i === 0 && x.interp.isCoordinating() && !['cc'].includes(x.relation))

  var predicates = new Set<number>()
  sentence.forEach((x, i) => {
    if (CORE_COMPLEMENTS.includes(x.relation)) {
      if (predicates.has(x.head)) {
        problems.push({ index: x.head, message: `у присудка більше ніж один прямий додаток (${CORE_COMPLEMENTS.join('/')})` })
      } else {
        predicates.add(x.head)
      }
    }
  })

  let predicates2 = new Set<number>()
  sentence.forEach((x, i) => {
    if (SUBJECTS.includes(x.relation)) {
      if (predicates2.has(x.head)) {
        problems.push({ index: x.head, message: `у присудка більше ніж один підмет (${SUBJECTS.join('/')})` })
      } else {
        predicates2.add(x.head)
      }
    }
  })

  reportIf('obj/iobj має прийменника',
    (x, i) => ['obj', 'iobj'].includes(x.relation) && sentence.some(xx => xx.relation === 'case' && xx.head === i))

  reportIf('vocative йде тільки не до іменника в кличному (називному)',
    x => x.relation === 'vocative' && (!x.interp.isNominative() && !x.interp.isVocative() || !x.interp.isNounish()))

  reportIf('керівний числівник позначено не nummod:gov',
    x => x.relation === 'nummod'
      && x.interp.isCardinalNumeral()
      && !x.interp.isPronoun()
      && (x.interp.isNominative() || x.interp.isAccusative() /*|| /^\d+$/.test(x.form)*/)
      && sentence[x.head].interp.isGenitive())

  reportIf(`потенційна :pass-реляція?`,
    x => !x.isEllipsis
      && ['aux', 'csubj', 'nsubj'].includes(x.relation)
      && sentence[x.head]
      && isPassive(sentence[x.head].interp))  // todo: навпаки

  reportIf(`потенційний :obl:agent?`,
    (x, i) => !x.isEllipsis
      && x.relation === 'obl'
      && x.interp.isInstrumental()
      && isPassive(sentence[x.head].interp)
      && !hasDependantWhich(i, xx => xx.relation === 'case'))

  LEAF_RELATIONS.forEach(leafrel => reportIf(`${leafrel} може вести тільки до листків`,
    (x, i) => x.relation === leafrel
      && sentence.some(xx => xx.head === i
        && (!x.interp.isAbbreviation() || !xx.interp.isPunctuation()))))

  reportIf(`obl може йде до неіменника`,
    x => OBLIQUES.includes(x.relation)
      && !x.isEllipsis
      && !x.interp.isNounish())

  reportIf(`obl може йде не від дієслова/дієприслівника/прислівника/прикметника`,
    (x, i) => OBLIQUES.includes(x.relation)
      && !x.isEllipsis
      && !sentence.some(xx => xx.head === i && xx.relation === 'cop')
      && !sentence[x.head].interp.isVerbial()
      && !sentence[x.head].interp.isAdjective()
      && !sentence[x.head].interp.isAdverb())


  /*

    reportIfNot(``,
      x => )

  */



  //////// trash

  // reportIfNot(`іменники можуть модифікуватися тільки ${NOMINAL_HEAD_MODIFIERS.join(', ')}`,
  //   (x, i) => x.interp.isNounish() && sentence.some(xx => xx.head === i && !NOMINAL_HEAD_MODIFIERS.includes(xx.relation)))

  // reportIfNot(`dfdfdfd`,
  //   (x, i) => CONTINUOUS_SUBREES.includes(x.relation) && !isConinuous(getSubtree(i, childrenMap)))

  // reportIfNot('nominal head can be modified by nmod, appos, amod, nummod, acl, det, case only',
  //   (x, i) => !x.isEllipsis
  //     && !sentence.some(xx => xx.head === i && xx.relation === 'cop')
  //     && x.interp.isNounish()
  //     && sentence.some(xx => xx.head === i && !NOMINAL_HEAD_MODIFIERS.includes(xx.relation)))

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

//------------------------------------------------------------------------------
function getSubtree(i: number, childrenMap: number[][]) {
  let ret = [i, ...childrenMap[i]]
  childrenMap[i].forEach(x => ret.push(...getSubtree(x, childrenMap)))
  return [...new Set(ret)].sort()
}

//------------------------------------------------------------------------------
function isConinuous(array: Array<number>) {
  for (let i = 1; i < array.length; ++i) {
    if (array[i] - array[i - 1] !== 1) {
      return false
    }
  }
  return true
}
