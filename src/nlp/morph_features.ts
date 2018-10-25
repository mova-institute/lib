export enum Pos {
  adverb,
  conjunction,
  particle,
  preposition,
  // predicative,  // todo
  interjection,
  cardinalNumeral,
  verb,
  noun,
  adjective,
  sym,
  error,
  punct,  // todo
  x,
}
export enum Pronoun {
  yes,
}
export enum OrdinalNumeral { yes }
export enum AdjectiveAsNoun { yes }
export enum NounNumeral { yes }


///// Nominal /////

export enum NounType {
  common,
  proper,
}
export enum Gender {
  masculine,
  feminine,
  neuter,
  // common,
}
export enum Animacy {
  animate,
  inanimate,
  bacteria,  // ?
}
export enum GrammaticalAnimacy {
  animate,
  inanimate,
}
export enum RequiredAnimacy {
  animate,
  inanimate,
}
export enum MorphNumber {
  singular,
  plural,
  // dual,
  // pluraleTantum,
  // singulareTantum  // людств
}
export enum Case {
  nominative,
  genitive,
  dative,
  accusative,
  instrumental,
  locative,
  vocative,
  // other non-ukr
}
export enum RequiredCase {
  genitive = 1,  // so we can comare to Case
  dative,
  accusative,
  instrumental,
  locative,
}
export enum Degree {
  positive,
  comparative,
  superlative,
  absolute,
}

///// Verbal /////

// a mix of Mood and VerbForm
export enum VerbType {
  infinitive,
  indicative,
  imperative,
  impersonal,
  conditional,  // б/би
  participle,  // дієприкметник
  converb,  // дієприслівник
}
export enum Tense {
  past,
  present,
  future,
}
export enum Aspect {
  imperfect,
  perfect,
}
export enum Voice {
  active,
  passive,
}
export enum Person {
  first = 1,
  second,
  third,
}
export enum Polarity {
  positive,
  negative,
}
export enum VerbAuxilarity {
  yes,
}
export enum VerbReversivity {
  yes,
}
export enum Reflexivity {
  yes,
}

///// Lexical /////
export enum PronominalType {
  relative,
  indefinite,
  interrogative,
  personal,
  demonstrative,
  // possessive,
  // reflexive,
  negative,
  general,
  emphatic,
  // definitive,  // todo
}
export enum NumeralForm {
  digit,
  roman,
  letter,
}
export enum Variant {
  short,
  uncontracted,
  symbolical,
  stem,
}
export enum Rarity {
  // archaic,
  rare,
}
export enum Slang {
  yes,
}
export enum Colloquiality {
  yes,
}
export enum Badness {
  yes,
}
export enum ConjunctionType {
  subordinative,
  coordinating,
}
export enum PartType {
  personal,
  consequential,
}
export enum NumberTantum { noPlural, noSingular }
export enum NameType { first, last, patronym, nick }

export enum Inflectability { no }
export enum Alternativity { yes }
export enum VuAlternativity { yes }
export enum Abbreviation { yes }
export enum Dimin { yes }
export enum Beforeadj { yes }
export enum Possessiveness { yes }
export enum ParadigmOmonym { xp1, xp2, xp3, xp4, xp5, xp6, xp7, xp8, xp9 }
export enum SemanticOmonym { xv1, xv2, xv3, xv4, xv5, xv6, xv7, xv8, xv9 }
export enum Auto { yes }
export enum Oddness { yes }
export enum N2adjness { yes }
export enum PrepositionRequirement { yes }
export enum Foreign { yes }
export enum Formality { yes }
export enum Typo { yes }

export enum PunctuationType {
  bullet,
  dash,
  ellipsis,
  hyphen,
  ndash,
  quote,
}

export enum PunctuationSide {
  open,
  close,
}

export enum DictValency {
  accusative,
  intransitive,
  ambiguous,
}

export type Feature = Abbreviation
  | AdjectiveAsNoun
  | Alternativity
  | Animacy
  | Aspect
  | Auto
  | Badness
  | Beforeadj
  | Case
  | Colloquiality
  | ConjunctionType
  | Degree
  | Dimin
  | Foreign
  | Formality
  | Gender
  | GrammaticalAnimacy
  | Inflectability
  | MorphNumber
  | N2adjness
  | NameType
  | NounNumeral
  | NounType
  | NumberTantum
  | NumeralForm
  | Oddness
  | OrdinalNumeral
  | ParadigmOmonym
  | PartType
  | Person
  | Polarity
  | Pos
  | Possessiveness
  | PrepositionRequirement
  | PronominalType
  | Pronoun
  | PunctuationSide
  | PunctuationType
  | Rarity
  | Reflexivity
  | RequiredAnimacy
  | RequiredCase
  | SemanticOmonym
  | Slang
  | Tense
  | Typo
  | Variant
  | VerbAuxilarity
  | VerbReversivity
  | VerbType
  | Voice
  | VuAlternativity

export const booleanFeatures = [
  Possessiveness,
  Reflexivity,
  Abbreviation,
  Foreign,
  Typo,
  Inflectability,
  VerbReversivity,
]

export const NONGRAMMATICAL_FEATURES = [
  Alternativity,
  Auto,
  Badness,
  Colloquiality,
  Foreign,
  Formality,
  N2adjness,
  Oddness,
  Rarity,
  Slang,
  Typo,
  VuAlternativity,
]
