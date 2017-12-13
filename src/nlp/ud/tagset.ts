import {
  NumeralForm, Abbreviation, AdjectiveAsNoun, Alternativity, Animacy,
  Aspect, Auto, Badness, Beforeadj, Case, Inflectability, Colloquiality, ConjunctionType,
  Degree, Dimin, Gender, VerbType, MorphNumber, N2adjness, NameType, NounType, NumberTantum,
  Oddness, OrdinalNumeral, ParadigmOmonym, Person, Pos, Possessiveness,
  PronominalType, Pronoun, Rarity, Reflexivity, RequiredAnimacy, RequiredCase, SemanticOmonym,
  Slang, Tense, Variant, Polarity, VerbAuxilarity, Voice, VuAlternativity, Typo,
  booleanFeatures, PrepositionRequirement, Foreign, GrammaticalAnimacy, Formality,
  PartType, PunctuationType, PunctuationSide, VerbReversivity,
} from '../morph_features'

import { MorphInterp, featureName2objMap } from '../morph_interp'


export type UdBoolean = 'Yes'
export type UdNegBoolean = 'No'

export type UdAnimacy = 'Anim' | 'Nhum' | 'Inan'
export type UdAspect = 'Imp' | 'Perf'
export type UdCase = 'Nom' | 'Gen' | 'Dat' | 'Acc' | 'Ins' | 'Loc' | 'Voc'
export type UdDegree = 'Pos' | 'Cmp' | 'Sup' | 'Abs'
export type UdForeign = UdBoolean    // todo
export type UdHyph = UdBoolean    // todo
export type UdGender = 'Masc' | 'Fem' | 'Neut' | 'Com'
export type UdMood = 'Ind' | 'Imp' | 'Cnd'
export type UdNameType = 'Giv' | 'Sur' | 'Pat' | 'Oth'    // todo
export type UdNumber = 'Sing' | 'Plur' | 'Ptan'
export type UdNumForm = 'Digit' | 'Roman' | 'Word'
export type UdPerson = '0' | '1' | '2' | '3'
export type UdPrepCase = 'Npr' | 'Pre'
export type UdTense = 'Past' | 'Pres' | 'Fut'
export type UdVerbForm = 'Fin' | 'Inf' | 'Part' | 'Conv'
export type UdVoice = 'Act' | 'Pass'
export type UdPolarity = 'Pos' | 'Neg'
export type UdVariant = 'Short' | 'Uncontr'
export type UdStyle = 'Coll' | 'Rare' | 'Odd'
export type UdTypo = UdBoolean
export type UdOrth = 'Khark'
export type UdGrammaticalAnimacy = 'Anim' | 'Inan'
export type UdPartType = 'Prs' | 'Conseq'
export type UdPolite = 'Form'
export type UdPunctType = 'Quot' | 'Ellip' | 'Hyph' | 'Dash' | 'Ndash' | 'Bull'
export type UdUninflect = UdBoolean
export type UdReversivity = UdBoolean
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
  [VerbType, 'Mood'],
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
  [PrepositionRequirement, 'PrepCase'],
  [Formality, 'Polite'],
  [Typo, 'Typo'],
  [Alternativity, 'Orth'],
  [PartType, 'PartType'],
  [PunctuationSide, 'PunctSide'],
  [PunctuationType, 'PunctType'],
  [Inflectability, 'Uninflect'],
  [VerbReversivity, 'Reverse'],
  // [AdjectiveAsNoun, 'adjectiveAsNoun'],
  // [Alternativity, 'alternative'],
  // [Auto, 'auto'],
  // [Bad, 'bad'],
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
  [Pos.error, 'X'],  // todo: throw
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

const moodMap = new Map<VerbType, UdMood>([
  [VerbType.indicative, 'Ind'],
  [VerbType.imperative, 'Imp'],
  [VerbType.conditional, 'Cnd'],
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

const variantMap = new Map<Variant, UdVariant>([
  [Variant.short, 'Short'],
  [Variant.uncontracted, 'Uncontr'],
])

const requiredAnimacyMap = new Map<RequiredAnimacy, UdAnimacy>([
  [RequiredAnimacy.animate, 'Anim'],
  [RequiredAnimacy.inanimate, 'Inan'],
])

const grammaticalAnimacyMap = new Map<GrammaticalAnimacy, UdAnimacy>([
  [GrammaticalAnimacy.animate, 'Anim'],
  [GrammaticalAnimacy.inanimate, 'Inan'],
])

const prepositionRequirementMap = new Map<PrepositionRequirement, UdPrepCase>([
  [PrepositionRequirement.yes, 'Pre'],
])

const politeMap = new Map<Formality, UdPolite>([
  [Formality.yes, 'Form'],
])

const orthoMap = new Map<Alternativity, UdOrth>([
  [Alternativity.yes, 'Khark'],
])

const partTypeMap = new Map<PartType, UdPartType>([
  [PartType.personal, 'Prs'],
  [PartType.consequential, 'Conseq'],
])

const punctTypeMap = new Map<PunctuationType, UdPunctType>([
  [PunctuationType.quote, 'Quot'],
  [PunctuationType.ellipsis, 'Ellip'],
  [PunctuationType.hyphen, 'Hyph'],
  [PunctuationType.dash, 'Dash'],
  [PunctuationType.ndash, 'Ndash'],
  [PunctuationType.bullet, 'Bull'],
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
  [VerbType, moodMap],
  [Voice, voiceMap],
  [Degree, degreeMap],
  [Gender, genderMap],
  [Person, personMap],
  [MorphNumber, numberMap],
  [Polarity, polarityMap],
  [NameType, nameTypeMap],
  [Variant, variantMap],
  [RequiredAnimacy, requiredAnimacyMap],
  [GrammaticalAnimacy, grammaticalAnimacyMap],
  [PrepositionRequirement, prepositionRequirementMap],
  [Formality, politeMap],
  [Alternativity, orthoMap],
  [PartType, partTypeMap],
  [PunctuationType, punctTypeMap],
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
  Inflect: UdUninflect
  Reverse: UdReversivity
  Mood: UdMood
  NameType: UdNameType
  Number: UdNumber
  NumForm: UdNumForm
  NumType: UdNumType
  PartType: UdPartType
  Person: UdPerson
  Poss: UdBoolean
  PrepCase: UdPrepCase
  PronType: UdPronType
  PunctType: UdPunctType
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
  if (value === undefined) {
    return undefined
  }
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
  interp.denormalize()  // todo: remove

  // throw on not supported
  if (interp.isEmphatic()) {
    // throw new Error(`Emphatic pronoun conversion is not implemented`)
  }

  let pos: UdPos
  let features = new UdFeats()

  // special-treat conjunctions
  if (interp.isConjunction()) {
    return interp.isSubordinative()
      ? { pos: 'SCONJ' as UdPos, features }
      : { pos: 'CCONJ' as UdPos, features }
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
  if (interp.isReflexive()) {
    features.Reflex = 'Yes'
    features.PronType = 'Prs'
  }

  // treat nominals
  if (interp.isNounish()) {
    if (interp.isProper()) {
      pos = 'PROPN'
    } else if (interp.isPronominal()) {
      pos = 'PRON'
    } else {
      pos = 'NOUN'
    }
    if (interp.isNounNumeral()) {
      features.NumType = 'Card'
    }
  }

  // treat numerals
  if (interp.isCardinalNumeral()) {
    features.NumType = 'Card'
    if (interp.isPronominal()) {
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
      switch (interp.features.verbType) {
        case VerbType.imperative:
          features.Mood = 'Imp'
          features.VerbForm = 'Fin'
          break
        case VerbType.infinitive:
          features.VerbForm = 'Inf'
          break
        case VerbType.converb:
          features.VerbForm = 'Conv'
          break
        default:
          throw new Error(`Unknown VerbType: "${interp.features.verbType}"`)
      }
    }
    if (interp.isImpersonal()) {
      features.Person = '0'
    }
  } else if (interp.isAdjective() && !interp.isAdjectiveAsNoun()) {
    if (interp.isPronominal()) {
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

  // set POS=AUX from VerbType feature
  if (interp.isAuxillary()) {
    pos = 'AUX'
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
const comparator = new Intl.Collator('en', { sensitivity: 'base' }).compare
export function udFeatures2conlluString(features: UdFeats) {
  return Object.keys(features)
    .sort(comparator)
    .map(key => `${key}=${features[key]}`)
    .join('|')
}

////////////////////////////////////////////////////////////////////////////////
export function ud2conlluishString(pos: UdPos, features: UdFeats) {
  let ret = pos
  let featuresConllu = udFeatures2conlluString(features)
  if (featuresConllu) {
    ret += `|${featuresConllu}`
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function toConlluishString(interp: MorphInterp) {
  let { pos, features } = toUd(interp)
  return ud2conlluishString(pos, features)
}

////////////////////////////////////////////////////////////////////////////////
export function toUdString(interp: MorphInterp) {
  return udFeatures2conlluString(toUd(interp).features)
}

