import { GraphNode } from '../../lib/graph'
import { Token } from '../token'
import * as features from '../morph_features'
import { uEq } from './utils'

export type TokenNode = GraphNode<Token>


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

export const EMPTY_GENDER_NOUNS = [
  'вони',  // todo: ns?
  'ніщо',  // середній?
  'ми',
  'себе',
  'ти',
  'хтось',
  'ви',
  'ніхто',
  'абихто',
  'дещо',  // ніякий?
  'будь-хто',  // прибрати після розділу
  'хто-небудь',  // прибрати після розділу
]

export const EMPTY_ANIMACY_NOUNS = [
  'себе',
]

export const QAUNTITATIVE_ADVERBS = [
  'мало',
  'багато',
]

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
