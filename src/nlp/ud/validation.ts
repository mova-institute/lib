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
  // 'list',
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

const POS_ALLOWED_RELS = {
  // 'DET': [
  //   'det',
  //   'det:numgov',
  //   'det:nummod',
  //   'mark:iobj',
  //   'mark:nsubj',
  //   'mark:obj',
  //   'mark:obl',
  // ],
  // 'PUNCT': [
  //   'punct',
  //   'goeswith',
  //   'discourse',
  // ],
  'SCONJ': [
    'mark',
  ],
}

const NON_SCONJ_RELS = [
  'mark:iobj',
  'mark:nsubj',
  'mark:obj',
  'mark:obl',
]


const SIMPLE_RULES: [string, string, SentencePredicate2, string, SentencePredicate2][] = [
  [`case`, `з іменника`, t => t.interp.isNounish(), `в прийменник`, t => t.interp.isPreposition()],
  [`det`, `з іменника`, t => t.interp.isNounish(), `в DET`, t => toUd(t.interp).pos === 'DET'],
  [`amod`, `з іменника`, t => t.interp.isNounish(), `в прикметник`, t => t.interp.isAdjectivish()],
  [`nmod`, `з іменника`, t => t.interp.isNounish() || t.interp.isX(), `в іменник`, t => t.interp.isNounish()],
  [`nummod`, `з іменника`, t => t.interp.isNounish(), `в незайменниковий числівник`, t => t.interp.isCardinalNumeral() && !t.interp.isPronoun()],
  [`det:numgov`, `з іменника`, t => t.interp.isNounish(), `в займенниковий числівник`, t => t.interp.isCardinalNumeral() && t.interp.isPronoun()],
  [`punct`, `з не PUNCT`, t => t /*temp*/ && !t.interp.isPunctuation(), `в PUNCT`, t => t.interp.isPunctuation()],
  [`vocative`, `з присудка`, (t, s, i) => 1 || canBePredicate(t, s, i), `в кличний/називний іменник`, t => isNounishOrEllipticAdj(t) && (t.interp.isVocative() || t.interp.isNominative())],

  // [`nsubj`, `з присудка`, (t, s, i) => 1 || canBePredicate(t, s, i), `в іменникове`, t => isNounishOrEllipticAdj(t)],
  // [`obj`, `з присудка`, (t, s, i) => 1 || canBePredicate(t, s, i), `в іменникове`, t => isNounishOrEllipticAdj(t)],
  // [`obl`, `з присудка`, (t, s, i) => 1 || canBePredicate(t, s, i), `в іменник`, t => isNounishOrEllipticAdj(t)],
  // [`obl:agent`, `з присудка`, (t, s, i) => 1 || canBePredicate(t, s, i), `в іменник`, t => isNounishOrEllipticAdj(t)],

  // [`acl`, `з іменника`, t => isNounishOrEllipticAdj(t), `в присудок`, t => 1],



  // [`appos`, `з іменника`, t => t.interp.isNounish() || t.interp.isX(), `в іменник`, t => t.interp.isNounish()],
]

////////////////////////////////////////////////////////////////////////////////
export interface Problem {
  message: string
  index: number
}

type SentencePredicate = (x: Token, i?: number) => any
type SentencePredicate2 = (t: Token, s?: Token[], i?: number) => any
////////////////////////////////////////////////////////////////////////////////
export function validateSentenceSyntax(sentence: Token[]) {

  let problems = new Array<Problem>()

  const reportIf = (message: string, fn: SentencePredicate) => {
    problems.push(...mu(sentence).findAllIndexes(fn).map(index => ({ message, index })))
  }

  const hasDependantWhich = (i: number, fn: SentencePredicate) =>
    sentence.some((xx, ii) => xx.head === i && fn(xx, ii))


  for (let [rel, messageFrom, predicateFrom, messageTo, predicateTo] of SIMPLE_RULES) {
    reportIf(`${rel} не ${messageFrom}`, (t, i) => t.relation === rel && !predicateFrom(sentence[t.head], sentence, i))
    reportIf(`${rel} не ${messageTo}`, (t, i) => t.relation === rel && !predicateTo(t, sentence, i))
  }
  // return problems

  reportIf(`aux з недієслівного`,
    (x, i) => x.relation === 'aux'
      && !sentence[x.head].interp.isVerbial()
  )

  reportIf(`cop з дієприкметника`,
    (x, i) => x.relation === 'cop'
      && isActualParticiple(sentence[x.head], sentence, x.head)
  )

  reportIf('заборонена реляція',
    x => x.relation && !ALLOWED_RELATIONS.includes(x.relation))

  reportIf(`nsubj в неіменник, НЕ СТАВТЕ Ellipsis коли лінь ставити &noun!`,
    x => x.relation
      && !x.isEllipsis
      && x.relation.startsWith('nsubj')
      && !x.interp.isNounish()
  )

  Object.entries(POS_ALLOWED_RELS).forEach(([pos, rels]) =>
    reportIf(`не ${rels.join('/')} в ${pos}`,
      x => x.relation
        && !x.isEllipsis
        && toUd(x.interp).pos === pos
        && !rels.includes(x.relation)))

  LEFT_HEADED_RELATIONS.forEach(rel => reportIf(`${rel} ліворуч`, (tok, i) => tok.relation === rel && tok.head > i))
  RIGHT_HEADED_RELATIONS.forEach(rel => reportIf(`${rel} праворуч`, (tok, i) => tok.relation === rel && tok.head < i))

  // return []
  // if (mu(sentence).count(x => !x.relation) > 1) {
  //   reportIf(`речення недороблене`,
  //     x => x.relation === undefined)
  // }

  reportIf(`punct в двокрапку зліва`,
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

  reportIf('не discourse до частки',
    x => x.relation
      && !['б', 'би', 'не'].includes(x.form.toLowerCase())
      && x.interp.isParticle()
      && !['discourse', 'fixed'])

  reportIf('не aux у б(би)',
    x => ['б', 'би'].includes(x.form.toLowerCase())
      && x.interp.isParticle()
      && !['fixed', 'aux', undefined].includes(x.relation))

  if (sentence.every(x => x.relation !== 'obj')) {
    reportIf('iobj без obj',
      x => x.relation === 'iobj')
  }

  reportIf('не advmod в не/ні',
    x => x.interp.isParticle()
      && ['не', 'ні'/*, 'лише'*/].includes(x.form.toLowerCase())
      && !['advmod', undefined].includes(x.relation))

  reportIf('не cc в сурядий на початку речення',
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

  reportIf('obj/iobj має прийменник',
    (x, i) => ['obj', 'iobj'].includes(x.relation) && sentence.some(xx => xx.relation === 'case' && xx.head === i))

  reportIf('керівний числівник не nummod:gov',
    x => x.relation === 'nummod'
      && x.interp.isCardinalNumeral()
      && !x.interp.isPronoun()
      && (x.interp.isNominative() || x.interp.isAccusative() /*|| /^\d+$/.test(x.form)*/)
      && sentence[x.head].interp.isGenitive())

  reportIf(`:pass-реляція?`,
    x => !x.isEllipsis
      && ['aux', 'csubj', 'nsubj'].includes(x.relation)
      && sentence[x.head]
      && isPassive(sentence[x.head].interp))  // todo: навпаки

  reportIf(`:obl:agent?`,
    (x, i) => !x.isEllipsis
      && x.relation === 'obl'
      && x.interp.isInstrumental()
      && isPassive(sentence[x.head].interp)
      && !hasDependantWhich(i, xx => xx.relation === 'case'))

  LEAF_RELATIONS.forEach(leafrel => reportIf(`${leafrel} може вести тільки до листків`,
    (x, i) => x.relation === leafrel
      && sentence.some(xx => xx.head === i
        && (!x.interp.isAbbreviation() || !xx.interp.isPunctuation()))))

  // reportIf(`obl в неіменник`,
  //   x => OBLIQUES.includes(x.relation)
  //     && !x.isEllipsis
  //     && !x.interp.isNounish())

  reportIf(`obl з не дієслова/дієприслівника/прислівника/прикметника`,
    (x, i) => OBLIQUES.includes(x.relation)
      && !x.isEllipsis
      && !sentence.some(xx => xx.head === i && xx.relation === 'cop')
      && !sentence[x.head].interp.isVerbial()
      && !sentence[x.head].interp.isAdjective()
      && !sentence[x.head].interp.isAdverb())


  /*

    reportIf(``,
      (x,i) =>
    )

  */


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

//------------------------------------------------------------------------------
function canBePredicate(token: Token, sentence: Token[], index: number) {
  return token.interp.isVerb() || token.interp.isTransgressive() || sentence.some(t => t.head === index && t.relation === 'cop')
}

//------------------------------------------------------------------------------
function isNounishOrEllipticAdj(token: Token) {
  return token.interp.isNounish() || token.isEllipsis && token.interp.isAdjectivish()
}

//------------------------------------------------------------------------------
function isActualParticiple(token: Token, sentence: Token[], index: number) {
  return token.interp.isParticiple() && ['obl:agent', /*'advcl', 'obl', 'acl', 'advmod'*/].some(x => sentence.some(xx => xx.head === index && xx.relation === x))
}
