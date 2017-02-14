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

export const CORE_COMPLEMENTS = [
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
  'obl:agent',
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

const TERMINAL_RELATIONS = [
  'cop',
  'expl',
  'fixed',
  'flat:foreign',
  'flat:name',
  'flat',
  'goeswith',
  'punct',
]

const LEFT_RELATIONS = [
  'case',
  'cc',
  'reparandum',
]

const RIGHT_RELATIONS = [
  'appos',
  'conj',
  'dislocated',
  'fixed',
  'flat',
  'flat:foreign',
  'flat:name',
  'list',
  // 'parataxis',
]

const CONTINUOUS_SUBTREES = [
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
  // 'SCONJ': [
  //   'mark',
  // ],
  // 'NUM': [
  //   'nummod',
  //   'nummod:gov',
  //   'compound',
  //   'flat',
  //   'appos',
  //   'conj',
  // ],
}

const NON_SCONJ_RELS = [
  'mark:iobj',
  'mark:nsubj',
  'mark:obj',
  'mark:obl',
]

const DISCOURSE_DESTANATIONS = [
  'PART',
  'SYM',
  'INTJ',
]

const TOBE_LEMMAS = [
  'бути',
  'бувши',
  'будучи',
]

const TOBE_AND_BY_LEMMAS = [
  ...TOBE_LEMMAS,
  'б',
  'би',
]

const ADVMOD_NONADVERBIAL_LEMMAS = [
  'не',
  'ні',
  'ані',
]

const CLAUSAL_MODIFIERS = [
  'acl',
  'advcl',
  'csubj',
  'csubj:pass',
  'ccomp',
  'xcomp',
]

const EXPL_FORMS = [
  'собі',
  'воно',
]

const CC_HEAD_RELS = [
  'conj',
  'parataxis',
  'conj:parataxis',
]

const NON_CHAINABLE_RELS = [
  'aux',
  'fixed',
]

const NEVER_CONJUNCT_POS = [
  'CCONJ',
  'PART',
  'PUNCT',
  'SCONJ',
  'AUX',
]

/*

ADJ
ADP
'ADV'
'CCONJ'
'PART'
'PUNCT'
'SCONJ'
AUX
DET
INTJ
NOUN
NUM
PRON
PROPN
SYM
VERB
X

*/


const SIMPLE_RULES: [string, string, SentencePredicate2, string, SentencePredicate2][] = [
  [`case`, `з іменника`,
    t => isNounishOrEllipticAdj(t) || t.interp.isAdjective() && t.interp.isPronoun() || t.isPromoted && t.interp.isCardinalNumeral(),
    `в прийменник`,
    t => t.interp.isPreposition()],
  [`det`, `з іменника`, (t, s, i) => isNounishOrEllipticAdj(t) || s.some(tt => tt.rel === 'acl' || tt.head === i) || t.tags.includes('adjdet'), `в DET`, t => toUd(t.interp).pos === 'DET'],
  [`amod`, `з іменника`, t => isNounishOrEllipticAdj(t), `в прикметник`, t => t.interp.isAdjectivish()],
  [`nmod`, `з іменника`, t => isNounishOrEllipticAdj(t), `в іменник`, t => isNounishOrEllipticAdj(t)],
  [`nummod`, `з іменника`, t => isNounishOrEllipticAdj(t), `в незайменниковий числівник`, t => t.interp.isCardinalNumeral() && !t.interp.isPronoun()],
  [`det:numgov`, `з іменника`, t => isNounishOrEllipticAdj(t), `в займенниковий числівник`, t => t.interp.isCardinalNumeral() && t.interp.isPronoun()],
  [`punct`, `з не PUNCT`, t => !t /*temp*/ || !t.interp.isPunctuation() || t.tags.includes('nestedpunct'), `в PUNCT`, t => t.interp.isPunctuation()],
  [`discourse`, undefined, undefined, `в ${DISCOURSE_DESTANATIONS.join('|')} чи fixed`, (t, s, i) => DISCOURSE_DESTANATIONS.includes(toUd(t.interp).pos) || s[i + 1] && s[i + 1].rel === 'fixed'],
  [`aux`, `з дієслівного`, t => t.interp.isVerbial(), `в бути|би|б`, t => TOBE_AND_BY_LEMMAS.includes(t.interp.lemma)],
  [`cop`, `з недієслівного`, (t, s, i) => !t.interp.isVerb() && !t.interp.isTransgressive() && !isActualParticiple(t, s, i), `в бути`, t => TOBE_LEMMAS.includes(t.interp.lemma)],
  [`nsubj`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменникове`, t => isNounishOrEllipticAdj(t)],
  [`obj`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменникове`, t => isNounishOrEllipticAdj(t)],
  [`iobj`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменникове`, t => isNounishOrEllipticAdj(t)],
  [`obl`, `з присудка`, (t, s, i) => canBePredicate(t, s, i) || t.interp.isAdjective(), `в іменник`, t => isNounishOrEllipticAdj(t)],
  [`obl:agent`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменник`, t => isNounishOrEllipticAdj(t)],
  [`vocative`,
    `з присудка`,
    (t, s, i) => canBePredicate(t, s, i),
    `в кличний/називний іменник`,
    t => t.interp.isForeign() || isNounishOrEllipticAdj(t) && (t.interp.isVocative() || t.interp.isNominative())],
  [`advmod`, ``, t => 0, `в прислівник`, t => t.interp.isAdverb() || t.interp.isParticle() && ADVMOD_NONADVERBIAL_LEMMAS.includes(t.interp.lemma)],
  [`expl`, ``, t => 0, `в ${EXPL_FORMS.join('|')}`, t => EXPL_FORMS.includes(t.form)],
  [`mark`, ``, t => t, `в SCONJ|ADV`, t => toUd(t.interp).pos === 'SCONJ' || t.interp.isAdverb()],
  [`flat:name`, `з іменника`, t => t.interp.isNounish(), ``, t => t],
  [`csubj`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`ccomp`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`xcomp`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`advcl`, ``, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],

  [`cc`, ``, (t, s, i) => t, `в сурядний`, t => t.interp.isCoordinating()],  // окремо
  [`acl`, `з іменника`, t => isNounishOrEllipticAdj(t), ``, t => t],

  [`appos`, `з іменника`, t => isNounishOrEllipticAdj(t), `в іменник`, t => isNounishOrEllipticAdj(t)],

]

////////////////////////////////////////////////////////////////////////////////
export interface Problem {
  message: string
  indexes: number[]
}

type SentencePredicate = (x: Token, i?: number) => any
type SentencePredicate2 = (t: Token, s?: Token[], i?: number) => any
////////////////////////////////////////////////////////////////////////////////
export function validateSentenceSyntax(sentence: Token[]) {

  let problems = new Array<Problem>()

  const reportIf = (message: string, fn: SentencePredicate) => {
    problems.push(...mu(sentence).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
  }

  const xreportIf = (...args: any[]) => undefined

  const hasDependantWhich = (i: number, fn: SentencePredicate) =>
    sentence.some((xx, ii) => xx.head === i && fn(xx, ii))


  // ~~~~~~~ rules ~~~~~~~~

  for (let [rel, messageFrom, predicateFrom, messageTo, predicateTo] of SIMPLE_RULES) {
    if (messageFrom && predicateFrom) {
      reportIf(`${rel} не ${messageFrom}`, (t, i) => t.rel === rel && !predicateFrom(sentence[t.head], sentence, t.head))
    }
    if (messageTo && predicateTo) {
      reportIf(`${rel} не ${messageTo}`, (t, i) => t.rel === rel && !predicateTo(t, sentence, i))
    }
  }
  // return problems

  reportIf(`токен позначено #error`, (x, i) => x.tags.includes('error'))

  reportIf('більше однієї стрілки в слово',
    tok => tok.deps.length > 1 && mu(tok.deps).count(x => x.relation !== 'punct'))

  RIGHT_RELATIONS.forEach(rel => reportIf(`${rel} ліворуч`, (tok, i) => tok.rel === rel && tok.head > i))
  LEFT_RELATIONS.forEach(rel => reportIf(`${rel} праворуч`, (tok, i) => tok.rel === rel && tok.head < i))

  reportIf('заборонена реляція',
    x => x.rel && !ALLOWED_RELATIONS.includes(x.rel))

  // Object.entries(POS_ALLOWED_RELS).forEach(([pos, rels]) =>
  //   reportIf(`не ${rels.join('|')} в ${pos}`,
  //     x => x.rel
  //       && !x.isPromoted
  //       && toUd(x.interp).pos === pos
  //       && !rels.includes(x.rel)))


  reportIf(`punct в двокрапку зліва`,
    (x, i) => x.form === ':'
      && x.interp.isPunctuation()
      && x.head < i)

  xreportIf(`у залежника ccomp немає підмета`,
    (x, i) => x.relation === 'ccomp'
      && !x.isPromoted
      && !sentence.some(xx => SUBJECTS.includes(xx.rel) && xx.head === i))

  reportIf(`у залежника xcomp є підмет`,
    (x, i) => x.rel === 'xcomp'
      && sentence.some(xx => SUBJECTS.includes(xx.rel) && xx.head === i))

  reportIf('не discourse до частки',
    x => x.rel
      && !['б', 'би', 'не'].includes(x.form.toLowerCase())
      && x.interp.isParticle()
      && !['discourse', 'fixed'])

  xreportIf('не aux у б(би)',
    x => ['б', 'би'].includes(x.form.toLowerCase())
      && x.interp.isParticle()
      && !['fixed', 'aux', undefined].includes(x.relation))

  reportIf('не advmod в не',
    x => x.interp.isParticle()
      && ['не', /*'ні', 'лише'*/].includes(x.form.toLowerCase())
      && !['advmod', undefined].includes(x.rel))

  reportIf('не cc в сурядий на початку речення',
    (x, i) => i === 0 && x.interp.isCoordinating() && !['cc'].includes(x.rel))

  var predicates = new Set<number>()
  sentence.forEach((x, i) => {
    if (CORE_COMPLEMENTS.includes(x.rel)) {
      if (predicates.has(x.head)) {
        problems.push({ indexes: [x.head], message: `у присудка більше ніж один прямий додаток (${CORE_COMPLEMENTS.join('|')})` })
      } else {
        predicates.add(x.head)
      }
    }
  })

  let predicates2 = new Set<number>()
  sentence.forEach((x, i) => {
    if (SUBJECTS.includes(x.rel)) {
      if (predicates2.has(x.head)) {
        problems.push({ indexes: [x.head], message: `у присудка більше ніж один підмет (${SUBJECTS.join('|')})` })
      } else {
        predicates2.add(x.head)
      }
    }
  })

  reportIf('obj/iobj має прийменник',
    (x, i) => ['obj', 'iobj'].includes(x.rel) && sentence.some(xx => xx.rel === 'case' && xx.head === i))

  reportIf('керівний числівник не nummod:gov',
    x => x.rel === 'nummod'
      && x.interp.isCardinalNumeral()
      && !x.interp.isPronoun()
      && (x.interp.isNominative() || x.interp.isAccusative() /*|| /^\d+$/.test(x.form)*/)
      && sentence[x.head].interp.isGenitive())

  reportIf(`:pass-реляція?`,
    x => !x.isPromoted
      && ['aux', 'csubj', 'nsubj'].includes(x.rel)
      && sentence[x.head]
      && isPassive(sentence[x.head].interp))  // todo: навпаки

  xreportIf(`:obl:agent?`,
    (x, i) => !x.isPromoted
      && x.rel === 'obl'
      && x.interp.isInstrumental()
      && isPassive(sentence[x.head].interp)
      && !hasDependantWhich(i, xx => xx.rel === 'case'))

  TERMINAL_RELATIONS.forEach(leafrel => xreportIf(`${leafrel} може вести тільки до листків`,
    (x, i) => x.relation === leafrel
      && sentence.some(xx => xx.head === i
        && !xx.interp.isPunctuation())))

  xreportIf(`obl з неприсудка`,
    (x, i) => OBLIQUES.includes(x.rel)
      && !x.isPromoted
      && !sentence.some(xx => xx.head === i && xx.rel === 'cop')
      && !sentence[x.head].interp.isNounish()
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
  return /*interp.isImpersonal() ||*/ interp.isPassive()
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
  return token.isPromoted
    || !token.hasDeps()
    || token.interp.isInterjection()
    || token.interp.isVerb()
    || token.interp.isTransgressive()
    || token.interp.isAdverb()
    || (sentence.some(t => t.head === index && t.rel === 'cop')
      && (token.interp.isNounish() || token.interp.isAdjective())
      && (token.interp.isNominative() || token.interp.isInstrumental() || token.interp.isLocative())
    )
    || ((token.interp.isNounish() || token.interp.isAdjective()) && token.interp.isNominative())
    || CLAUSAL_MODIFIERS.includes(token.rel)
}

//------------------------------------------------------------------------------
function isNounishOrEllipticAdj(token: Token) {
  return token.interp.isNounish() || token.isPromoted && token.interp.isAdjectivish()
}

//------------------------------------------------------------------------------
function isActualParticiple(token: Token, sentence: Token[], index: number) {
  return token.interp.isParticiple() && ['obl:agent', /*'advcl', 'obl', 'acl', 'advmod'*/].some(x => sentence.some(xx => xx.head === index && xx.rel === x))
}
