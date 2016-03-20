import {indexTableByColumns, arr2indexMap, overflowNegative} from '../algo';


export enum Pos {
  noun,
  verb,
  adjective,
  adverb,
  transgressive,
  preposition,
  predicative,  // todo
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
  bacteria,  // ?
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
export enum Tense {
  past,
  present,
  future
};
export enum Aspect {
  imperfect,
  perfect
};
export enum Voice {
  active,
  passive
};
export enum Person {
  first,
  second,
  third
};
export enum VerbNegative {
  positive,
  negative
};  // todo
export enum VerbType {
  main,
  auxilary
};
export enum Reflexive {
  yes
}

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
export enum NumeralForm {
  digit,
  roman,
  letter
};
export enum Variant {
  short,
  full
};
export enum Rarity {
  archaic,
  rare
};
export enum Slang {
  yes
};
export enum Colloquial {
  yes
};
export enum Bad {
  yes
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
};

export enum CaseInflectability {
  no,
};
export enum Alternative {
  yes,
};
export enum VuAlternative {
  yes
};
export enum Abbreviation {
  yes
};
export enum Dimin {
  yes
};
export enum ParadigmOmohnym { };
export enum SemanticOmohnym { };


export const FEATURE_TABLE = [

  { featStr: 'numeralForm', feat: NumeralForm, mi: NumeralForm.digit, mte: 'd' },
  { featStr: 'numeralForm', feat: NumeralForm, mi: NumeralForm.roman, mte: 'r' },
  { featStr: 'numeralForm', feat: NumeralForm, mi: NumeralForm.letter, mte: 'l' },

  { featStr: 'nounType', feat: NounType, mi: NounType.common, mte: 'c' },
  { featStr: 'nounType', feat: NounType, mi: NounType.proper, mte: 'p' },

  { featStr: 'verbType', feat: VerbType, mi: VerbType.main, mte: 'm' },
  { featStr: 'verbType', feat: VerbType, mi: VerbType.auxilary, mte: 'a' },

  { featStr: 'rarity', feat: Rarity, vesum: Rarity.rare, vesumStr: 'rare' },
  { featStr: 'colloquial', feat: Colloquial, vesum: Colloquial.yes, vesumStr: 'coll' },
  { featStr: 'slang', feat: Slang, vesum: Slang.yes, vesumStr: 'slang' },
  { featStr: 'bad', feat: Bad, vesum: Bad.yes, vesumStr: 'bad' },

  { featStr: 'nameType', feat: NameType, vesum: NameType.first, vesumStr: 'fname' },
  { featStr: 'nameType', feat: NameType, vesum: NameType.last, vesumStr: 'lname' },
  { featStr: 'nameType', feat: NameType, vesum: NameType.patronym, vesumStr: 'patr' },

  { featStr: 'animacy', feat: Animacy, vesum: Animacy.animate, vesumStr: 'anim', mte: 'y' },
  { featStr: 'animacy', feat: Animacy, vesum: Animacy.inanimate, vesumStr: 'inanim', mte: 'n' },
  { featStr: 'animacy', feat: Animacy, vesum: Animacy.bacteria, vesumStr: 'unanim' },

  { featStr: 'requiredAnimacy', feat: RequiredAnimacy, vesum: Animacy.animate, vesumStr: 'ranim', mte: 'y' },  // ?
  { featStr: 'requiredAnimacy', feat: RequiredAnimacy, vesum: Animacy.inanimate, vesumStr: 'rinanim', mte: 'n' },  // ?

  { featStr: 'reflexive', feat: Reflexive, vesum: Reflexive.yes, vesumStr: 'rev' },  // ?

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

  { featStr: 'variant', feat: Variant, vesum: Variant.short, vesumStr: 'short', mte: 's' },
  { featStr: 'variant', feat: Variant, vesum: Variant.full, vesumStr: 'uncontr', mte: 'f' },

  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.personal, vesumStr: 'pers', mte: 'p' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.reflexive, vesumStr: 'refl', mte: 'x' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.possessive, vesumStr: 'pos', mte: 's' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.demonstrative, vesumStr: 'dem', mte: 'd' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.interrogative, vesumStr: 'int', mte: 'q' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.relative, vesumStr: 'rel', mte: 'r' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.negative, vesumStr: 'neg', mte: 'z' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.indefinite, vesumStr: 'ind', mte: 'i' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.general, vesumStr: 'gen', mte: 'g' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.definitive, vesumStr: 'def', mte: '?' },  // todo
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.emphatic, vesumStr: 'emph', mte: 'h' },

  { featStr: 'сonjunctionType', feat: ConjunctionType, vesum: ConjunctionType.coordinating, vesumStr: 'coord', mte: 'c' },
  { featStr: 'сonjunctionType', feat: ConjunctionType, vesum: ConjunctionType.subordinating, vesumStr: 'subord', mte: 's' },

  { featStr: 'pos', feat: Pos, vesum: Pos.noun, vesumStr: 'noun', mte: 'N' },
  { featStr: 'pos', mte: 'P' },
  { featStr: 'pos', feat: Pos, vesum: Pos.verb, vesumStr: 'verb', mte: 'V' },
  { featStr: 'pos', feat: Pos, vesum: Pos.adjective, vesumStr: 'adj', mte: 'A' },
  { featStr: 'pos', feat: Pos, vesum: Pos.adverb, vesumStr: 'adv', mte: 'R' },
  { featStr: 'pos', feat: Pos, vesum: Pos.transgressive, vesumStr: 'advp' },
  { featStr: 'pos', feat: Pos, vesum: Pos.preposition, vesumStr: 'prep', mte: 'S' },
  { featStr: 'pos', feat: Pos, vesum: Pos.predicative, vesumStr: 'predic' },  // ?
  { featStr: 'pos', feat: Pos, vesum: Pos.insert, vesumStr: 'insert' },  // ?
  { featStr: 'pos', feat: Pos, vesum: Pos.transl, vesumStr: 'transl' },  // ?
  { featStr: 'pos', feat: Pos, vesum: Pos.conjunction, vesumStr: 'conj', mte: 'C' },
  { featStr: 'pos', feat: Pos, vesum: Pos.particle, vesumStr: 'part', mte: 'Q' },
  { featStr: 'pos', feat: Pos, vesum: Pos.interjection, vesumStr: 'excl', mte: 'I' },
  { featStr: 'pos', feat: Pos, vesum: Pos.numeral, vesumStr: 'numr', mte: 'M' },

  { featStr: 'pos2', feat: Pos2, vesum: Pos2.numeral, vesumStr: '&numr' },
  { featStr: 'pos2', feat: Pos2, vesum: Pos2.participle, vesumStr: '&adjp' },
  { featStr: 'pos2', feat: Pos2, vesum: Pos2.pronoun, vesumStr: '&pron' },

  { featStr: 'gender', feat: Gender, vesum: Gender.masculine, vesumStr: 'm', mte: 'm' },
  { featStr: 'gender', feat: Gender, vesum: Gender.feminine, vesumStr: 'f', mte: 'f' },
  { featStr: 'gender', feat: Gender, vesum: Gender.neuter, vesumStr: 'n', mte: 'n' },

  { featStr: 'number', feat: Numberr, vesum: Numberr.plural, vesumStr: 'p', mte: 'p' },
  { featStr: 'number', feat: Numberr, vesum: Numberr.singular, vesumStr: 's', mte: 's' },

  { featStr: 'person', feat: Person, vesum: Person.first, vesumStr: '1', mte: '1' },
  { featStr: 'person', feat: Person, vesum: Person.second, vesumStr: '2', mte: '2' },
  { featStr: 'person', feat: Person, vesum: Person.third, vesumStr: '3', mte: '3' },

  { featStr: 'numberTantum', feat: NumberTantum, vesum: NumberTantum.noPlural, vesumStr: 'np' },
  { featStr: 'numberTantum', feat: NumberTantum, vesum: NumberTantum.noSingular, vesumStr: 'ns' },

  { featStr: 'caseInflectability', feat: CaseInflectability, vesum: CaseInflectability.no, vesumStr: 'nv' },

  { featStr: 'alternative', feat: Alternative, vesum: Alternative.yes, vesumStr: 'alt' },

  { featStr: 'abbreviation', feat: Abbreviation, vesum: Abbreviation.yes, vesumStr: 'abbr' },
  
  { featStr: 'vuAlternatibe', feat: VuAlternative, vesum: VuAlternative.yes, vesumStr: 'v-u' },
  
  { featStr: 'dimin', feat: Dimin, vesum: Dimin.yes, vesumStr: 'dimin' },
];

export const MTE_FEATURES = {
  'N': [Pos.noun, NounType, Gender, Numberr, Case, Animacy],  // todo: common gender
  'V': [null, VerbType, Aspect, Mood, Tense, Person, Numberr, Gender],
  'A': [Pos.adjective, null, Degree, Gender, Numberr, Case, null, RequiredAnimacy, Aspect, Voice, Tense],
  'P': [null, PronominalType, null, Person, Gender, RequiredAnimacy, Numberr, Case, null],
  'R': [Pos.adverb, Degree],
  'S': [Pos.preposition, null, null, Case],
  'C': [Pos.conjunction, ConjunctionType, null],
  'M': [null, null, null, Gender, Numberr, Case, RequiredAnimacy],
  'Q': [Pos.particle],
  'I': [Pos.interjection],
};


export const MAP_VESUM_FEAT = indexTableByColumns(FEATURE_TABLE, ['featStr', 'vesum']);
const MAP_VESUM: Map<string, any> =
  indexTableByColumns(FEATURE_TABLE.filter((x: any) => x.vesum !== undefined), ['vesumStr']);
export const MAP_MTE: Map<string, any> = indexTableByColumns(FEATURE_TABLE, ['feat', 'mte']);

export const FEAT_MAP_STRING = new Map<Object, string>();
for (let row of FEATURE_TABLE) {
  if (row.feat && row.featStr) {
    FEAT_MAP_STRING.set(row.feat, row.featStr);
  }
}

////////////////////////////////////////////////////////////////////////////////
// represents a single unambiguous morphological interpretation
export class MorphTag {
  private static otherFlagsAllowed = new Set([
    'xp1', 'xp2', 'xp3', 'xp4', 'xp5', 'xp6', 'xp7',
    'xv1', 'xv2', 'xv3', 'xv4', 'xv5', 'xv6', 'xv7',
    'nv', 'alt', 'bad', 'abbr', 'v-u', 'dimin', 'transl']);

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
  verbType: VerbType;
  numeralForm: NumeralForm;
  сonjunctionType: ConjunctionType;

  nounType: NounType;

  otherFlags = new Set<string>();



  static fromVesum(flags: string[], lemma?: string) {
    let ret = new MorphTag();

    for (let flag of flags) {
      let row = tryMapVesumFlag(flag);
      if (row) {
        ret[row.featStr] = row.vesum;
      }
      else {
        if (MorphTag.otherFlagsAllowed.has(flag)) {
          ret.otherFlags.add(flag);
        }
        else {
          throw new Error(`Unknow flag "${flag}" in tag "${flags.join(':')}" lemma ${lemma}`);
        }
      }
    }

    if (false && lemma) {

    }

    return ret;
  }

  static fromVesumStr(tag: string, lemma?: string) {
    return MorphTag.fromVesum(tag.split(':'), lemma);
  }

  static fromMte(tag: string) {
    let ret = new MorphTag();

    let flags = [...tag];
    ret._fromMte(flags);  // read all injections

    switch (flags[0]) {  // then tweak what's left
      case 'V':
        ret.pos = flags[3] === 'g' ? Pos.transgressive : Pos.verb;
        break;

      case 'A':
        if (flags[1] === 'p') {
          ret.pos2 = Pos2.participle;
        }

        if (ret.gender === Gender.masculine) {
          if (flags[6] === 's') {
            ret.variant = Variant.short;
          }
        }
        else if (flags[6] === 'f') {
          ret.variant = Variant.full;
        }
        break;

      case 'P': // todo: Referent_Type
        ret.pos2 = Pos2.pronoun;
        switch (flags[8]) {
          case 'n':
            ret.pos = Pos.noun;
            break;
          case 'a':
            ret.pos = Pos.adjective;
            break;
          case 'r':
            ret.pos = Pos.adverb;
            break;
          case 'm':
            ret.pos = Pos.numeral;
            break;
          default:
            throw new Error(`Unknown MTE pronoun Syntactic_Type: "${flags[8]}"`);
        }
        break;

      case 'M':
        if (flags[2] === 'o') {
          ret.pos = Pos.adjective;
          ret.pos2 = Pos2.numeral;
        }
        else if (flags[2] === 'c') {
          ret.pos = Pos.numeral;
        }
        break;

      case 'N':
      case 'R':
      case 'S':
      case 'C':
      case 'Q':
      case 'I':
        break;

      default:
        throw new Error(`Unknown MTE POS: ${flags[0]}`);
    }

    return ret;
  }

  private _fromMte(mteFlags: string[]) {
    let posFeatures = MTE_FEATURES[mteFlags[0]];

    if (posFeatures[0] !== null) {
      this.pos = posFeatures[0];
    }
    for (let i = 1; i < posFeatures.length && i < mteFlags.length; ++i) {
      let feature = posFeatures[i];
      let mteFlag = mteFlags[i];

      if (feature && mteFlag !== '-') {
        let row = MAP_MTE.get(feature).get(mteFlag);
        if (row) {
          // if (!(row.featStr in this)) {
          //   throw new Error(`${row.featStr} not in this`);
          // }
          this[row.featStr] = ('vesum' in row) ? row.vesum : row.mi;
          if (this[row.featStr] === undefined) {
            throw new Error(`Cannot map ${mteFlags.join('')}`);
          }
        }
      }
    }
  }

  toVesum() {
    let flags = [...this.otherFlags];

    for (let name in this) {
      let value = this[name];
      if (value !== null) {
        let flag = mapVesumFeatureValue(name, value);
        if (flag) {
          flags.push(flag);
        }
      }
    }

    return flags.sort(createVesumFlagComparator(this.pos));
  }

  toVesumStr() {
    return this.toVesum().join(':');
  }
}



export const FEATURE_ORDER = {
  [Pos.noun]: [
    Pos,
    Animacy,
    Gender,
    Numberr,
    Case,
    CaseInflectability,
    NumberTantum,
    Alternative,
    NameType,
    Pos2,
    PronominalType,
    Colloquial,
    Bad,
  ],
  [Pos.adjective]: [
    Pos,
    Gender,
    Numberr,
    Case,
    RequiredAnimacy,
    Variant,
    Degree,  
  ],
  [Pos.verb]: [
    Pos,
    Reflexive,
    Voice,
    Aspect,
    Tense,
    Mood,
    Numberr,
    Person,
    Gender,
    Dimin,
    VuAlternative,
    Rarity,
    Colloquial,
  ],
  [Pos.numeral]: [
    Pos,
    Gender,
    Numberr,
    Case,
    CaseInflectability,
    Pos2,
    PronominalType,
  ],
  [Pos.transgressive]: [
    Pos,
    Reflexive,
    Voice,
    Aspect,
    Alternative,
  ],
  other: [  // todo check
    Pos,
    Degree,
    ConjunctionType,
    Case, RequiredCase,
    RequiredAnimacy,
    CaseInflectability,
    Alternative,
    NumberTantum,
    ParadigmOmohnym,
    SemanticOmohnym,
    NameType,
    Pos2,
    PronominalType,
    Person,
    Rarity,
  ]
};

const common = [  // todo
  Rarity,
];

////////////////////////////////////////////////////////////////////////////////
export function createVesumFlagComparator(pos: Pos) {
  return (a: string, b: string) => {
    let rowA = tryMapVesumFlag(a);
    let rowB = tryMapVesumFlag(b);
    if (rowA && rowB) {
      let featA = rowA.feat;
      let featB = rowB.feat;
      
      let order = FEATURE_ORDER[pos] || FEATURE_ORDER.other;
      return overflowNegative(order.indexOf(featA)) - overflowNegative(order.indexOf(featB));
    }

    // return a.localeCompare(b);
    return Number.MAX_SAFE_INTEGER;
  }
}

////////////////////////////////////////////////////////////////////////////////
export function tryMapVesumFlag(value: string) {
  let match = /^x[vp](\d+)$/.exec(value);
  if (match) {
    return {
      featStr: value.charAt(1) === 'p' ? 'paradigmOmohnym' : 'semanticOmohnym',
      feat: value.charAt(1) === 'p' ? ParadigmOmohnym : SemanticOmohnym,
      vesum: Number.parseInt(match[1]),
      vesumStr: value
    };
  }

  let ret = MAP_VESUM.get(value);
  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function mapVesumFlag(value: string) {
  let ret = tryMapVesumFlag(value);
  if (!ret) {
    throw new Error(`Unknown flag: ${value}`)
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function tryMapVesumFlagToFeature(value: string) {
  let row = tryMapVesumFlag(value);
  if (row && row.feat) {
    return row.feat;
  }

  return null;
}

////////////////////////////////////////////////////////////////////////////////
export function mapVesumFeatureValue(featureName: string, value) {
  if (featureName === 'paradigmOmohnym') {
    return 'xp' + value;
  }
  if (featureName === 'semanticOmohnym') {
    return 'xv' + value;
  }

  let featMap = MAP_VESUM_FEAT.get(featureName);
  if (featMap) {
    let row = featMap.get(value);
    if (row && row.vesumStr) {
      return row.vesumStr;
    }
  }

  return null;
}

//------------------------------------------------------------------------------
function startsWithCapital(str: string) {
  return str && str.charAt(0).toLowerCase() !== str.charAt(0);
}