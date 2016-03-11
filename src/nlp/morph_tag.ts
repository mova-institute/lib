import {indexTableByColumns} from '../algo';

export enum Pos {
  noun,
  verb,
  adjective,
  adverb,
  transgressive,
  preposition,
  predic,  // todo
  insert,  // todo
  conjunction,
  particle,
  interjection,
  transl,  // todo
  numeral,
};

export enum Pos2 {
  pronoun,
  participle,
  numeral
};


///// Nominal /////

export enum NounType {
  common,
  proper
};

export enum Gender {
  masculine,
  feminine,
  neuter,
  // common,
};

export enum Animacy {
  animate,
  inanimate,
  undefined,  // ?
};

export enum RequiredAnimacy {
  animate,
  inanimate
};


export enum Numberr {
  singular,
  plural,
  dual,
  pluraleTantum,
  // singulareTantum  // людств
};

export enum Case {
  nominative,
  genitive,
  dative,
  accusative,
  instrumental,
  locative,
  vocative,
  // other non-ukr
};

export enum RequiredCase {
  // nominative,
  genitive,
  dative,
  accusative,
  instrumental,
  locative,
};

export enum Degree {
  positive,
  comparative,
  superlative,
  // absoluteSuperlative  // non-ukr?
};

///// Verbal /////
export enum VerbForm {
  participle,  // дієприкм
  transgressive,  // дієприсл
};
export enum Mood {
  indicative,
  imperative,
  infinitive,
  impersonal,
};
export enum Tense { past, present, future };
export enum Aspect { imperfect, perfect };
export enum Voice { active, passive };
export enum Person { first, second, third };
export enum VerbNegative { positive, negative };  // todo
export enum VerbType { main, auxilary };

///// Lexical /////
export enum PronominalType {
  personal,
  demonstrative,
  indefinite,
  possessive,
  interrogative,
  relative,
  reflexive,
  negative,
  general,
  emphatic,
  definitive,  // todo
};

export enum NumeralType {
  
};

export enum Variant {
  short,
  full
};

export enum Style {
  colloquial,
  archaic,
  rare,
  slang,
};

export enum ConjunctionType { 
  coordinating,
  subordinating
};

export enum NumberTantum {
  noPlural,
  noSingular
};

export enum NameType {
  first,
  last,
  patronym
}

// export enum CaseInflected {
//   yes,
//   no,
// }



export const featureTable = [
  
  { featStr: 'nounType', mte: 'c' },
  { featStr: 'nounType', mte: 'p' },
  
  // { featStr: 'caseInflected', featVesum: CaseInflected, vesum: CaseInflected.no, vesumStr: 'nv' },
  
  { featStr: 'style', featVesum: Style, vesum: Style.rare, vesumStr: 'rare' },
  { featStr: 'style', featVesum: Style, vesum: Style.colloquial, vesumStr: 'coll' },
  { featStr: 'style', featVesum: Style, vesum: Style.slang, vesumStr: 'slang' },
  
  { featStr: 'nameType', featVesum: NameType, vesum: NameType.first, vesumStr: 'fname' },
  { featStr: 'nameType', featVesum: NameType, vesum: NameType.last, vesumStr: 'lname' },
  { featStr: 'nameType', featVesum: NameType, vesum: NameType.patronym, vesumStr: 'patr' },
  
  { featStr: 'animacy', featVesum: Animacy, vesum: Animacy.animate, vesumStr: 'anim', mte: 'y' },
  { featStr: 'animacy', featVesum: Animacy, vesum: Animacy.inanimate, vesumStr: 'inanim', mte: 'n' },
  { featStr: 'animacy', featVesum: Animacy, vesum: Animacy.undefined, vesumStr: 'unanim' },
  
  { featStr: 'requiredAnimacy', featVesum: RequiredAnimacy, vesum: Animacy.animate, vesumStr: 'ranim', mte: 'y' },  // ?
  { featStr: 'requiredAnimacy', featVesum: RequiredAnimacy, vesum: Animacy.inanimate, vesumStr: 'rinanim', mte: 'n' },  // ?

  { featStr: 'reflexive', vesum: true, vesumStr: 'rev' },  // ?
  
  { featStr: 'case', featVesum: Case, vesum: Case.nominative, vesumStr: 'v_naz', mte: 'n' },
  { featStr: 'case', featVesum: Case, vesum: Case.genitive, vesumStr: 'v_rod', mte: 'g' },
  { featStr: 'case', featVesum: Case, vesum: Case.dative, vesumStr: 'v_dav', mte: 'd' },
  { featStr: 'case', featVesum: Case, vesum: Case.accusative, vesumStr: 'v_zna', mte: 'a' },
  { featStr: 'case', featVesum: Case, vesum: Case.instrumental, vesumStr: 'v_oru', mte: 'i' },
  { featStr: 'case', featVesum: Case, vesum: Case.locative, vesumStr: 'v_mis', mte: 'l' },
  { featStr: 'case', featVesum: Case, vesum: Case.vocative, vesumStr: 'v_kly', mte: 'v' },
  
  { featStr: 'requiredCase', featVesum: RequiredCase, vesum: RequiredCase.genitive, vesumStr: 'rv_rod', mte: 'g' },
  { featStr: 'requiredCase', featVesum: RequiredCase, vesum: RequiredCase.dative, vesumStr: 'rv_dav', mte: 'd' },
  { featStr: 'requiredCase', featVesum: RequiredCase, vesum: RequiredCase.accusative, vesumStr: 'rv_zna', mte: 'a' },
  { featStr: 'requiredCase', featVesum: RequiredCase, vesum: RequiredCase.instrumental, vesumStr: 'rv_oru', mte: 'i' },
  { featStr: 'requiredCase', featVesum: RequiredCase, vesum: RequiredCase.locative, vesumStr: 'rv_mis', mte: 'l' },

  { featStr: 'aspect', featVesum: Aspect, vesum: Aspect.imperfect, vesumStr: 'imperf', mte: 'p' },
  { featStr: 'aspect', featVesum: Aspect, vesum: Aspect.perfect, vesumStr: 'perf', mte: 'e' },

  { featStr: 'tense', featVesum: Tense, vesum: Tense.past, vesumStr: 'past', mte: 's' },
  { featStr: 'tense', featVesum: Tense, vesum: Tense.present, vesumStr: 'pres', mte: 'p' },
  { featStr: 'tense', featVesum: Tense, vesum: Tense.future, vesumStr: 'futr', mte: 'f' },

  { featStr: 'mood', featVesum: Mood, vesum: Mood.imperative, vesumStr: 'impr', mte: 'm' },
  { featStr: 'mood', featVesum: Mood, vesum: Mood.infinitive, vesumStr: 'inf', mte: 'n' },
  { featStr: 'mood', featVesum: Mood, vesum: Mood.impersonal, vesumStr: 'impers', mte: 'o' },

  { featStr: 'voice', featVesum: Voice, vesum: Voice.active, vesumStr: 'actv', mte: 'a' },
  { featStr: 'voice', featVesum: Voice, vesum: Voice.passive, vesumStr: 'pasv', mte: 'p' },

  { featStr: 'degree', featVesum: Degree, vesum: Degree.positive, vesumStr: 'compb', mte: 'p' },
  { featStr: 'degree', featVesum: Degree, vesum: Degree.comparative, vesumStr: 'compr', mte: 'c' },
  { featStr: 'degree', featVesum: Degree, vesum: Degree.superlative, vesumStr: 'super', mte: 's' },

  { featStr: 'variant', featVesum: Variant, vesum: Variant.short, vesumStr: 'short', mte: 's' },
  { featStr: 'variant', featVesum: Variant, vesum: Variant.full, vesumStr: 'uncontr', mte: 'f' },

  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.personal, vesumStr: 'pers', mte: 'p' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.reflexive, vesumStr: 'refl', mte: 'x' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.possessive, vesumStr: 'pos', mte: 's' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.demonstrative, vesumStr: 'dem', mte: 'd' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.interrogative, vesumStr: 'int', mte: 'q' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.relative, vesumStr: 'rel', mte: 'r' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.negative, vesumStr: 'neg', mte: 'z' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.indefinite, vesumStr: 'ind', mte: 'i' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.general, vesumStr: 'gen', mte: 'g' },
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.definitive, vesumStr: 'def', mte: '?' },  // todo
  { featStr: 'pronominalType', featVesum: PronominalType, vesum: PronominalType.emphatic, vesumStr: 'emph', mte: 'h' },

  { featStr: 'сonjunctionType', featVesum: ConjunctionType, vesum: ConjunctionType.coordinating, vesumStr: 'coord', mte: 'c' },
  { featStr: 'сonjunctionType', featVesum: ConjunctionType, vesum: ConjunctionType.subordinating, vesumStr: 'subord', mte: 's' },

  { featStr: 'pos', featVesum: Pos, vesum: Pos.noun, vesumStr: 'noun', mte: 'N' },
  { featStr: 'pos', mte: 'P' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.verb, vesumStr: 'verb', mte: 'V' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.adjective, vesumStr: 'adj', mte: 'A' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.adverb, vesumStr: 'adv', mte: 'R' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.transgressive, vesumStr: 'advp' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.preposition, vesumStr: 'prep', mte: 'S' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.predic, vesumStr: 'predic' },  // ?
  { featStr: 'pos', featVesum: Pos, vesum: Pos.insert, vesumStr: 'insert' },  // ?
  { featStr: 'pos', featVesum: Pos, vesum: Pos.transl, vesumStr: 'transl' },  // ?
  { featStr: 'pos', featVesum: Pos, vesum: Pos.conjunction, vesumStr: 'conj', mte: 'C' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.particle, vesumStr: 'part', mte: 'Q' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.interjection, vesumStr: 'excl', mte: 'I' },
  { featStr: 'pos', featVesum: Pos, vesum: Pos.numeral, vesumStr: 'numr', mte: 'M' },
  
  { featStr: 'pos2', featVesum: Pos2, vesum: Pos2.numeral, vesumStr: '&numr' },
  { featStr: 'pos2', featVesum: Pos2, vesum: Pos2.participle, vesumStr: '&adjp' },
  { featStr: 'pos2', featVesum: Pos2, vesum: Pos2.pronoun, vesumStr: '&pron' },

  { featStr: 'gender', featVesum: Gender, vesum: Gender.masculine, vesumStr: 'm', mte: 'm' },
  { featStr: 'gender', featVesum: Gender, vesum: Gender.feminine, vesumStr: 'f', mte: 'f' },
  { featStr: 'gender', featVesum: Gender, vesum: Gender.neuter, vesumStr: 'n', mte: 'n' },

  { featStr: 'number', featVesum: Numberr, vesum: Numberr.plural, vesumStr: 'p', mte: 'p' },
  { featStr: 'number', featVesum: Numberr, vesum: Numberr.singular, vesumStr: 's', mte: 's' },

  { featStr: 'person', featVesum: Person, vesum: Person.first, vesumStr: '1', mte: '1' },
  { featStr: 'person', featVesum: Person, vesum: Person.second, vesumStr: '2', mte: '2' },
  { featStr: 'person', featVesum: Person, vesum: Person.third, vesumStr: '3', mte: '3' },

  { featStr: 'numberTantum', featVesum: NumberTantum, vesum: NumberTantum.noPlural, vesumStr: 'np' },
  { featStr: 'numberTantum', featVesum: NumberTantum, vesum: NumberTantum.noSingular, vesumStr: 'ns' },
];

export const mteFeatures = {
  'N': [NounType, Gender, Numberr, Case, Animacy],
  'V': [VerbType, Aspect, VerbForm, Tense, Person, Numberr, Gender],
  // 'A': [null, Degree, Gender, Numberr, Case, Definiteness, Animacy, Aspect, Voice, Tense],
  'P': [PronominalType, null, Person, Gender, Animacy, Numberr, Case, null],
  'R': [Degree],
  'S': [null, null, Case],
  'C': [ConjunctionType, null],
  'M': [NumeralType, ],
  '': [],
};


export const MAP_VESUM_FEAT = indexTableByColumns(featureTable, ['featStr', 'vesum']);
export const MAP_VESUM: Map<string, any> =
  indexTableByColumns(featureTable.filter((x: any) => x.vesum !== undefined), ['vesumStr']);


// console.log(MAP_VESUM);


////////////////////////////////////////////////////////////////////////////////
// represents a single unambiguous morphological interpretation
export class MorphTag {
  private static otherFlagsAllowed = new Set([
    'xp1', 'xp2', 'xp3', 'xp4', 'xp5', 'xp6', 'xp7',
    'xv1', 'xv2', 'xv3', 'xv4', 'xv5', 'xv6', 'xv7',
    'nv', 'alt', 'bad', 'abbr', 'v-u', 'dimin']);
  
  pos: Pos;
  pos2: Pos2;
  case: Case;
  requiredCase: RequiredCase;
  number: Numberr;
  aspect: Aspect;
  tense: Tense;
  mood: Mood;
  person: Person;
  voice: Voice;
  animacy: Animacy;
  requiredAnimacy: RequiredAnimacy;
  gender: Gender;
  degree: Degree;
  variant: Variant;
  pronominalType: PronominalType;
  numberTantum: NumberTantum;
  reflexive: boolean;
  style: Style;
  
  otherFlags = new Set<string>();
  
  
  static fromVesum(tag: string, lemma?: string) {
    let ret = new MorphTag();
    
    for (let flag of tag.split(':')) {
      let row = MAP_VESUM.get(flag);
      if (row) {
        ret[row.featStr] = row.vesum;
      }
      else {
        if (MorphTag.otherFlagsAllowed.has(flag)) {
          ret.otherFlags.add(flag);
        }
        else {
          throw new Error(`Unknow flag "${flag}" in tag "${tag}" lemma ${lemma}`);
        }
      }
    }
    
    if (false && lemma) {
      
    }
    
    return ret;
  }

  toVesum() {
    let flags = [...this.otherFlags];
    
    for (let name in this) {
      let value = this[name];
      if (value !== undefined && value !== null) {
        let flagStr = MAP_VESUM_FEAT.get(name).get(value);
        flags.push(flagStr);
      }
    }
    
    return flags;  // todo: sort
  }
}







//------------------------------------------------------------------------------
function startsWithCapital(str: string) {
  return str && str.charAt(0).toLowerCase() !== str.charAt(0);
}


/*

todo:
- numr
- all string identifiers/symbols to symbol/enum
- verb form/mood

vesum tests:
- conjunction always has type

*/