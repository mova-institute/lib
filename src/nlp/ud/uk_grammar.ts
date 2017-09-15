import { GraphNode, walkDepth } from '../../lib/graph'
import { Token } from '../token'
import { MorphInterp } from '../morph_interp'
import * as f from '../morph_features'
import { uEq, uEqSome } from './utils'
import { mu } from '../../mu'
import { last } from '../../lang'
import { trimAfterFirst } from '../../string_utils'

export type TokenNode = GraphNode<Token>
export type Node2IndexMap = Map<TokenNode, number>


export const CURRENCY_SYMBOLS = [
  '₴',
  '$',
  '€',
]

export const WORDS_WITH_INS_VALENCY = [
  'даний',
  'одмітний',
  'переповнений',
  'засмічений',
  'узятий',
  'зацікавлений',

  'володіти',
  'задовольнитися',
  'зробитися',

  'рискувати',
  'пожертвувати',
  'курувати',
  'керувати',
  'тхнути',
  'тягнути',
  'нехтувати',
  'називати',
  'дихнути',
  'нехтувати',
  'пахнути',
]

export const PREPS_HEADABLE_BY_NUMS = [
  'близько',
  'понад',
]

export const TEMPORAL_ACCUSATIVES = [
  'вечір',
  'година',
  'день',
  'доба',
  'ніч',
  'раз',
  'рік',
  'секунда',
  'тиждень',
  'хвилина',
  'хвилинка',
  'ранок',
  'мить',
  'час',
  'безліч',
  'р.',
]

export const GENDERLESS_PRONOUNS = [
  'абихто',
  'будь-хто',  // прибрати після розділу
  'ви',
  'вони',  // todo: ns?
  'дехто',
  'дещо',  // ніякий?
  'ми',
  'ніхто',
  'ніщо',  // середній?
  'себе',
  'ти',
  'хто-небудь',  // прибрати після розділу
  'хтось',
  'я',
]

export const EMPTY_ANIMACY_NOUNS = [
  'себе',
  'ся',
]

const VALENCY_HAVING_ADJECTIVES = [
  'властивий',
  'потрібний',
  'доступний',
  'ненависний',
  'ближчий',
]

////////////////////////////////////////////////////////////////////////////////
export function isValencyHavingAdjective(t: Token) {
  return t.interp.isAdjective()
    && VALENCY_HAVING_ADJECTIVES.includes(t.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export const PREDICATES = {
  isAuxWithNoCopAux(t: TokenNode) {
    return t.node.interp.isAuxillary()
      && t.parent
      && !['cop', 'aux'].some(x => uEq(t.node.rel, x))
  }
}

////////////////////////////////////////////////////////////////////////////////
export function isNumericModifier(rel: string) {
  return uEq(rel, 'nummod') || rel === 'det:nummod' || rel === 'det:numgov'
}

////////////////////////////////////////////////////////////////////////////////
export function isGoverning(relation: string) {
  return relation === 'nummod:gov' || relation === 'det:numgov'
}

////////////////////////////////////////////////////////////////////////////////
export function isNumeralModified(t: TokenNode) {
  return t.children.some(x => isNumericModifier(x.node.rel))
    || isQuantitativeAdverbModified(t)
}

////////////////////////////////////////////////////////////////////////////////
export function isQuantitativeAdverbModified(t: TokenNode) {
  return t.children.some(x => isQuantitativeAdverbModifier(x))
}

////////////////////////////////////////////////////////////////////////////////
export function isQuantitativeAdverbModifier(t: TokenNode) {
  return t.node.rel === 'advmod:amtgov'// && t.parent.node.interp.isGenitive()
}

////////////////////////////////////////////////////////////////////////////////
export function isQuantitativeAdverbModifierCandidate(t: TokenNode) {
  return !t.isRoot()
    && t.parent.node.interp.isGenitive()
    && uEq(t.node.rel, 'advmod')
    && QAUNTITATIVE_ADVERBS.includes(t.node.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export function thisOrGovernedCase(t: TokenNode) {
  let governer = t.children.find(x => isGoverning(x.node.rel))
  if (governer) {
    return governer.node.interp.features.case
  }
  return t.node.interp.features.case
}

////////////////////////////////////////////////////////////////////////////////
export function isNmodConj(t: TokenNode) {
  return uEq(t.node.rel, 'nummod')
    && t.node.interp.isInstrumental()
    && t.children.some(x => x.node.interp.isPreposition()
      && ['з', 'із', 'зі'].includes(x.node.interp.lemma)
    )
}

////////////////////////////////////////////////////////////////////////////////
export function hasNmodConj(t: TokenNode) {
  return t.children.some(x => isNmodConj(x))
}

////////////////////////////////////////////////////////////////////////////////
export function isNegativeExistentialPseudosubject(t: TokenNode) {
  return uEq(t.node.rel, 'nsubj')
    && t.node.interp.isGenitive()
    && t.parent.children.some(x => x.node.interp.isNegative())
    && t.parent.node.interp.isNeuter()
    && ['бути', 'бувати', 'існувати', 'мати'].includes(t.parent.node.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export function isQuantificationalNsubj(t: TokenNode) {
  return uEq(t.node.rel, 'nsubj')
    && t.node.interp.isGenitive()
    && (t.parent.node.interp.isAdverb()
      && QAUNTITATIVE_ADVERBS.includes(t.parent.node.interp.lemma)
      || t.parent.node.interp.isCardinalNumeral()
      && t.parent.node.interp.isNominative()
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isPunctInParenthes(t: TokenNode) {
  return t.node.interp.isPunctuation()
    && t.children.length === 2
    && t.children[0].node.form === '('
    && t.children[0].node.interp.isPunctuation()
    && t.children[1].node.form === ')'
    && t.children[1].node.interp.isPunctuation()
}

////////////////////////////////////////////////////////////////////////////////
export function isTerasaZaTerasoyu(t: TokenNode) {
  // console.log(t.node.indexInSentence)
  return t.node.interp.isNounish()
    && t.node.interp.isNominative()
    // && t.children.length === 1  // experimental
    && t.children.some(x => uEq(x.node.rel, 'nmod')
      && x.node.indexInSentence > t.node.indexInSentence
      && x.children.some(xx => uEq(xx.node.rel, 'case'))
      && x.node.interp.isNounish()
      && x.node.interp.lemma === t.node.interp.lemma
    )
}

////////////////////////////////////////////////////////////////////////////////
export function nounAdjectiveAgreed(noun: TokenNode, adjective: TokenNode) {
  return noun.node.interp.getFeature(f.Case) === adjective.node.interp.getFeature(f.Case)
    && (adjective.node.interp.isPlural() && noun.node.interp.isPlural()
      || noun.node.interp.getFeature(f.Gender) === adjective.node.interp.getFeature(f.Gender)
      || adjective.node.interp.isPlural() && noun.node.interp.isSingular() && hasChild(noun, 'conj')
      || adjective.node.interp.isSingular() && GENDERLESS_PRONOUNS.includes(noun.node.interp.lemma)
    )
}

////////////////////////////////////////////////////////////////////////////////
export function nounNounAgreed(interp1: MorphInterp, interp2: MorphInterp) {
  return interp1.equalsByFeatures(interp2, [f.MorphNumber, f.Gender, f.Case])
}

////////////////////////////////////////////////////////////////////////////////
export function hasCopula(t: TokenNode) {
  return t.children.some(x => uEqSome(x.node.rel, ['cop']))
}

////////////////////////////////////////////////////////////////////////////////
export function hasChild(t: TokenNode, rel: string) {
  return t.children.some(x => uEqSome(x.node.rel, [rel]))
}

////////////////////////////////////////////////////////////////////////////////
export function isDeceimalFraction(t: TokenNode) {
  return t.node.interp.isCardinalNumeral()
    && /^\d+$/.test(t.node.form)
    && t.children.some(x => /^\d+$/.test(x.node.form)
      && x.children.length === 1
      && [',', '.'].includes(x.children[0].node.form)
      && x.node.indexInSentence < t.node.indexInSentence
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isNegated(t: TokenNode) {
  return t.node.interp.isNegative()
    || t.children.some(x => x.node.interp.isNegative()
      || x.node.interp.isAuxillary() && x.children.some(xx => xx.node.interp.isNegative()
      )
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isModalAdv(t: TokenNode) {
  return t.node.interp.isAdverb()
    && SOME_MODAL_ADVS.includes(t.node.interp.lemma)
    && (uEqSome(t.node.rel, SUBORDINATE_CLAUSES)
      || uEqSome(t.node.rel, ['parataxis', 'conj'])
      || t.isRoot()
    )
    && hasChild(t, 'csubj')
}

////////////////////////////////////////////////////////////////////////////////
export function isNumAdvAmbig(lemma: string) {
  if (NUM_ADV_AMBIG.includes(lemma)) {
    return true
  }
  // temp, hypen treatment
  return NUM_ADV_AMBIG.some(x => lemma.startsWith(x) || lemma.endsWith(x))
}

////////////////////////////////////////////////////////////////////////////////
export function isConjWithoutCcOrPunct(t: TokenNode) {
  return uEq(t.node.rel, 'conj')
    && !t.children.some(x => uEqSome(x.node.rel, ['cc'])
      || uEq(x.node.rel, 'punct')
      && /[,;/–—\-]/.test(x.node.interp.lemma)
      && x.node.indexInSentence < t.node.indexInSentence
    )
    && !t.node.hasTag('conj_no_cc')
}

////////////////////////////////////////////////////////////////////////////////
export function isCompounSvcCandidate(t: TokenNode) {
  return !t.isRoot()
    && t.node.interp.isVerb()
    && ['давати', 'дати'].includes(t.parent.node.interp.lemma)
    && t.parent.node.interp.getFeature(f.Person) === f.Person.second
    && t.parent.node.interp.isImperative()
    && !t.node.interp.isPast()
}

////////////////////////////////////////////////////////////////////////////////
export function isInfinitive(t: TokenNode) {
  return t.node.interp.isInfinitive()
    && !t.children.some(x => uEqSome(x.node.rel, ['aux', 'cop']) && !x.node.interp.isInfinitive())
}

////////////////////////////////////////////////////////////////////////////////
export function isInfinitiveCop(t: TokenNode) {
  return !t.node.interp.isVerb()
    && t.children.some(x => uEqSome(x.node.rel, ['aux', 'cop']) && x.node.interp.isInfinitive())
}

////////////////////////////////////////////////////////////////////////////////
export function hasOwnRelative(t: TokenNode) {
  let it = walkDepth(t, x => x !== t
    && uEqSome(x.node.rel, SUBORDINATE_CLAUSES)
    && !(x.parent.node.interp.isAdverb() && uEqSome(x.node.rel, ['csubj']))
  )

  return mu(it)
    .some(x => x.node.interp.isRelative())
}

////////////////////////////////////////////////////////////////////////////////
export function isAdverbialAcl(t: TokenNode) {
  return t.node.interp.isAdverb() && !t.hasChildren()  // двері праворуч
    || t.node.interp.isConverb() && !t.hasChildren()  // бокс лежачи
}

////////////////////////////////////////////////////////////////////////////////
export function isFeasibleAclRoot(t: TokenNode) {
  return t.node.interp.isVerb() && t.node.interp.isInfinitive()
    || t.children.some(x => uEqSome(x.node.rel, ['mark']))
    || t.children.some(x => (x.node.rel === 'xcomp' || uEqSome(x.node.rel, ['csubj']))
      && x.node.interp.isInfinitive())
    || hasOwnRelative(t)
    // || t.children.some(x => x.node.interp.isRelative())
    // || t.node.interp.isParticiple()  // temp
    || isAdverbialAcl(t)
    || t.children.some(x => uEq(x.node.rel, 'nsubj'))
}

////////////////////////////////////////////////////////////////////////////////
export function canBeDecimalFraction(t: TokenNode) {
  return t.node.interp.isCardinalNumeral()
    && /^\d+$/.test(t.node.interp.lemma)
    && t.children.some(x => x.node.interp.isCardinalNumeral()
      && uEq(x.node.rel, 'compound')
      && /^\d+$/.test(x.node.interp.lemma)
      && x.children.length === 1
      && [',', '.'].includes(x.children[0].node.interp.lemma)
      && !x.children[0].hasChildren()
    )
}


////////////////////////////////////////////////////////////////////////////////
const DUMB_DOWN_TO_UNIVERSAL = [
  'conj:parataxis'
]
export function standartizeSentence2ud20(sentence: TokenNode[]) {
  let lastToken = last(sentence).node
  let rootIndex = sentence.findIndex(x => !x.node.hasDeps())

  for (let node of sentence) {
    let t = node.node

    // choose (punct) relation from the rigthtest token
    t.deps = t.deps
      .sort((a, b) => a.headIndex - b.headIndex)
      .slice(0, 1)

    // set AUX and Cond
    if (uEqSome(t.rel, ['aux', 'cop'])) {
      t.interp.setIsAuxillary()
      if (['б', 'би'].includes(t.interp.lemma)) {
        t.interp.setIsConditional()
      }
    }

    // set the only iobj to obj
    if (uEq(t.rel, 'iobj')
      && !node.parent.children.some(x => uEqSome(x.node.rel, CORE_COMPLEMENTS))
    ) {
      t.rel = 'obj'
    }

    // remove :spec of internal rels
    if (DUMB_DOWN_TO_UNIVERSAL.includes(t.rel)) {
      t.rel = trimAfterFirst(t.rel, ':')
    }

    // set participle acl to amod
    if (uEq(t.rel, 'acl')
      && !isFeasibleAclRoot(node)
      && t.interp.isParticiple()
    ) {
      t.rel = 'amod'
    }
  }

  // set parataxis punct to the root
  if (lastToken.interp.isPunctuation()
    && uEq(lastToken.rel, 'parataxis')
  ) {
    lastToken.headIndex = rootIndex
  }
}


////////////////////////////////////////////////////////////////////////////////
export const SUBORDINATE_CLAUSES = [
  'csubj',
  'ccomp',
  'xcomp',
  'advcl',
  'acl',
]

////////////////////////////////////////////////////////////////////////////////
export const SOME_MODAL_ADVS = [
  'важко',
  'важливо',
  'варт',
  'варто',
  'вільно',
  'гарно',
  'дивно',
  'довше',
  'дозволено',
  'досить',
  'достатньо',
  'доцільно',
  'жарко',
  'запізно',
  'зручніше',
  'краще',
  'легко',
  'ліпше',
  'може',
  'можливо',
  'можна',
  'найкраще',
  'найліпше',
  'найтяжче',
  'невільно',
  'неефективно',
  'неможливо',
  'необхідно',
  'ніяково',
  'нормально',
  'потрібно',
  'правильно',
  'приємно',
  'реально',
  'слід',
  'сором',
  'треба',
  'цікаво',
  'чемно',
]

const NUM_ADV_AMBIG = [
  'багато',
  'небагато',
  'скілька',
  'скільки',
  'скількись',
  'скількі',
]

export const QAUNTITATIVE_ADVERBS = [
  ...NUM_ADV_AMBIG,
  'більше',
  'мало',
  'менше',
  'немало',
  'трохи',
  'трошки',
  'чимало',
]

export const ADVERBS_MODIFYING_NOUNS = [
  'майже',
]

export const CORE_COMPLEMENTS = [
  'obj',
  // 'xcomp',
  'ccomp',
]

export const COMPLEMENTS = [
  ...CORE_COMPLEMENTS,
  'iobj',
]

export const OBLIQUES = [
  'obl',
  'obl:agent',
]

export const SUBJECTS = [
  'nsubj',
  'csubj',
]

export const NOMINAL_HEAD_MODIFIERS = [
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

export const SOME_FREQUENT_TRANSITIVE_VERBS = [
  'бажати',
  'вважати',
  'вважати',
  'вимагати',
  'вирішити',
  'виходити',
  'встигнути',
  'дозволити',
  'дозволяти',
  'доручити',
  'заборонити',
  'завадити',
  'змогти',
  'змусити',
  'змушувати',
  'зуміти',
  'любити',
  'мати',
  'могти',
  'мусити',
  'переставати',
  'почати',
  'починати',
  'примушувати',
  'припинити',
  'пропонувати',
  'радити',
  'розуміти',
  'спробувати',
  'спробувити',
  'спробувити',
  'хотіти',
  // 'звикнути',
]

export const SOME_FREQUENT_INTRANSITIVE_VERBS = [
  'бігти',
  'вабити',  //
  'їхати',
  'поїхати',
  'приходити',
  'сідати',
  'ходити',
]
