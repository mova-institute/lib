


enum NounType { common, proper }
enum Gender { masculine, feminine, neuter }
enum Case { nominative, genitive, dative, accusative, instrumental, locative, vocative }
enum Numberr { singular, dual, plural }
enum Person { first, second, third }
enum Tense { present, future, past }
enum Aspect { progressive, perfective }
enum VerbType { main, auxilary }
enum Mood { indicative, imperative, infinitive, impersonal }
enum Animacy { animate, inanimate }
enum Degree { positive, comparative, superlative }
enum Definiteness { short, full }


interface IAspectInflectable {
  aspect: Aspect;
}
interface ICaseInflectable {
  case: Case;
}
interface INumberInflectable {
  number: Numberr;
}
interface ITenseInflectable {
  tense: Tense;
}
interface IMoodInflectable {
  mood: Mood;
}
interface IPersonInflectable {
  person: Person;
}
interface IGenderInflectable {
  gender: Gender;
}
interface IDegreeInflectable {
  degree: Degree;
}
interface IDefinitenessInflectable {
  definiteness: Definiteness;
}
interface IAnimacyInflectable {
  animacy: Animacy;  //?
}


class Token {
  repr: string;
}


////////////////////////////////////////////////////////////////////////////////
class Noun extends Token implements ICaseInflectable, INumberInflectable {
  case: Case;
  number: Numberr;

  type_: NounType;
  gender_: Gender;
  animacy_: Animacy;
}

////////////////////////////////////////////////////////////////////////////////
class Verb extends Token implements IAspectInflectable, IMoodInflectable, ITenseInflectable,
                                    IPersonInflectable, INumberInflectable, IGenderInflectable {
  aspect: Aspect;
  mood: Mood;
  tense: Tense;
  person: Person;
  number: Numberr;
  gender: Gender;


  type_: VerbType;
}

////////////////////////////////////////////////////////////////////////////////
class Adjective extends Token implements IDegreeInflectable, IGenderInflectable, INumberInflectable,
                                         ICaseInflectable, IDefinitenessInflectable, IAnimacyInflectable {
  degree: Degree;
  gender: Gender;
  number: Numberr;
  case: Case;
  definiteness: Definiteness;
  animacy: Animacy;

}
