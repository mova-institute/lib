import {
  NumeralForm, Abbreviation, AdjectiveAsNoun, Alternativity, Animacy, GrammaticalAnimacy,
  Aspect, Auto, Badness, Beforeadj, Case, Inflectability, Colloquial, ConjunctionType,
  Degree, Dimin, Gender, VerbType, MorphNumber, N2adjness, NameType, NounType, NumberTantum,
  Oddness, OrdinalNumeral, ParadigmOmonym, Person, Pos, Possessiveness,
  PronominalType, Pronoun, Rarity, Reflexivity, RequiredAnimacy, RequiredCase, SemanticOmonym,
  Slang, Tense, Variant, Polarity, VerbAuxilarity, Voice, VuAlternativity, Foreign, Formality,
  PrepositionRequirement, Typo, PartType,
} from './morph_features'



const INFLECTABLE_POSES = [
  Pos.adjective,
  Pos.cardinalNumeral,
  Pos.noun,
  // Pos.verb,
]
//[Pos.adverb, Pos.conjunction, Pos.interjection,
// Pos.particle, Pos.preposition, Pos.punct, Pos.punct, Pos.sym, Pos.x]

////////////////////////////////////////////////////////////////////////////////
export function inflectsCase(pos: Pos) {
  return [Pos.adjective, Pos.cardinalNumeral, Pos.noun].includes(pos)
}

////////////////////////////////////////////////////////////////////////////////
export function isInflecable(pos: Pos) {
  return INFLECTABLE_POSES.includes(pos)
}
