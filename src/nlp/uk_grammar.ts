import {
  NumeralForm, Abbreviation, AdjectiveAsNoun, Alternativity, Animacy, GrammaticalAnimacy,
  Aspect, Auto, Badness, Beforeadj, Case, Inflectability, Colloquial, ConjunctionType,
  Degree, Dimin, Gender, VerbType, MorphNumber, N2adjness, NameType, NounType, NumberTantum,
  Oddness, OrdinalNumeral, ParadigmOmonym, Person, Pos, Possessiveness,
  PronominalType, Pronoun, Rarity, Reflexivity, RequiredAnimacy, RequiredCase, SemanticOmonym,
  Slang, Tense, Variant, Polarity, VerbAuxilarity, Voice, VuAlternativity, Foreign, Formality,
  PrepositionRequirement, Typo, PartType,
} from './morph_features'




////////////////////////////////////////////////////////////////////////////////
export function inflectsCase(pos: Pos) {
  return [Pos.adjective, Pos.cardinalNumeral, Pos.noun].includes(pos)
}
