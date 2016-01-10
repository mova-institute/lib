


enum NounType { common, proper }

enum Gender { masculine, feminine, neuter }
enum Case { nominative, genitive, dative, accusative, instrumental, locative, vocative }
enum Number_ { singular, dual, plural }
enum Person { first, second, third }
enum Tense { present, future, past }
enum Aspect { progressive, perfective }
enum VerbType { main, auxilary }
enum Mood { indicative, imperative, infinitive, impersonal }
enum Animacy { animate, inanimate }
enum Degree { positive, comparative, superlative }
enum Definiteness { short, full }


interface AspectInflectable {
  aspect: Aspect;
}
interface CaseInflectable {
  case: Case;
}
interface NumberInflectable {
  number: Number_;
}
interface TenseInflectable {
  tense: Tense;
}
interface MoodInflectable {
  mood: Mood;
}
interface PersonInflectable {
  person: Person;
}
interface GenderInflectable {
  gender: Gender;
}
interface DegreeInflectable {
  degree: Degree;
}
interface DefinitenessInflectable {
  definiteness: Definiteness;
}
interface AnimacyInflectable {
  animacy: Animacy;  //?
}


class Token {
  repr: string;
}


////////////////////////////////////////////////////////////////////////////////
class Noun extends Token implements CaseInflectable, NumberInflectable {
  case: Case;
  number: Number_;

  type_: NounType;
  gender_: Gender;
  animacy_: Animacy;
}

////////////////////////////////////////////////////////////////////////////////
class Verb extends Token implements AspectInflectable, MoodInflectable, TenseInflectable,
                                    PersonInflectable, NumberInflectable, GenderInflectable {
  aspect: Aspect;
  mood: Mood;
  tense: Tense;
  person: Person;
  number: Number_;
  gender: Gender;
  

  type_: VerbType;
}

////////////////////////////////////////////////////////////////////////////////
class Adjective extends Token implements DegreeInflectable, GenderInflectable, NumberInflectable,
                                         CaseInflectable, DefinitenessInflectable, AnimacyInflectable {
  degree: Degree;
  gender: Gender;
  number: Number_;
  case: Case;
  definiteness: Definiteness;
  animacy: Animacy;
  
}