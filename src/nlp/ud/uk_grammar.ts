import { GraphNode } from '../../lib/graph'
import { Token } from '../token'
import * as features from '../morph_features'
import { uEq } from './utils'

export type TokenNode = GraphNode<Token>


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
