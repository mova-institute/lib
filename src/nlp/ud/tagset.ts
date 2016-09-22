import {
  NumeralForm, Abbreviation, AdjectiveAsNoun, Alternativity, Animacy,
  Aspect, Auto, Bad, Beforeadj, Case, CaseInflectability, Colloquial, ConjunctionType,
  Degree, Dimin, Gender, Mood, MorphNumber, N2adjness, NameType, NounType, NumberTantum,
  Oddness, OrdinalNumeral, ParadigmOmonym, Participle, Person, Pos, Possessiveness,
  PronominalType, Pronoun, Rarity, Reflexivity, RequiredAnimacy, RequiredCase, SemanticOmonym,
  Slang, Tense, Variant, VerbForm, VerbNegativity, VerbType, Voice, VuAlternativity,
  booleanFeatures,
} from '../morph_features'

import { MorphInterp, featureName2objMap, featureObj2nameMap } from '../morph_interp'


export const featureObj2nameMapUd = new Map<any, string>([
  [Pos, 'POS'],
  // [N2adjness, 'n2adjness'],
  // [NumeralForm, 'numeralForm'],
  // [NounType, 'nounType'],
  // [VerbType, 'verbType'],
  // [Rarity, 'rarity'],
  // [Colloquial, 'colloquial'],
  // [Slang, 'slang'],
  // [Bad, 'bad'],
  // [NameType, 'nameType'],
  [Animacy, 'Animacy'],
  // [RequiredAnimacy, 'requiredAnimacy'],
  [Case, 'Case'],
  // [RequiredCase, 'requiredCase'],
  [Aspect, 'Aspect'],
  [Tense, 'Tense'],
  // [Mood, 'Mood'],
  [Voice, 'Voice'],
  [Degree, 'Degree'],
  // [Pronoun, 'pronoun'],
  // [Participle, 'participle'],
  // [OrdinalNumeral, 'ordinalNumeral'],
  // [AdjectiveAsNoun, 'adjectiveAsNoun'],
  [Gender, 'Gender'],
  [MorphNumber, 'Number'],
  [Person, 'Person'],
  // [NumberTantum, 'numberTantum'],
  // [CaseInflectability, 'caseInflectability'],
  // [Alternativity, 'alternative'],
  // [Abbreviation, 'abbreviation'],
  // [VuAlternativity, 'vuAlternative'],
  // [Dimin, 'dimin'],
  [Possessiveness, 'Poss'],
  // [Auto, 'auto'],
  // [Beforeadj, 'beforeadj'],
  // [Oddness, 'oddness'],
  // [ParadigmOmonym, 'paradigmOmonym'],
  [PronominalType, 'PronType'],
])

const posMap = new Map<Pos, UdPos>([
  [Pos.noun, 'NOUN'],  // caution
  [Pos.adjective, 'ADJ'],
  [Pos.interjection, 'INTJ'],
  [Pos.verb, 'VERB'],
  [Pos.adverb, 'ADV'],
  [Pos.x, 'X'],
  [Pos.sym, 'SYM'],
  [Pos.particle, 'PART'],
  [Pos.punct, 'PUNCT'],
  [Pos.preposition, 'ADP'],
  // [Pos, ''],
])

const caseMap = new Map<Case, UdCase>([
  [Case.nominative, 'Nom'],
  [Case.genitive, 'Gen'],
  [Case.dative, 'Dat'],
  [Case.accusative, 'Acc'],
  [Case.instrumental, 'Ins'],
  [Case.locative, 'Loc'],
  [Case.vocative, 'Voc'],
])

const numberMap = new Map<Number, UdNumber>([
  [MorphNumber.singular, 'Sing'],
  [MorphNumber.plural, 'Plur'],
])

const animacyMap = new Map<Animacy, UdAnimacy>([
  [Animacy.animate, 'Anim'],
  [Animacy.inanimate, 'Inan'],
  // todo: bacteria
])

const aspectMap = new Map<Aspect, UdAspect>([
  [Aspect.imperfect, 'Imp'],
  [Aspect.perfect, 'Perf'],
])

const tenseMap = new Map<Tense, UdTense>([
  [Tense.past, 'Past'],
  [Tense.present, 'Pres'],
  [Tense.future, 'Fut'],
])

const genderMap = new Map<Gender, UdGender>([
  [Gender.feminine, 'Fem'],
  [Gender.masculine, 'Masc'],
  [Gender.neuter, 'Neut'],
])

// const moodMap: [Mood, UdMood][] = [
//   [Mood.infinitive, ''],
//   [Mood.indicative, ''],
//   [Mood.imperative, ''],
//   [Mood.impersonal, ''],
// ]

const voiceMap = new Map<Voice, UdVoice>([
  [Voice.active, 'Act'],
  [Voice.passive, 'Pass'],
])

const degreeMap = new Map<Degree, UdDegree>([
  [Degree.positive, 'Pos'],
  [Degree.comparative, 'Cmp'],
  [Degree.superlative, 'Sup'],
  [Degree.absolute, 'Abs'],
])

const personMap = new Map<Person, UdPerson>([
  [Person.first, '1'],
  [Person.second, '2'],
  [Person.third, '3'],
])

const promonialTypeMap = new Map<PronominalType, UdPronType>([
  [PronominalType.personal, 'Prs'],
  [PronominalType.interrogative, 'Int'],
  [PronominalType.relative, 'Rel'],
  [PronominalType.demonstrative, 'Dem'],
  [PronominalType.general, 'Tot'],
  [PronominalType.negative, 'Neg'],
  [PronominalType.indefinite, 'Ind'],

  // [PronominalType.definitive, ''],
  // [PronominalType.emphatic, ''],
  // [PronominalType.reflexive, ''],
])

/*
const Map: [][] = [
  [, ''],
]
*/

const map = new Map<any, any>([
  [Pos, posMap],
  [PronominalType, promonialTypeMap],
  [Animacy, animacyMap],
  [Case, caseMap],
  [Aspect, aspectMap],
  [Tense, tenseMap],
  [Voice, voiceMap],
  [Degree, degreeMap],
  [Gender, genderMap],
  [Person, personMap],
  [MorphNumber, numberMap],
])

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

export type UdNumber = 'Sing' | 'Plur' | 'Ptan'

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


export type UdDegree = 'Pos' | 'Cmp' | 'Sup' | 'Abs'
export type UdTense = 'Past' | 'Pres' | 'Fut'
export type UdPerson = '1' | '2' | '3'
// export type UdMood = 'Ind' | 'Imp'
export type UdVoice = 'Act' | 'Pass'


export class UdFlags {
  POS: UdPos
  Aspect: UdAspect
  Case: UdCase
  Degree: UdDegree
  Gender: UdGender
  Poss: boolean
  Number: UdNumber
}

//------------------------------------------------------------------------------
function mapFeatureValue2Ud(featureName, value) {
  let feature = featureName2objMap.get(featureName)
  if (!feature) {
    throw new Error(`Unknown feature: ${featureName}`)
  }
  let udFeatureName = featureObj2nameMapUd.get(feature)
  if (udFeatureName) {
    if (booleanFeatures.find(x => x === feature)) {
      return [udFeatureName, 'Yes']
    } else {
      let udFeatureMap = map.get(feature)
      if (udFeatureMap) {
        let retValue = udFeatureMap.get(value)
        if (retValue) {
          return [udFeatureName, retValue]
        }
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function toUd(interp: MorphInterp) {
  let pos
  let features = new UdFlags()

  if (interp.isConjunction()) {
    return interp.isSubordinating()
      ? { pos: 'SCONJ', features }
      : { pos: 'CONJ', features }
  }

  for (let featureName of Object.keys(interp.features)) {
    let keyvalue = mapFeatureValue2Ud(featureName, interp.features[featureName])
    if (keyvalue) {
      if (keyvalue[0] === 'POS') {
        pos = keyvalue[1]
      } else {
        features[keyvalue[0]] = keyvalue[1]
      }
    }
  }

  if (interp.isNoun()) {
    if (interp.isProper()) {
      pos = 'PROPN'
    } else if (interp.isPronoun()) {
      pos = 'PRON'
    }
  }

  // if (interp.isNoSingular()) {
  //   features.Number = 'Ptan'
  // }

  return { pos, features }
}

////////////////////////////////////////////////////////////////////////////////
export function udFeatures2conlluString(features) {
  return Object.keys(features)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))
    .map(key => `${key}=${features[key]}`)
    .join('|')
}

////////////////////////////////////////////////////////////////////////////////
export function toUdString(interp: MorphInterp) {
  return udFeatures2conlluString(toUd(interp).features)
}
