import { GraphNode } from '../../lib/graph'
import { Token } from '../token'
import * as features from '../morph_features'
import { uEq } from './utils'

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

export const QAUNTITATIVE_ADVERBS = [
  'мало',
  'багато',
  'чимало',
  'немало',
  'менше',
  'більше',
  'трошки',
  'трохи',
]

const VALENCY_HAVING_ADJECTIVES = [
  'властивий',
  'потрібний',
  'доступний',
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
  return t.node.interp.isGenitive()
    && t.children.some(x => uEq(x.node.rel, 'advmod')
      && QAUNTITATIVE_ADVERBS.includes(x.node.interp.lemma)
    )
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
export function isBeforeadj(t: TokenNode) {

}
