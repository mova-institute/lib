import {
  NumeralForm, Abbreviation, AdjectiveAsNoun, Alternativity, Animacy,
  Aspect, Auto, Badness, Beforeadj, Case, CaseInflectability, Colloquial, ConjunctionType,
  Degree, Dimin, Gender, Mood, MorphNumber, N2adjness, NameType, NounType, NumberTantum,
  Oddness, OrdinalNumeral, ParadigmOmonym, Participle, Person, Pos, Possessiveness,
  PronominalType, Pronoun, Rarity, Reflexivity, RequiredAnimacy, RequiredCase, SemanticOmonym,
  Slang, Tense, Variant, Polarity, VerbType, Voice, VuAlternativity,
  booleanFeatures, PrepositionRequirement, Foreign, GrammaticalAnimacy,
} from '../morph_features'

import { MorphInterp, featureName2objMap, featureObj2nameMap } from '../morph_interp'


export type UdBoolean = 'Yes'

export type UdAnimacy = 'Anim' | 'Nhum' | 'Inan'
export type UdAspect = 'Imp' | 'Perf'
export type UdCase = 'Nom' | 'Gen' | 'Dat' | 'Acc' | 'Ins' | 'Loc' | 'Voc'
export type UdDegree = 'Pos' | 'Cmp' | 'Sup' | 'Abs'
export type UdForeign = UdBoolean    // todo
export type UdHyph = UdBoolean    // todo
export type UdGender = 'Masc' | 'Fem' | 'Neut' | 'Com'
export type UdMood = 'Ind' | 'Imp'
export type UdNameType = 'Giv' | 'Sur' | 'Pat' | 'Oth'    // todo
export type UdNumber = 'Sing' | 'Plur' | 'Ptan'
export type UdNumForm = 'Digit' | 'Roman' | 'Word'
export type UdPerson = '1' | '2' | '3'
export type UdPrepCase = 'Npr' | 'Pre'
export type UdTense = 'Past' | 'Pres' | 'Fut'
export type UdVerbForm = 'Fin' | 'Inf' | 'Imps' | 'Part' | 'Conv'
export type UdVoice = 'Act' | 'Pass'
export type UdPolarity = 'Pos' | 'Neg'
export type UdVariant = 'Short' | 'Long'
export type UdStyle = 'Coll' | 'Rare' | 'Odd'
export type UdGrammaticalAnimacy = 'Anim' | 'Inan'
export type UdPos =
  'ADJ' |
  'ADP' |
  'ADV' |
  'AUX' |
  'CCONJ' |
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
  'Ind' |
  'Emp'
export type UdNumType =
  'Card' |
  'Ord' |
  'Mult' |
  'Frac' |
  'Sets' |
  'Dist' |
  'Range'


export const featureObj2nameMapUd = new Map<any, string>([
  [Abbreviation, 'Abbr'],
  [Animacy, 'Animacy'],
  [Aspect, 'Aspect'],
  [Case, 'Case'],
  [Degree, 'Degree'],
  [Gender, 'Gender'],
  [Mood, 'Mood'],
  [MorphNumber, 'Number'],
  [Person, 'Person'],
  [Pos, 'POS'],
  [Possessiveness, 'Poss'],
  [PronominalType, 'PronType'],
  [RequiredCase, 'Case'],
  [Tense, 'Tense'],
  [Voice, 'Voice'],
  [Polarity, 'Polarity'],
  [NameType, 'NameType'],
  [Foreign, 'Foreign'],
  [Variant, 'Variant'],
  [RequiredAnimacy, 'Animacy'],
  [GrammaticalAnimacy, 'Animacy[gram]'],
  // [AdjectiveAsNoun, 'adjectiveAsNoun'],
  // [Alternativity, 'alternative'],
  // [Auto, 'auto'],
  // [Bad, 'bad'],
  // [CaseInflectability, 'caseInflectability'],
  // [Colloquial, 'colloquial'],
  // [Dimin, 'dimin'],
  // [N2adjness, 'n2adjness'],
  // [NumeralForm, 'numeralForm'],
  // [Oddness, 'oddness'],
  // [ParadigmOmonym, 'paradigmOmonym'],
  // [Rarity, 'rarity'],
  // [RequiredAnimacy, 'requiredAnimacy'],
  // [Slang, 'slang'],
  // [VuAlternativity, 'vuAlternative'],
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
  [Pos.cardinalNumeral, 'NUM'],
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

const requiredCaseMap = new Map<RequiredCase, UdCase>([
  [RequiredCase.genitive, 'Gen'],
  [RequiredCase.dative, 'Dat'],
  [RequiredCase.accusative, 'Acc'],
  [RequiredCase.instrumental, 'Ins'],
  [RequiredCase.locative, 'Loc'],
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

const moodMap = new Map<Mood, UdMood>([
  [Mood.indicative, 'Ind'],
  [Mood.imperative, 'Imp'],
])

const genderMap = new Map<Gender, UdGender>([
  [Gender.feminine, 'Fem'],
  [Gender.masculine, 'Masc'],
  [Gender.neuter, 'Neut'],
])

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
  [PronominalType.emphatic, 'Emp'],    // temp?
  // [PronominalType.reflexive, ''],
])

const polarityMap = new Map<Polarity, UdPolarity>([
  [Polarity.positive, 'Pos'],
  [Polarity.negative, 'Neg'],
])

const nameTypeMap = new Map<NameType, UdNameType>([
  [NameType.first, 'Giv'],
  [NameType.last, 'Sur'],
  [NameType.patronym, 'Pat'],
])

const foreignMap = new Map<Foreign, UdForeign>([
  [Foreign.yes, 'Yes'],
])

const variantMap = new Map<Variant, UdVariant>([
  [Variant.short, 'Short'],
  [Variant.long, 'Long'],
])

const requiredAnimacyMap = new Map<RequiredAnimacy, UdAnimacy>([
  [RequiredAnimacy.animate, 'Anim'],
  [RequiredAnimacy.inanimate, 'Inan'],
])

const grammaticalAnimacyMap = new Map<GrammaticalAnimacy, UdAnimacy>([
  [GrammaticalAnimacy.animate, 'Anim'],
  [GrammaticalAnimacy.inanimate, 'Inan'],
])

/*
const Map: [][] = [
  [, ''],
]
*/

const mapMap = new Map<any, any>([
  [Pos, posMap],
  [PronominalType, promonialTypeMap],
  [Animacy, animacyMap],
  [Case, caseMap],
  [RequiredCase, requiredCaseMap],
  [Aspect, aspectMap],
  [Tense, tenseMap],
  [Mood, moodMap],
  [Voice, voiceMap],
  [Degree, degreeMap],
  [Gender, genderMap],
  [Person, personMap],
  [MorphNumber, numberMap],
  [Polarity, polarityMap],
  [NameType, nameTypeMap],
  [Foreign, foreignMap],
  [Variant, variantMap],
  [RequiredAnimacy, requiredAnimacyMap],
  [GrammaticalAnimacy, grammaticalAnimacyMap],
])




/* tslint:disable:variable-name */
export class UdFeats {
  // POS: UdPos
  Abbr: UdBoolean
  Animacy: UdAnimacy
  Aspect: UdAspect
  Case: UdCase
  Degree: UdDegree
  Foreign: UdForeign
  Gender: UdGender
  Hyph: UdHyph
  Mood: UdMood
  NameType: UdNameType
  Number: UdNumber
  NumForm: UdNumForm
  NumType: UdNumType
  Person: UdPerson
  Poss: UdBoolean
  PrepCase: UdPrepCase
  PronType: UdPronType
  Reflex: UdBoolean
  Style: UdStyle
  Tense: UdTense
  Variant: UdVariant
  VerbForm: UdVerbForm
  Voice: UdVoice
  'Animacy[gram]': UdGrammaticalAnimacy
}
/* tslint:enable:variable-name */

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
      let udFeatureMap = mapMap.get(feature)
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
  // throw on not supported
  if (interp.isEmphatic()) {
    throw new Error(`Emphatic pronoun conversion is not implemented`)
  }

  let pos: UdPos
  let features = new UdFeats()

  // special-treat conjunctions
  if (interp.isConjunction()) {
    return interp.isSubordinating()
      ? { pos: 'SCONJ', features }
      : { pos: 'CCONJ', features }
  }

  // auto-map pos and features
  for (let featureName of Object.keys(interp.features)) {
    let keyvalue = mapFeatureValue2Ud(featureName, interp.features[featureName])
    if (keyvalue) {
      let [key, value] = keyvalue
      if (key === 'POS') {
        pos = value
      } else {
        features[key] = value
      }
    }
  }

  // encode plurale tantum in Number feature
  if (interp.isPluraleTantum()) {
    features.Number = 'Ptan'
  }

  // special-treat reflexives
  if (interp.isReflexivePronoun()) {
    features.Reflex = 'Yes'
    features.PronType = 'Prs'
  }

  // treat nominals
  if (interp.isNounish()) {
    if (interp.isProper()) {
      pos = 'PROPN'
    } else if (interp.isPronoun()) {
      pos = 'PRON'
    } else {
      pos = 'NOUN'
    }
  }

  // treat numerals
  if (interp.isCardinalNumeral()) {
    features.NumType = 'Card'
    if (interp.isPronoun()) {
      pos = 'DET'
    }
  } else if (interp.isOrdinalNumeral()) {
    features.NumType = 'Ord'
  }

  // the rest of special treatements
  if (interp.isVerb()) {
    if (interp.isIndicative()) {
      features.Mood = 'Ind'
      features.VerbForm = 'Fin'
    } else {
      switch (interp.features.mood) {
        case Mood.imperative:
          features.Mood = 'Imp'
          features.VerbForm = 'Fin'
          break
        case Mood.infinitive:
          features.VerbForm = 'Inf'
          break
        case Mood.impersonal:
          features.VerbForm = 'Imps'
          break
        default:
          throw new Error(`Unknown Mood: "${interp.features.mood}"`)
      }
    }
  } else if (interp.isTransgressive()) {
    pos = 'VERB'
    features.VerbForm = 'Conv'
  } else if (interp.isAdjective()) {
    if (interp.isPronoun()) {
      pos = 'DET'
    } else if (interp.isParticiple()) {
      features.VerbForm = 'Part'
      if (!features.Voice) {
        throw new Error(`No voice for participle`)
      }
    }
  } else if (interp.isBeforeadj()) {
    features.Hyph = 'Yes'
  }

  // stylistic treatment
  // one feature for all, so there's a priority:
  if (interp.isColloquial()) {
    features.Style = 'Coll'
  } else if (interp.isRare()) {
    features.Style = 'Rare'
  } else if (interp.isOdd()) {
    features.Style = 'Odd'
  }

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
