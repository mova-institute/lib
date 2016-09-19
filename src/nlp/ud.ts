import { MorphInterp } from './morph_interp'


export type UdPos =
  'ADJ' |
  'ADP' |
  'ADV' |
  'AUX' |
  'CONJ' |
  'DET' |
  'INTJ' |
  'NOUN' |
  'NUM' |
  'PART' |
  'PRON' |
  'PROPN' |
  'PUNCT' |
  'SCONJ' |
  'SYM' |
  'VERB' |
  'X'

export type UdPronType =
  'Prs' |
  'Rcp' |
  'Art' |
  'Int' |
  'Rel' |
  'Dem' |
  'Tot' |
  'Neg' |
  'Ind'

export type UdNumType =
  'Card' |
  'Ord' |
  'Mult' |
  'Frac' |
  'Sets' |
  'Dist' |
  'Range' |
  'Gen'

// booleans:
// Poss reflex

export type UdGender =
  'Masc' |
  'Fem' |
  'Neut' |
  'Com'

export type UdAnimacy =
  'Anim' |
  'Nhum' |
  'Inan'

export type UdAspect = 'Imp' | 'Perf'
export type UdCase =
  'Nom' |
  'Gen' |
  'Dat' |
  'Acc' |
  'Ins' |
  'Loc' |
  'Voc'


export type UdDegree = 'Pos' | 'Cmp' | 'Sup'

export class UdFlags {
  POS: UdPos
  Aspect: UdAspect
  Case: UdCase
  Degree: UdDegree
  Gender: UdGender
}

////////////////////////////////////////////////////////////////////////////////
export function toUd(interp: MorphInterp) {
  let ret = new UdFlags()

  if (interp.isNoun() && interp.isProper()) {
    ret.POS = 'PROPN'
  }

}