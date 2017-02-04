// todo: kill predic, isert
// todo: split to files

import { indexTableByColumns, overflowNegative, flipMap } from '../algo'
import { isOddball, compare, zipLongest } from '../lang'
import {
  NumeralForm, Abbreviation, AdjectiveAsNoun, Alternativity, Animacy, GrammaticalAnimacy,
  Aspect, Auto, Badness, Beforeadj, Case, CaseInflectability, Colloquial, ConjunctionType,
  Degree, Dimin, Gender, Mood, MorphNumber, N2adjness, NameType, NounType, NumberTantum,
  Oddness, OrdinalNumeral, ParadigmOmonym, Participle, Person, Pos, Possessiveness,
  PronominalType, Pronoun, Rarity, Reflexivity, RequiredAnimacy, RequiredCase, SemanticOmonym,
  Slang, Tense, Variant, Polarity, VerbType, Voice, VuAlternativity, Foreign,
  PrepositionRequirement,
} from './morph_features'


export const featureObj2nameMap = new Map<any, string>([
  [Abbreviation, 'abbreviation'],
  [AdjectiveAsNoun, 'adjectiveAsNoun'],
  [Alternativity, 'alternative'],
  [Animacy, 'animacy'],
  [Aspect, 'aspect'],
  [Auto, 'auto'],
  [Badness, 'bad'],
  [Beforeadj, 'beforeadj'],
  [Case, 'case'],
  [CaseInflectability, 'caseInflectability'],
  [Colloquial, 'colloquial'],
  [Degree, 'degree'],
  [Dimin, 'dimin'],
  [Gender, 'gender'],
  [Mood, 'mood'],
  [MorphNumber, 'number'],
  [N2adjness, 'n2adjness'],
  [NameType, 'nameType'],
  [NounType, 'nounType'],
  [NumberTantum, 'numberTantum'],
  [NumeralForm, 'numeralForm'],
  [Oddness, 'oddness'],
  [OrdinalNumeral, 'ordinalNumeral'],
  [ParadigmOmonym, 'paradigmOmonym'],
  [Participle, 'participle'],
  [Person, 'person'],
  [Pos, 'pos'],
  [Possessiveness, 'possessiveness'],
  [PrepositionRequirement, 'prepositionRequirement'],
  [PronominalType, 'pronominalType'],
  [Pronoun, 'pronoun'],
  [GrammaticalAnimacy, 'grammaticalAnimacy'],
  [Rarity, 'rarity'],
  [Reflexivity, 'reflexivity'],
  [RequiredAnimacy, 'requiredAnimacy'],
  [RequiredCase, 'requiredCase'],
  [SemanticOmonym, 'semanticOmonym'],
  [Slang, 'slang'],
  [Tense, 'tense'],
  [Variant, 'variant'],
  [VerbType, 'verbType'],
  [Voice, 'voice'],
  [VuAlternativity, 'vuAlternative'],
  [Polarity, 'polarity'],
  [Foreign, 'foreign'],
])
export const featureName2objMap = flipMap(featureObj2nameMap)



export const FEATURE_TABLE = [

  { featStr: 'n2adjness', feat: N2adjness, vesum: N2adjness.yes, vesumStr: 'n2adj' },

  { featStr: 'numeralForm', feat: NumeralForm, vesum: NumeralForm.digit, vesumStr: 'digit', mte: 'd' },  // todo: not vesum?
  { featStr: 'numeralForm', feat: NumeralForm, vesum: NumeralForm.roman, vesumStr: 'roman', mte: 'r' },  // todo: not vesum?
  { featStr: 'numeralForm', feat: NumeralForm, vesum: NumeralForm.letter, vesumStr: 'letter', mte: 'l' },  // todo: not vesum?

  { featStr: 'nounType', feat: NounType, mi: NounType.common, mte: 'c' },
  { featStr: 'nounType', feat: NounType, vesum: NounType.proper, vesumStr: 'prop', mte: 'p' },

  { featStr: 'verbType', feat: VerbType, mi: VerbType.main, mte: 'm' },
  { featStr: 'verbType', feat: VerbType, mi: VerbType.auxilary, mte: 'a' },

  { featStr: 'rarity', feat: Rarity, vesum: Rarity.rare, vesumStr: 'rare' },
  { featStr: 'colloquial', feat: Colloquial, vesum: Colloquial.yes, vesumStr: 'coll' },
  { featStr: 'slang', feat: Slang, vesum: Slang.yes, vesumStr: 'slang' },
  { featStr: 'bad', feat: Badness, vesum: Badness.yes, vesumStr: 'bad' },

  { featStr: 'nameType', feat: NameType, vesum: NameType.first, vesumStr: 'fname' },
  { featStr: 'nameType', feat: NameType, vesum: NameType.last, vesumStr: 'lname' },
  { featStr: 'nameType', feat: NameType, vesum: NameType.patronym, vesumStr: 'patr' },
  { featStr: 'nameType', feat: NameType, vesum: NameType.nick, vesumStr: 'nick' },

  { featStr: 'animacy', feat: Animacy, vesum: Animacy.animate, vesumStr: 'anim', mte: 'y' },
  { featStr: 'animacy', feat: Animacy, vesum: Animacy.inanimate, vesumStr: 'inanim', mte: 'n' },
  { featStr: 'animacy', feat: Animacy, vesum: Animacy.bacteria, vesumStr: 'unanim' },

  { featStr: 'grammaticalAnimacy', feat: GrammaticalAnimacy, vesum: GrammaticalAnimacy.animate, vesumStr: 'animish' },
  { featStr: 'grammaticalAnimacy', feat: GrammaticalAnimacy, vesum: GrammaticalAnimacy.inanimate, vesumStr: 'inanimish' },

  { featStr: 'requiredAnimacy', feat: RequiredAnimacy, vesum: RequiredAnimacy.animate, vesumStr: 'ranim', mte: 'y' },  // ?
  { featStr: 'requiredAnimacy', feat: RequiredAnimacy, vesum: RequiredAnimacy.inanimate, vesumStr: 'rinanim', mte: 'n' },  // ?

  { featStr: 'reflexivity', feat: Reflexivity, vesum: Reflexivity.yes, vesumStr: 'rev' },  // ?

  { featStr: 'case', feat: Case, vesum: Case.nominative, vesumStr: 'v_naz', mte: 'n' },
  { featStr: 'case', feat: Case, vesum: Case.genitive, vesumStr: 'v_rod', mte: 'g' },
  { featStr: 'case', feat: Case, vesum: Case.dative, vesumStr: 'v_dav', mte: 'd' },
  { featStr: 'case', feat: Case, vesum: Case.accusative, vesumStr: 'v_zna', mte: 'a' },
  { featStr: 'case', feat: Case, vesum: Case.instrumental, vesumStr: 'v_oru', mte: 'i' },
  { featStr: 'case', feat: Case, vesum: Case.locative, vesumStr: 'v_mis', mte: 'l' },
  { featStr: 'case', feat: Case, vesum: Case.vocative, vesumStr: 'v_kly', mte: 'v' },

  { featStr: 'requiredCase', feat: RequiredCase, vesum: RequiredCase.genitive, vesumStr: 'rv_rod', mte: 'g' },
  { featStr: 'requiredCase', feat: RequiredCase, vesum: RequiredCase.dative, vesumStr: 'rv_dav', mte: 'd' },
  { featStr: 'requiredCase', feat: RequiredCase, vesum: RequiredCase.accusative, vesumStr: 'rv_zna', mte: 'a' },
  { featStr: 'requiredCase', feat: RequiredCase, vesum: RequiredCase.instrumental, vesumStr: 'rv_oru', mte: 'i' },
  { featStr: 'requiredCase', feat: RequiredCase, vesum: RequiredCase.locative, vesumStr: 'rv_mis', mte: 'l' },

  { featStr: 'aspect', feat: Aspect, vesum: Aspect.imperfect, vesumStr: 'imperf', mte: 'p' },
  { featStr: 'aspect', feat: Aspect, vesum: Aspect.perfect, vesumStr: 'perf', mte: 'e' },

  { featStr: 'tense', feat: Tense, vesum: Tense.past, vesumStr: 'past', mte: 's' },
  { featStr: 'tense', feat: Tense, vesum: Tense.present, vesumStr: 'pres', mte: 'p' },
  { featStr: 'tense', feat: Tense, vesum: Tense.future, vesumStr: 'futr', mte: 'f' },

  { featStr: 'mood', feat: Mood, mi: Mood.indicative, mte: 'i' },
  { featStr: 'mood', feat: Mood, vesum: Mood.imperative, vesumStr: 'impr', mte: 'm' },
  { featStr: 'mood', feat: Mood, vesum: Mood.infinitive, vesumStr: 'inf', mte: 'n' },
  { featStr: 'mood', feat: Mood, vesum: Mood.impersonal, vesumStr: 'impers', mte: 'o' },

  { featStr: 'voice', feat: Voice, vesum: Voice.active, vesumStr: 'actv', mte: 'a' },
  { featStr: 'voice', feat: Voice, vesum: Voice.passive, vesumStr: 'pasv', mte: 'p' },

  { featStr: 'degree', feat: Degree, vesum: Degree.positive, vesumStr: 'compb', mte: 'p' },
  { featStr: 'degree', feat: Degree, vesum: Degree.comparative, vesumStr: 'compr', mte: 'c' },
  { featStr: 'degree', feat: Degree, vesum: Degree.superlative, vesumStr: 'super', mte: 's' },
  { featStr: 'degree', feat: Degree, vesum: Degree.absolute, vesumStr: 'abs', mte: undefined },

  { featStr: 'variant', feat: Variant, vesum: Variant.short, vesumStr: 'short', mte: 's' },
  { featStr: 'variant', feat: Variant, vesum: Variant.uncontracted, vesumStr: 'uncontr', mte: 'f' },

  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.personal, vesumStr: 'pers', mte: 'p' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.reflexive, vesumStr: 'refl', mte: 'x' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.demonstrative, vesumStr: 'dem', mte: 'd' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.interrogative, vesumStr: 'int', mte: 'q' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.relative, vesumStr: 'rel', mte: 'r' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.negative, vesumStr: 'neg', mte: 'z' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.indefinite, vesumStr: 'ind', mte: 'i' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.general, vesumStr: 'gen', mte: 'g' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.emphatic, vesumStr: 'emph', mte: 'h' },
  { featStr: 'pronominalType', feat: undefined, mte: 's' },

  { featStr: 'polarity', feat: Polarity, vesum: Polarity.negative, vesumStr: 'neg' },  // <-- ambig!!

  { featStr: 'conjunctionType', feat: ConjunctionType, vesum: ConjunctionType.coordinating, vesumStr: 'coord', mte: 'c' },
  { featStr: 'conjunctionType', feat: ConjunctionType, vesum: ConjunctionType.subordinative, vesumStr: 'subord', mte: 's' },

  { featStr: 'pos', feat: Pos, vesum: Pos.noun, vesumStr: 'noun', mte: 'N' },
  { featStr: 'pos', feat: undefined, mte: 'P' },
  { featStr: 'pos', feat: Pos, vesum: Pos.verb, vesumStr: 'verb', mte: 'V' },
  { featStr: 'pos', feat: Pos, vesum: Pos.adjective, vesumStr: 'adj', mte: 'A' },
  { featStr: 'pos', feat: Pos, vesum: Pos.adverb, vesumStr: 'adv', mte: 'R' },
  { featStr: 'pos', feat: Pos, vesum: Pos.transgressive, vesumStr: 'advp' },
  { featStr: 'pos', feat: Pos, vesum: Pos.preposition, vesumStr: 'prep', mte: 'S' },
  { featStr: 'pos', feat: Pos, vesum: Pos.predicative, vesumStr: 'predic' },  // ?
  // { featStr: 'pos', feat: Pos, vesum: Pos.insert, vesumStr: 'insert' },  // ?
  { featStr: 'pos', feat: Pos, vesum: Pos.conjunction, vesumStr: 'conj', mte: 'C' },
  { featStr: 'pos', feat: Pos, vesum: Pos.particle, vesumStr: 'part', mte: 'Q' },
  { featStr: 'pos', feat: Pos, vesum: Pos.interjection, vesumStr: 'intj', mte: 'I' },
  { featStr: 'pos', feat: Pos, vesum: Pos.cardinalNumeral, vesumStr: 'numr', mte: 'M' },
  { featStr: 'pos', feat: Pos, vesum: Pos.sym, vesumStr: 'sym' },
  { featStr: 'pos', feat: Pos, vesum: Pos.error, vesumStr: 'error' },
  { featStr: 'pos', feat: Pos, vesum: Pos.x, vesumStr: 'x', mte: 'X' },
  { featStr: 'pos', feat: Pos, vesum: Pos.punct, vesumStr: 'punct', mte: 'U' },

  { featStr: 'pronoun', feat: Pronoun, vesum: Pronoun.yes, vesumStr: '&pron' },
  { featStr: 'participle', feat: Participle, vesum: Participle.yes, vesumStr: '&adjp' },
  { featStr: 'ordinalNumeral', feat: OrdinalNumeral, vesum: OrdinalNumeral.yes, vesumStr: '&numr' },
  { featStr: 'ordinalNumeral', feat: OrdinalNumeral, vesum: OrdinalNumeral.maybe, vesumStr: '&_numr' },
  { featStr: 'adjectiveAsNoun', feat: AdjectiveAsNoun, vesum: AdjectiveAsNoun.yes, vesumStr: '&noun' },

  { featStr: 'gender', feat: Gender, vesum: Gender.masculine, vesumStr: 'm', mte: 'm' },
  { featStr: 'gender', feat: Gender, vesum: Gender.feminine, vesumStr: 'f', mte: 'f' },
  { featStr: 'gender', feat: Gender, vesum: Gender.neuter, vesumStr: 'n', mte: 'n' },

  { featStr: 'number', feat: MorphNumber, vesum: MorphNumber.plural, vesumStr: 'p', mte: 'p' },
  { featStr: 'number', feat: MorphNumber, vesum: MorphNumber.singular, vesumStr: 's', mte: 's' },

  { featStr: 'person', feat: Person, vesum: Person.first, vesumStr: '1', mte: '1' },
  { featStr: 'person', feat: Person, vesum: Person.second, vesumStr: '2', mte: '2' },
  { featStr: 'person', feat: Person, vesum: Person.third, vesumStr: '3', mte: '3' },

  { featStr: 'numberTantum', feat: NumberTantum, vesum: NumberTantum.noPlural, vesumStr: 'np' },
  { featStr: 'numberTantum', feat: NumberTantum, vesum: NumberTantum.noSingular, vesumStr: 'ns' },

  { featStr: 'caseInflectability', feat: CaseInflectability, vesum: CaseInflectability.no, vesumStr: 'nv' },

  { featStr: 'alternative', feat: Alternativity, vesum: Alternativity.yes, vesumStr: 'alt' },

  { featStr: 'abbreviation', feat: Abbreviation, vesum: Abbreviation.yes, vesumStr: 'abbr' },

  { featStr: 'vuAlternative', feat: VuAlternativity, vesum: VuAlternativity.yes, vesumStr: 'v-u' },

  { featStr: 'dimin', feat: Dimin, vesum: Dimin.yes, vesumStr: 'dimin' },

  { featStr: 'possessiveness', feat: Possessiveness, vesum: Possessiveness.yes, vesumStr: 'poss' },

  { featStr: 'auto', feat: Auto, vesum: Auto.yes, vesumStr: 'auto' },

  { featStr: 'beforeadj', feat: Beforeadj, vesum: Beforeadj.yes, vesumStr: 'beforeadj' },

  { featStr: 'oddness', feat: Oddness, vesum: Oddness.yes, vesumStr: 'odd' },

  { featStr: 'prepositionRequirement', feat: PrepositionRequirement, vesum: PrepositionRequirement.yes, vesumStr: 'rprep' },

  { featStr: 'foreign', feat: Foreign, vesum: Foreign.yes, vesumStr: 'foreign' },

  // todo: dehardcode
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp1, vesumStr: 'xp1' },
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp2, vesumStr: 'xp2' },
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp3, vesumStr: 'xp3' },
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp4, vesumStr: 'xp4' },
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp5, vesumStr: 'xp5' },
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp6, vesumStr: 'xp6' },
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp7, vesumStr: 'xp7' },
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp8, vesumStr: 'xp8' },
  { featStr: 'paradigmOmonym', feat: ParadigmOmonym, vesum: ParadigmOmonym.xp9, vesumStr: 'xp9' },

  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv1, vesumStr: 'xv1' },
  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv2, vesumStr: 'xv2' },
  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv3, vesumStr: 'xv3' },
  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv4, vesumStr: 'xv4' },
  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv5, vesumStr: 'xv5' },
  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv6, vesumStr: 'xv6' },
  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv7, vesumStr: 'xv7' },
  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv8, vesumStr: 'xv8' },
  { featStr: 'semanticOmonym', feat: SemanticOmonym, vesum: SemanticOmonym.xv9, vesumStr: 'xv9' },
]

export const MTE_FEATURES = {
  N: [Pos.noun, NounType, Gender, MorphNumber, Case, Animacy],  // todo: common gender
  V: [undefined, VerbType, Aspect, Mood, Tense, Person, MorphNumber, Gender],
  A: [Pos.adjective, undefined, Degree, Gender, MorphNumber, Case, undefined, RequiredAnimacy, Aspect, Voice, Tense],
  P: [undefined, PronominalType, undefined, Person, Gender, RequiredAnimacy, MorphNumber, Case, undefined],
  R: [Pos.adverb, Degree],
  S: [Pos.preposition, undefined, undefined, RequiredCase],
  C: [Pos.conjunction, ConjunctionType, undefined],
  M: [Pos.cardinalNumeral, NumeralForm, undefined, Gender, MorphNumber, Case, RequiredAnimacy],
  Q: [Pos.particle],
  I: [Pos.interjection],
  Y: [undefined],
  X: [Pos.x],
}


export const MAP_VESUM_FEAT = indexTableByColumns(FEATURE_TABLE, ['feat', 'vesum'])
export const MAP_VESUM_FEAT_STR = indexTableByColumns(FEATURE_TABLE, ['featStr', 'vesum'])
const MAP_VESUM: Map<string, any> =
  indexTableByColumns(FEATURE_TABLE.filter((x: any) => x.vesum !== undefined), ['vesumStr'])
export const MAP_MTE: Map<string, any> = indexTableByColumns(FEATURE_TABLE, ['feat', 'mte'])

//export const FEAT_MAP_STRING = new Map<Object, string>(
//FEATURE_TABLE.filter(row => row.feat && !!row.featStr).map(x => [x.feat, x.featStr]))
// todo: follow https://github.com/Microsoft/TypeScript/issues/7799

export const FEAT_MAP_STRING = new Map<Object, string>()
export const STRING_MAP_FEAT = new Map<Object, string>()
for (let row of FEATURE_TABLE) {
  if (row.feat && row.featStr) {
    FEAT_MAP_STRING.set(row.feat, row.featStr)
    STRING_MAP_FEAT.set(row.featStr, row.feat)
  }
}

export const FEATURE_ORDER = {
  [Pos.noun]: [
    Pos,
    Animacy,
    MorphNumber,
    Gender,
    Case,
    GrammaticalAnimacy,
    CaseInflectability,
    NumberTantum,
    Alternativity,
    NounType,
    NameType,
    Abbreviation,
    Possessiveness,
    PrepositionRequirement,
    Pronoun,
    PronominalType,
  ],
  [Pos.adjective]: [
    Pos,
    Beforeadj,
    Gender,
    MorphNumber,
    Case,
    GrammaticalAnimacy,
    RequiredAnimacy,
    Variant,
    Degree,
    Abbreviation,
    Possessiveness,
    CaseInflectability,
    NumberTantum,
    Pronoun,
    Participle,
    PronominalType,
    Aspect,
    Voice,
    OrdinalNumeral,
    AdjectiveAsNoun,
    Animacy,
  ],
  [Pos.verb]: [
    Pos,
    Reflexivity,
    Voice,
    Aspect,
    Tense,
    Mood,
    MorphNumber,
    Person,
    Gender,
    Dimin,
    VuAlternativity,
  ],
  [Pos.cardinalNumeral]: [
    Pos,
    Gender,
    MorphNumber,
    Case,
    CaseInflectability,
    Pronoun,
    PronominalType,
  ],
  [Pos.transgressive]: [
    Pos,
    Reflexivity,
    Voice,
    Aspect,
    Alternativity,
  ],
  [Pos.x]: [
    Pos,
    Abbreviation,
  ],
  other: [  // todo check
    Pos,
    Degree,
    ConjunctionType,
    Case, RequiredCase,
    GrammaticalAnimacy,
    RequiredAnimacy,
    CaseInflectability,
    Alternativity,
    NumberTantum,
    NameType,
    Possessiveness,
    Abbreviation,
    PrepositionRequirement,
    Pronoun,
    Participle,
    OrdinalNumeral,
    AdjectiveAsNoun,
    PronominalType,
    Person,
  ],
}

for (let pos of Object.keys(FEATURE_ORDER)) {
  FEATURE_ORDER[pos].push(Colloquial, Rarity, Badness, Oddness, Auto, SemanticOmonym, ParadigmOmonym)
}

const POSWISE_COMPARATORS = {}
Object.keys(Pos).filter(x => /^\d+$/.test(x)).forEach(x => POSWISE_COMPARATORS[x] = createVesumFlagCompare(x as any))

////////////////////////////////////////////////////////////////////////////////
export class Features {
  pos: Pos
  pronoun: Pronoun
  participle: Participle
  ordinalNumeral: OrdinalNumeral
  adjectiveAsNoun: AdjectiveAsNoun
  case: Case
  requiredCase: RequiredCase
  number: MorphNumber
  aspect: Aspect
  tense: Tense
  mood: Mood
  person: Person
  voice: Voice
  animacy: Animacy
  grammaticalAnimacy: GrammaticalAnimacy
  requiredAnimacy: RequiredAnimacy
  gender: Gender
  degree: Degree
  variant: Variant
  pronominalType: PronominalType
  numberTantum: NumberTantum
  reflexivity: Reflexivity
  verbType: VerbType
  numeralForm: NumeralForm
  conjunctionType: ConjunctionType
  nounType: NounType
  nameType: NameType
  auto: Auto
  beforeadj: Beforeadj
  paradigmOmonym: ParadigmOmonym
  possessiveness: Possessiveness
  abbreviation: Abbreviation
  oddness: Oddness
  badness: Badness
  n2adjness: N2adjness
  prepositionRequirement: PrepositionRequirement
  polarity: Polarity  // the only ambig flag (neg)
  foreign: Foreign
  colloquial: Colloquial
  rarity: Rarity
}

////////////////////////////////////////////////////////////////////////////////
// represents a single unambiguous morphological interpretation
export class MorphInterp {
  private static otherFlagsAllowed = new Set([
    'xv1', 'xv2', 'xv3', 'xv4', 'xv5', 'xv6', 'xv7',
    'nv', 'alt', 'v-u', 'dimin', 'mock', 'instant',
  ])


  lemma?: string
  features = new Features()
  private otherFlags = new Set<string>()

  static hash(value: MorphInterp) {
    return value.toVesumStr() + (value.lemma ? ` ${value.lemma}` : '')
  }

  static isValidVesumStr(value: string) {  // todo
    try {
      MorphInterp.fromVesumStr(value)
      return true
    }
    catch (e) {
      return false
    }
  }

  static fromVesum(flags: string[], lemma?: string, lemmaFlags?: string[], strict = false) {
    let ret = new MorphInterp()

    for (let flag of flags) {
      let row = tryMapVesumFlag(flag)
      if (row) {
        ret.features[row.featStr] = row.vesum
      }
      else {
        if (MorphInterp.otherFlagsAllowed.has(flag)) {
          ret.otherFlags.add(flag)
        }
        else if (strict) {
          throw new Error(`Unknown flag "${flag}" in tag "${flags.join(':')}"`)
        }
      }
    }

    if (lemmaFlags) {
      let lemmaTag = MorphInterp.fromVesum(lemmaFlags)

      // gender for plural
      if (ret.features.pos === Pos.noun) {
        if (ret.features.number === MorphNumber.plural && !isOddball(lemmaTag.features.gender)) {
          ret.features.gender = lemmaTag.features.gender
        }
      }
    }

    if (lemma && ret.features.pos === Pos.transgressive) {
      if (/ши(сь)?/.test(lemma)) {
        ret.features.tense = Tense.past
      }
      else if (/чи(сь)?/.test(lemma)) {
        ret.features.tense = Tense.present
      }
      else {
        // mte-tagged texts made me comment this out:
        // throw new Error(`Unexpected adverb "${lemma}" flection`)
      }
    }

    if (ret.isPronoun() && ret.features.polarity === Polarity.negative) {
      ret.features.pronominalType = PronominalType.negative
      ret.features.polarity = undefined
    }

    ret.lemma = lemma

    return ret
  }

  static fromVesumStr(flags: string, lemma?: string, lemmaFlags?: string) {
    return MorphInterp.fromVesum(flags.split(':'), lemma, lemmaFlags && lemmaFlags.split(':'))
  }

  static fromMte(tag: string, form?: string) {
    let ret = new MorphInterp()

    let flags = [...tag]
    ret.fromMte(flags)  // read all injections

    switch (flags[0]) {  // then tweak what's left
      case 'V': {
        if (flags[2] === 'b') {  // treat biaspectuals as imperfect, todo
          ret.features.aspect = Aspect.imperfect
        }
        if (form && (form.endsWith('ся') || form.endsWith('сь'))) {
          ret.features.reflexivity = Reflexivity.yes
        }
        ret.features.pos = flags[3] === 'g' ? Pos.transgressive : Pos.verb
        break
      }

      case 'A':
        if (flags[1] === 'p') {
          ret.features.participle = Participle.yes
        }

        if (ret.features.gender === Gender.masculine) {
          if (flags[6] === 's') {
            ret.features.variant = Variant.short
          }
        }
        else if (flags[6] === 'f' && 'na'.includes(flags[5])) {
          ret.features.variant = Variant.uncontracted
        }
        break

      case 'P':  // todo: Referent_Type
        ret.features.pronoun = Pronoun.yes
        switch (flags[8]) {
          case 'n':
            ret.features.pos = Pos.noun
            break
          case 'a':
            ret.features.pos = Pos.adjective
            break
          case 'r':
            ret.features.pos = Pos.adverb
            break
          case 'm':
            ret.features.pos = Pos.cardinalNumeral
            break
          default:
            throw new Error(`Unknown MTE pronoun Syntactic_Type: "${flags[8]}"`)
        }
        if (flags[1] === 's') {  // possessive
          ret.features.possessiveness = Possessiveness.yes
          ret.features.pronominalType = PronominalType.personal
        }
        break

      case 'M':
        if (flags[2] === 'o') {
          ret.features.pos = Pos.adjective
          ret.features.ordinalNumeral = OrdinalNumeral.yes
        }
        else if (flags[2] === 'c') {
          ret.features.pos = Pos.cardinalNumeral
        }
        break

      case 'Y':
        ret.features.pos = Pos.x
        ret.features.abbreviation = Abbreviation.yes
        break

      case 'N':
        if (flags[2] === 'c') {  // treat common gender as feminine, todo
          ret.features.gender = Gender.feminine
        }
        if (flags[2] === '-') {
          ret.features.numberTantum = NumberTantum.noSingular
        }
        break

      case 'R':
      case 'S':
      case 'C':
      case 'Q':
      case 'I':
      case 'X':
        break

      default:
        throw new Error(`Unknown MTE POS: ${flags[0]}`)
    }

    // kill redundant info
    if (!isOddball(ret.features.gender) && ret.features.number === MorphNumber.singular
      && ret.features.pos !== Pos.cardinalNumeral && ret.features.ordinalNumeral === undefined) {
      delete ret.features.number
    }

    return ret
  }

  clone() {
    let ret = new MorphInterp()
    let keys = Object.keys(this.features)
    for (let i = 0; i < keys.length; ++i) {
      ret.features[keys[i]] = this.features[keys[i]]
    }
    this.otherFlags.forEach(x => ret.otherFlags.add(x))
    ret.lemma = this.lemma

    return ret
  }

  toVesum() {
    let flags = [...this.otherFlags]

    for (let name of Object.keys(this.features)) {
      let value = this.features[name]
      if (value === undefined
        // || this.features.number === Numberr.plural && name === 'gender' && !this.isAdjectiveAsNoun()
        || this.isTransgressive() && this.isPerfect() && name === 'tense') {
        continue
      }
      let flag = mapVesumFeatureValue(name, value)
      if (flag && flag !== 'letter') {  // letter: temp, hack
        flags.push(flag)
      }
    }

    return flags.sort(POSWISE_COMPARATORS[this.features.pos])
  }

  toVesumStr() {
    return this.toVesum().join(':')
  }

  toVesumStrMorphInterp() {
    return {
      lemma: this.lemma,
      flags: this.toVesumStr(),
    }
  }

  toMteMorphInterp() {
    return {
      lemma: this.lemma,
      flags: this.toMte(),
    }
  }

  toUd() {

  }

  toMte(lemma = this.lemma, lemmaTag?: MorphInterp) {
    if (lemma === 'незважаючи' && this.isPreposition()) {
      return 'Vmpgp'
    }

    if (this.isAbbreviation()) {
      return 'Y'
    }

    if (this.isBeforeadj()) {
      return 'Ab'
    }

    if (this.isCardinalNumeral() || this.isOrdinalNumeral()) {
      let form = tryMap2Mte(NumeralForm, this.features.numeralForm) || 'l'
      let type = this.isCardinalNumeral() ? 'c' : 'o'
      let gender = map2mteOrDash(Gender, this.features.gender)
      let morphNumber = tryMap2Mte(MorphNumber, this.getNumber())
      let morphCase = map2mteOrDash(Case, this.features.case)
      let requiredAnimacy = tryMap2Mte(RequiredAnimacy, this.features.requiredAnimacy)

      return trimTrailingDash('M' + form + type + gender + morphNumber + morphCase + requiredAnimacy)
    }

    if (this.isPronoun()) {
      let type = this.isPossessive()
        ? 'p'
        : map2mte(PronominalType, this.features.pronominalType)
      let possessiveness = this.isPossessive() ? 'p' : '-'
      let person = map2mteOrDash(Person, this.features.person)
      let gender = map2mteOrDash(Gender, this.features.gender)
      let animacy = tryMap2Mte(RequiredAnimacy, this.features.requiredAnimacy)
      if (!animacy) {
        animacy = map2mteOrDash(Animacy, this.features.animacy)
      }
      let morphNumber = map2mteOrDash(MorphNumber, this.getNumber())
      let morphCase = map2mteOrDash(Case, this.features.case)
      let syntacticType = map2mte(Pos, this.features.pos).toLowerCase()

      return 'P' + type + possessiveness + person + gender + animacy + morphNumber + morphCase + syntacticType
    }

    if (this.isNoun() /*|| this.isAdjectiveAsNoun()*/) {
      let type = tryMap2Mte(NounType, this.features.nounType) || 'c'
      let gender = tryMap2Mte(Gender, this.features.gender)
      if (!gender) {
        if (this.isNoSingular() || this.isBad() || (this.isN2Adj() && this.isPlural())) {
          gender = '-'
        } else if (lemmaTag) {
          gender = map2mteOrDash(Gender, lemmaTag.features.gender)
        } else {
          gender = '-'    // todo: separate convertion from validation
          // throw new Error(`No gender info for ${this.toVesumStr()} ${lemma}`)
        }
      }
      // let morphNumber = map2mte(MorphNumber, this.getNumber())
      let morphNumber = map2mteOrDash(MorphNumber, this.getNumber())
      let morphCase = map2mteOrDash(Case, this.features.case)
      let animacy = tryMap2Mte(Animacy, this.features.animacy)
      if (!animacy) {
        if (this.isBacteria()) {
          animacy = 'y'
        } else {
          animacy = '-'    // todo: separate convertion from validation
          // throw new Error('Animacy missing')
        }
      }

      return 'N' + type + gender + morphNumber + morphCase + animacy
    }

    if (this.isVerb() || this.isTransgressive()) {
      if (!lemma) {
        throw new Error('No lemma provided')
      }
      let type = isAuxVerb(lemma) ? 'a' : 'm'
      let aspect = map2mte(Aspect, this.features.aspect)
      let verbForm = this.isTransgressive() ? 'g' : tryMap2Mte(Mood, this.features.mood) || 'i'
      let tense = map2mteOrDash(Tense, this.features.tense)
      let person = map2mteOrDash(Person, this.features.person)
      let morphNumber = map2mteOrDash(MorphNumber, this.getNumber())
      let gender = tryMap2Mte(Gender, this.features.gender)

      return trimTrailingDash('V' + type + aspect + verbForm + tense + person + morphNumber + gender)
    }

    switch (this.features.pos) {
      case Pos.adjective: {
        let type = this.isParticiple() ? 'p' : (this.isComparable() ? 'f' : 'o')
        let degree = this.isParticiple() ? '-' : map2mteOrDash(Degree, this.features.degree)
        let gender = map2mteOrDash(Gender, this.features.gender)
        let morphNumber = map2mte(MorphNumber, this.getNumber())
        let morphCase = map2mteOrDash(Case, this.features.case)
        let definiteness = tryMap2Mte(Variant, this.features.variant)
          || defaultMteDefiniteness(this.features.gender, this.features.number, this.features.case,
            this.features.requiredAnimacy)
        if (!this.isParticiple()) {
          let requiredAnimacy = tryMap2Mte(RequiredAnimacy, this.features.requiredAnimacy)
          return 'A' + type + degree + gender + morphNumber + morphCase + definiteness + requiredAnimacy
        }
        let requiredAnimacy = map2mteOrDash(RequiredAnimacy, this.features.requiredAnimacy)
        let aspect = tryMap2Mte(Aspect, this.features.aspect)
        let voice = tryMap2Mte(Voice, this.features.voice)
        let tense = tryMap2Mte(Tense, this.features.tense)
        if (!tense && this.isActive() && this.isImperfect()) {
          tense = 'p'
        }

        return 'A' + type + degree + gender + morphNumber + morphCase + definiteness + requiredAnimacy + aspect + voice + tense
      }
      case Pos.preposition: {
        if (!lemma) {
          throw new Error('No lemma provided')
        }
        let formation = lemma.includes('-') ? 'c' : 's'
        let requiredCase = map2mte(RequiredCase, this.features.requiredCase)
        return 'Sp' + formation + requiredCase
      }
      case Pos.conjunction: {
        if (!lemma) {
          throw new Error('No lemma provided')
        }
        let type = map2mte(ConjunctionType, this.features.conjunctionType)
        let formation = lemma.includes('-') ? 'c' : 's'
        return 'C' + type + formation
      }
      case Pos.adverb: {
        return 'R' + tryMap2Mte(Degree, this.features.degree)
      }
      case Pos.particle:
        return 'Q'
      case Pos.interjection:
        return 'I'
      case Pos.x:
      case Pos.sym:
        return 'X'
      case Pos.predicative:  // todo
        return 'Vm-p'
      case Pos.punct:
        return 'U'

      default:
        break
    }

    throw new Error(`Cannot convert ${this.toVesumStr()} to MTE`)
  }

  featurewiseEquals(other: MorphInterp) {
    return this.toVesumStr() === other.toVesumStr()
  }

  // grammaticallyEquals(other: MorphInterp) {
  //   // todo
  // }

  getFeatures() {
    let others = [...this.otherFlags].map(x => {
      let row = tryMapVesumFlag(x)
      // if (!row) {
      //   return
      // }
      return {
        featureName: row && row.featStr,
        feature: row && row.feat,
        value: row && row.vesum || row.mi,
      }
    })

    let ret = Object.keys(this.features)
      .filter(x => !isOddball(this.features[x]))
      .map(x => ({
        featureName: x,
        feature: STRING_MAP_FEAT.get(x),
        value: this.features[x],
      }))
    ret.push(...others)
    ret.sort(createVesumFlagComparator2(this.features.pos))

    return ret
  }

  setLemma(lemma: string) {
    this.lemma = lemma
    return this
  }

  isAdjective() { return this.features.pos === Pos.adjective && this.features.beforeadj !== Beforeadj.yes }
  isAdjectivish() { return this.features.pos === Pos.adjective }  // todo: rename properly <^
  isAdverb() { return this.features.pos === Pos.adverb }
  isCardinalNumeral() { return this.features.pos === Pos.cardinalNumeral }
  isConjunction() { return this.features.pos === Pos.conjunction }
  isNoun() { return this.features.pos === Pos.noun }
  isParticle() { return this.features.pos === Pos.particle }
  isPreposition() { return this.features.pos === Pos.preposition }
  isPronoun() { return this.features.pronoun !== undefined }
  isPunctuation() { return this.features.pos === Pos.punct }
  isTransgressive() { return this.features.pos === Pos.transgressive }
  isVerb() { return this.features.pos === Pos.verb }
  isX() { return this.features.pos === Pos.x }

  isNominative() { return this.features.case === Case.nominative }
  isGenitive() { return this.features.case === Case.genitive }
  isDative() { return this.features.case === Case.dative }
  isAccusative() { return this.features.case === Case.accusative }
  isInstrumental() { return this.features.case === Case.instrumental }
  isVocative() { return this.features.case === Case.vocative }

  isAdjectiveAsNoun() { return this.features.adjectiveAsNoun === AdjectiveAsNoun.yes }
  isN2Adj() { return this.features.n2adjness === N2adjness.yes }

  canBeOrdinalNumeral() { return this.features.ordinalNumeral === OrdinalNumeral.yes || this.features.ordinalNumeral === OrdinalNumeral.maybe }
  isAbbreviation() { return this.features.abbreviation === Abbreviation.yes }
  isActive() { return this.features.voice === Voice.active }
  isAnimate() { return this.features.animacy === Animacy.animate }
  isAuxillary() { return this.features.verbType === VerbType.auxilary }
  isBacteria() { return this.features.animacy === Animacy.bacteria }
  isBeforeadj() { return this.features.beforeadj === Beforeadj.yes }
  isComparable() { return this.features.degree !== undefined }
  isCoordinating() { return this.features.conjunctionType === ConjunctionType.coordinating }
  isEmphatic() { return this.features.pronominalType === PronominalType.emphatic }
  isFeminine() { return this.features.gender === Gender.feminine }
  isForeign() { return this.otherFlags.has('foreign') }
  isImperfect() { return this.features.aspect === Aspect.imperfect }
  isImpersonal() { return this.features.mood === Mood.impersonal }
  isInanimate() { return this.features.animacy === Animacy.inanimate }
  isIndicative() { return this.features.mood === undefined || this.features.mood === Mood.indicative }
  isMasculine() { return this.features.gender === Gender.masculine }
  isNegative() { return this.features.polarity === Polarity.negative }
  isNoSingular() { return this.features.numberTantum === NumberTantum.noSingular }  // todo: tantum?
  isOdd() { return this.features.oddness === Oddness.yes }
  isOrdinalNumeral() { return this.features.ordinalNumeral === OrdinalNumeral.yes }
  isParticiple() { return this.features.participle !== undefined }
  isPassive() { return this.features.voice === Voice.passive }
  isPerfect() { return this.features.aspect === Aspect.perfect }
  isPlural() { return this.features.number === MorphNumber.plural }
  isPluraleTantum() { return this.features.numberTantum === NumberTantum.noSingular }
  isPossessive() { return this.features.possessiveness === Possessiveness.yes }
  isPresent() { return this.features.tense === Tense.present }
  isReflexivePronoun() { return this.features.pronominalType === PronominalType.reflexive }
  isReflexiveVerb() { return this.features.reflexivity === Reflexivity.yes }
  isSingular() { return this.features.number === MorphNumber.singular }  // todo: tantum?
  isSubordinative() { return this.features.conjunctionType === ConjunctionType.subordinative }

  hasNumber() { return this.features.number !== undefined }
  hasGender() { return this.features.gender !== undefined }

  isProper() { return this.features.nounType === NounType.proper }
  isBad() { return this.features.badness === Badness.yes }
  isColloquial() { return this.features.colloquial === Colloquial.yes }
  isRare() { return this.features.rarity === Rarity.rare }

  isNounish() { return this.isNoun() || this.isAdjectiveAsNoun() }
  isVerbial() { return this.isVerb() || this.isTransgressive() || this.isParticiple() }

  setGrammaticalAnimacy(value = true) { this.features.grammaticalAnimacy = value ? GrammaticalAnimacy.animate : GrammaticalAnimacy.inanimate; return this }
  setIsAbsolute(value = true) { this.features.degree = value ? Degree.absolute : undefined; return this }
  setIsAuto(value = true) { this.features.auto = value ? Auto.yes : undefined; return this }
  setIsAuxillary() { this.features.verbType = VerbType.auxilary; return this }
  setIsFuture(value = true) { this.features.tense = value ? Tense.future : undefined; return this }
  setIsNegative(value = true) { this.features.polarity = value ? Polarity.negative : undefined; return this }
  setIsOdd(value = true) { this.features.oddness = value ? Oddness.yes : undefined; return this }
  setIsOrdinalNumeral(value = true) { this.features.ordinalNumeral = value ? OrdinalNumeral.yes : undefined; return this }
  setIsPerfect(value = true) { this.features.aspect = value ? Aspect.perfect : undefined; return this }
  setIsPlural(value = true) { this.features.number = value ? MorphNumber.plural : MorphNumber.singular; return this }
  setIsPresent(value = true) { this.features.tense = value ? Tense.present : undefined; return this }
  setIsReflexive(value = true) { this.features.reflexivity = value ? Reflexivity.yes : undefined; return this }
  setPos(pos: Pos) { this.features.pos = pos; return this }

  setCase(value: Case) { this.features.case = value; return this }

  unproper() {
    this.features.nounType = NounType.common
    this.features.nameType = undefined    // todo
    return this
  }


  canBeKharkivSty() {
    return this.isNoun() && this.isFeminine() && (this.isSingular() || !this.hasNumber())
  }

  getNumber() {
    if (this.hasNumber()) {
      return this.features.number
    }
    if (this.hasGender()) {
      return MorphNumber.singular  // tocheck
    }
  }

  private fromMte(mteFlags: string[]) {
    let posFeatures = MTE_FEATURES[mteFlags[0]]

    if (posFeatures[0] !== undefined) {
      this.features.pos = posFeatures[0]
    }
    for (let i = 1; i < posFeatures.length && i < mteFlags.length; ++i) {
      let feature = posFeatures[i]
      let mteFlag = mteFlags[i]

      if (feature && mteFlag !== '-') {
        let row = MAP_MTE.get(feature).get(mteFlag)
        if (row) {
          // if (!(row.featStr in this.features)) {
          //   throw new Error(`${row.featStr} not in this`)
          // }
          this.features[row.featStr] = ('vesum' in row) ? row.vesum : row.mi
          if (this.features[row.featStr] === undefined) {
            throw new Error(`Cannot map ${mteFlags.join('')}`)
          }
        }
      }
    }
  }
}

//------------------------------------------------------------------------------
function tryMap2Mte(feature, value) {
  let mappedFeature = MAP_VESUM_FEAT.get(feature)
  if (mappedFeature) {
    let mappedRow = mappedFeature.get(value)
    if (mappedRow) {
      let mte = mappedRow.mte
      if (mte) {
        return mte as string
      }
    }
  }
  return ''
}

//------------------------------------------------------------------------------
function map2mteOrDash(feature, value) {
  return tryMap2Mte(feature, value) || '-'
}

//------------------------------------------------------------------------------
function map2mte(feature, value) {
  let ret = tryMap2Mte(feature, value)
  if (!ret) {
    throw new Error(`Unmappable feature "${Object.keys(feature).join(',')}" value "${value}"`)
  }
  return ret
}

//------------------------------------------------------------------------------
function defaultMteDefiniteness(gender: Gender, morphNumber: Number, morphCase: Case, requiredAnimacy: RequiredAnimacy) {  // todo: загалний
  if ((gender === Gender.feminine || gender === Gender.neuter
    || (morphNumber === MorphNumber.plural && requiredAnimacy !== RequiredAnimacy.animate))
    && (morphCase === Case.nominative || morphCase === Case.accusative)) {

    return 's'
  }

  return 'f'
}

//------------------------------------------------------------------------------
function createVesumFlagCompare(pos: Pos) {
  return (a: string, b: string) => {
    let rowA = tryMapVesumFlag(a)
    let rowB = tryMapVesumFlag(b)
    if (rowA && rowB) {
      let featA = rowA.feat
      let featB = rowB.feat

      let order = FEATURE_ORDER[pos] || FEATURE_ORDER.other
      return overflowNegative(order.indexOf(featA)) - overflowNegative(order.indexOf(featB))
    }

    // return a.localeCompare(b)
    return Number.MAX_SAFE_INTEGER
  }
}

//------------------------------------------------------------------------------
function createVesumFlagComparator2(pos: Pos) {
  let order = FEATURE_ORDER[pos] || FEATURE_ORDER.other
  return (a, b) => {
    return overflowNegative(order.indexOf(a.feature)) - overflowNegative(order.indexOf(b.feature))
  }
}

//------------------------------------------------------------------------------
function isAuxVerb(lemma: string) {
  return lemma === 'бути' || lemma === 'будучи' || lemma === 'бувши'
}

//------------------------------------------------------------------------------
function trimTrailingDash(str: string) {
  let i = str.length
  while (i >= 0 && str.charAt(i - 1) === '-') {
    --i
  }

  return str.substring(0, i)
}

////////////////////////////////////////////////////////////////////////////////
export function tryMapVesumFlag(value: string) {
  let match = /^x[v](\d+)$/.exec(value)
  if (match) {
    return {
      featStr: value.charAt(1) === 'p' ? 'paradigmOmonym' : 'semanticOmonym',
      feat: value.charAt(1) === 'p' ? ParadigmOmonym : SemanticOmonym,
      vesum: Number.parseInt(match[1]) - 1,
      vesumStr: value,
    }
  }

  let ret = MAP_VESUM.get(value)
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function mapVesumFlag(value: string) {
  let ret = tryMapVesumFlag(value)
  if (!ret) {
    throw new Error(`Unknown flag: ${value}`)
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function tryMapVesumFlagToFeature(value: string) {
  let row = tryMapVesumFlag(value)
  if (row && row.feat) {
    return row.feat
  }
}

////////////////////////////////////////////////////////////////////////////////
export function mapVesumFeatureValue(featureName: string, value) {
  if (featureName === 'paradigmOmonym') {
    return 'xp' + (value + 1)
  }
  if (featureName === 'semanticOmonym') {
    return 'xv' + (value + 1)
  }

  let featMap = MAP_VESUM_FEAT_STR.get(featureName)
  if (featMap) {
    let row = featMap.get(value)
    if (row) {
      let ret = row.vesumStr || row.miStr
      if (ret) {
        return ret
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
const featureCompareOrder = new Set([
  Pos,
  AdjectiveAsNoun,
  Participle,
  Pronoun,
  OrdinalNumeral,
  Animacy,
])
export function compareTags(a: MorphInterp, b: MorphInterp) {
  if (a.lemma && b.lemma) {
    let res = a.lemma.localeCompare(b.lemma)
    if (res) {
      return res
    }
  }
  for (let feature of featureCompareOrder) {
    let prop = FEAT_MAP_STRING.get(feature) as string
    let res = compare(a.features[prop], b.features[prop])
    if (res) {
      return res
    }
  }

  for (let pair of zipLongest(a.getFeatures(), b.getFeatures())) {
    if (pair[0] && pair[1] && pair[0].feature !== pair[1].feature) {
      return 0
    }
    let res = compare(pair[0] && pair[0].value, pair[1] && pair[1].value)
    if (res) {
      return res
    }
  }

  return 0
}
