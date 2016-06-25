import { indexTableByColumns, overflowNegative } from '../algo';
import { isOddball, compare, zipLongest } from '../lang';

export enum Pos {
  noun,
  verb,
  adjective,
  adverb,
  transgressive,
  preposition,
  predicative,  // todo
  // insert,  // todo
  conjunction,
  particle,
  interjection,
  transl,  // todo
  numeral,
  error,
  x,
}
// export enum Pos2 {
//   pronoun,
//   participle,
//   numeral,
//   noun,
// }

export enum Pronoun {
  yes,
}
export enum Participle {
  yes,
}
export enum OrdinalNumeral {
  yes,
}
export enum AdjectiveNoun {
  yes,
}


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
export enum RequiredAnimacy {
  animate,
  inanimate,
}
export enum Numberr {
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
  // nominative,
  genitive,
  dative,
  accusative,
  instrumental,
  locative,
}
export enum Degree {
  positive,
  comparative,
  superlative,
  // absoluteSuperlative  // non-ukr?
}

///// Verbal /////
export enum VerbForm {
  participle,  // дієприкм
  transgressive,  // дієприсл
}
export enum Mood {
  indicative,
  imperative,
  infinitive,
  impersonal,
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
  first,
  second,
  third,
}
export enum VerbNegative {
  positive,
  negative,
}  // todo
export enum VerbType {
  main,
  auxilary,
}
export enum Reflexivity {
  yes,
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
}
export enum NumeralForm {
  digit,
  roman,
  letter,
}
export enum Variant {
  short,
  full,
}
export enum Rarity {
  archaic,
  rare,
}
export enum Slang {
  yes,
}
export enum Colloquial {
  yes,
}
export enum Bad {
  yes,
}
export enum ConjunctionType {
  coordinating,
  subordinating,
}
export enum NumberTantum {
  noPlural,
  noSingular,
}
export enum NameType {
  first,
  last,
  patronym,
}

export enum CaseInflectability {
  no,
}
export enum Alternativity {
  yes,
}
export enum VuAlternativity {
  yes,
}
export enum Abbreviation {
  yes,
}
export enum Dimin {
  yes,
}
export enum Possessiveness {
  yes,
}
export enum ParadigmOmohnym { }
export enum SemanticOmohnym { }
export enum Beforedash {
  yes,
}
export enum Auto {
  yes,
}

export enum Oddness {
  yes,
}

export enum OmonymParadigm {
  xp1,
  xp2,
  xp3,
  xp4,
  xp5,
  xp6,
  xp7,
  xp8,
  xp9,
}

export const FEATURE_TABLE = [

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
  { featStr: 'bad', feat: Bad, vesum: Bad.yes, vesumStr: 'bad' },

  { featStr: 'nameType', feat: NameType, vesum: NameType.first, vesumStr: 'fname' },
  { featStr: 'nameType', feat: NameType, vesum: NameType.last, vesumStr: 'lname' },
  { featStr: 'nameType', feat: NameType, vesum: NameType.patronym, vesumStr: 'patr' },

  { featStr: 'animacy', feat: Animacy, vesum: Animacy.animate, vesumStr: 'anim', mte: 'y' },
  { featStr: 'animacy', feat: Animacy, vesum: Animacy.inanimate, vesumStr: 'inanim', mte: 'n' },
  { featStr: 'animacy', feat: Animacy, vesum: Animacy.bacteria, vesumStr: 'unanim' },

  { featStr: 'requiredAnimacy', feat: RequiredAnimacy, vesum: Animacy.animate, vesumStr: 'ranim', mte: 'y' },  // ?
  { featStr: 'requiredAnimacy', feat: RequiredAnimacy, vesum: Animacy.inanimate, vesumStr: 'rinanim', mte: 'n' },  // ?

  { featStr: 'reflexive', feat: Reflexivity, vesum: Reflexivity.yes, vesumStr: 'rev' },  // ?

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
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.demonstrative, vesumStr: 'dem', mte: 'd' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.interrogative, vesumStr: 'int', mte: 'q' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.relative, vesumStr: 'rel', mte: 'r' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.negative, vesumStr: 'neg', mte: 'z' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.indefinite, vesumStr: 'ind', mte: 'i' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.general, vesumStr: 'gen', mte: 'g' },
  { featStr: 'pronominalType', feat: PronominalType, vesum: PronominalType.emphatic, vesumStr: 'emph', mte: 'h' },
  { featStr: 'pronominalType', feat: null, mte: 's' },

  { featStr: 'conjunctionType', feat: ConjunctionType, vesum: ConjunctionType.coordinating, vesumStr: 'coord', mte: 'c' },
  { featStr: 'conjunctionType', feat: ConjunctionType, vesum: ConjunctionType.subordinating, vesumStr: 'subord', mte: 's' },

  { featStr: 'pos', feat: Pos, vesum: Pos.noun, vesumStr: 'noun', mte: 'N' },
  { featStr: 'pos', feat: null, mte: 'P' },
  { featStr: 'pos', feat: Pos, vesum: Pos.verb, vesumStr: 'verb', mte: 'V' },
  { featStr: 'pos', feat: Pos, vesum: Pos.adjective, vesumStr: 'adj', mte: 'A' },
  { featStr: 'pos', feat: Pos, vesum: Pos.adverb, vesumStr: 'adv', mte: 'R' },
  { featStr: 'pos', feat: Pos, vesum: Pos.transgressive, vesumStr: 'advp' },
  { featStr: 'pos', feat: Pos, vesum: Pos.preposition, vesumStr: 'prep', mte: 'S' },
  { featStr: 'pos', feat: Pos, vesum: Pos.predicative, vesumStr: 'predic' },  // ?
  // { featStr: 'pos', feat: Pos, vesum: Pos.insert, vesumStr: 'insert' },  // ?
  { featStr: 'pos', feat: Pos, vesum: Pos.transl, vesumStr: 'transl' },  // ?
  { featStr: 'pos', feat: Pos, vesum: Pos.conjunction, vesumStr: 'conj', mte: 'C' },
  { featStr: 'pos', feat: Pos, vesum: Pos.particle, vesumStr: 'part', mte: 'Q' },
  { featStr: 'pos', feat: Pos, vesum: Pos.interjection, vesumStr: 'intj', mte: 'I' },
  { featStr: 'pos', feat: Pos, vesum: Pos.numeral, vesumStr: 'numr', mte: 'M' },
  { featStr: 'pos', feat: Pos, vesum: Pos.error, vesumStr: 'error' },
  { featStr: 'pos', feat: Pos, vesum: Pos.x, vesumStr: 'x', mte: 'X' },

  { featStr: 'pronoun', feat: Pronoun, vesum: Pronoun.yes, vesumStr: '&pron' },
  { featStr: 'participle', feat: Participle, vesum: Participle.yes, vesumStr: '&adjp' },
  { featStr: 'ordinalNumeral', feat: OrdinalNumeral, vesum: OrdinalNumeral.yes, vesumStr: '&numr' },
  { featStr: 'adjectiveNoun', feat: AdjectiveNoun, vesum: AdjectiveNoun.yes, vesumStr: '&noun' },

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

  { featStr: 'alternative', feat: Alternativity, vesum: Alternativity.yes, vesumStr: 'alt' },

  { featStr: 'abbreviation', feat: Abbreviation, vesum: Abbreviation.yes, vesumStr: 'abbr' },

  { featStr: 'vuAlternatibe', feat: VuAlternativity, vesum: VuAlternativity.yes, vesumStr: 'v-u' },

  { featStr: 'dimin', feat: Dimin, vesum: Dimin.yes, vesumStr: 'dimin' },

  { featStr: 'poss', feat: Possessiveness, vesum: Possessiveness.yes, vesumStr: 'pos' },

  { featStr: 'auto', feat: Auto, vesum: Auto.yes, vesumStr: 'auto' },

  { featStr: 'beforedash', feat: Beforedash, vesum: Beforedash.yes, vesumStr: 'beforedash' },

  { featStr: 'oddness', feat: Oddness, vesum: Oddness.yes, vesumStr: 'odd' },

  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp1, vesumStr: 'xp1' },
  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp2, vesumStr: 'xp2' },
  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp3, vesumStr: 'xp3' },
  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp4, vesumStr: 'xp4' },
  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp5, vesumStr: 'xp5' },
  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp6, vesumStr: 'xp6' },
  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp7, vesumStr: 'xp7' },
  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp8, vesumStr: 'xp8' },
  { featStr: 'omonymParadigm', feat: OmonymParadigm, vesum: OmonymParadigm.xp9, vesumStr: 'xp9' },
];

export const MTE_FEATURES = {
  'N': [Pos.noun, NounType, Gender, Numberr, Case, Animacy],  // todo: common gender
  'V': [null, VerbType, Aspect, Mood, Tense, Person, Numberr, Gender],
  'A': [Pos.adjective, null, Degree, Gender, Numberr, Case, null, RequiredAnimacy, Aspect, Voice, Tense],
  'P': [null, PronominalType, null, Person, Gender, RequiredAnimacy, Numberr, Case, null],
  'R': [Pos.adverb, Degree],
  'S': [Pos.preposition, null, null, RequiredCase],
  'C': [Pos.conjunction, ConjunctionType, null],
  'M': [Pos.numeral, NumeralForm, null, Gender, Numberr, Case, RequiredAnimacy],
  'Q': [Pos.particle],
  'I': [Pos.interjection],
  'X': [Pos.x],
};


export const MAP_VESUM_FEAT = indexTableByColumns(FEATURE_TABLE, ['featStr', 'vesum']);
const MAP_VESUM: Map<string, any> =
  indexTableByColumns(FEATURE_TABLE.filter((x: any) => x.vesum !== undefined), ['vesumStr']);
export const MAP_MTE: Map<string, any> = indexTableByColumns(FEATURE_TABLE, ['feat', 'mte']);

//export const FEAT_MAP_STRING = new Map<Object, string>(
//FEATURE_TABLE.filter(row => row.feat && !!row.featStr).map(x => [x.feat, x.featStr]));
// todo: follow https://github.com/Microsoft/TypeScript/issues/7799

export const FEAT_MAP_STRING = new Map<Object, string>();
export const STRING_MAP_FEAT = new Map<Object, string>();
for (let row of FEATURE_TABLE) {
  if (row.feat && row.featStr) {
    FEAT_MAP_STRING.set(row.feat, row.featStr);
    STRING_MAP_FEAT.set(row.featStr, row.feat);
  }
}

export class Features {
  pos: Pos = null;
  pronoun: Pronoun = null;
  participle: Participle = null;
  ordinalNumeral: OrdinalNumeral = null;
  adjectiveNoun: AdjectiveNoun = null;
  case: Case = null;
  requiredCase: RequiredCase = null;
  number: Numberr = null;
  aspect: Aspect = null;
  tense: Tense = null;
  mood: Mood = null;
  person: Person = null;
  voice: Voice = null;
  animacy: Animacy = null;
  requiredAnimacy: RequiredAnimacy = null;
  gender: Gender = null;
  degree: Degree = null;
  variant: Variant = null;
  pronominalType: PronominalType = null;
  numberTantum: NumberTantum = null;
  reflexive: Reflexivity = null;
  verbType: VerbType = null;
  numeralForm: NumeralForm = null;
  conjunctionType: ConjunctionType = null;
  nounType: NounType = null;
  auto: Auto = null;
  beforedash: Beforedash = null;
  oddness: Oddness = null;
  omonymParadigm: OmonymParadigm = null;
}

////////////////////////////////////////////////////////////////////////////////
// represents a single unambiguous morphological interpretation
export class MorphTag {
  private static otherFlagsAllowed = new Set([
    'xv1', 'xv2', 'xv3', 'xv4', 'xv5', 'xv6', 'xv7',
    'nv', 'alt', 'bad', 'abbr', 'v-u', 'dimin', 'mock', 'beforedash', 'foreign',
  ]);


  lemma: string;
  features = new Features();
  otherFlags = new Set<string>();


  static isValidVesumStr(value: string) {  // todo
    try {
      MorphTag.fromVesumStr(value);
      return true;
    }
    catch (e) {
      return false;
    }
  }

  static fromVesum(flags: string[], lemmaFlags?: string[], form?: string, lemma?: string) {
    let ret = new MorphTag();

    for (let flag of flags) {
      let row = tryMapVesumFlag(flag);
      if (row) {
        ret.features[row.featStr] = row.vesum;
      }
      else {
        if (MorphTag.otherFlagsAllowed.has(flag)) {
          ret.otherFlags.add(flag);
        }
        else {
          throw new Error(`Unknow flag "${flag}" in tag "${flags.join(':')}"`);
        }
      }
    }

    if (lemmaFlags) {
      let lemmaTag = MorphTag.fromVesum(lemmaFlags);

      // gender for plural
      if (ret.features.pos === Pos.noun) {
        if (ret.features.number === Numberr.plural && !isOddball(lemmaTag.features.gender)) {
          ret.features.gender = lemmaTag.features.gender;
        }
      }
    }

    if (form && ret.features.pos === Pos.transgressive) {
      if (/ши(сь)?/.test(form)) {
        ret.features.tense = Tense.past;
      }
      else if (/чи(сь)?/.test(form)) {
        ret.features.tense = Tense.present;
      }
      else {
        throw new Error(`Unexpected adverb "${form}" flection`);
      }
    }

    ret.lemma = lemma;

    return ret;
  }

  static fromVesumStr(flags: string, lemmaTag?: string, form?: string, lemma?: string) {
    return MorphTag.fromVesum(flags.split(':'), lemmaTag && lemmaTag.split(':'), form, lemma);
  }

  static fromMte(tag: string, form?: string) {
    let ret = new MorphTag();

    let flags = [...tag];
    ret.fromMte(flags);  // read all injections

    switch (flags[0]) {  // then tweak what's left
      case 'V': {
        if (form && (form.endsWith('ся') || form.endsWith('сь'))) {
          ret.features.reflexive = Reflexivity.yes;
        }
        ret.features.pos = flags[3] === 'g' ? Pos.transgressive : Pos.verb;
        break;
      }

      case 'A':
        if (flags[1] === 'p') {
          ret.features.participle = Participle.yes;
        }

        if (ret.features.gender === Gender.masculine) {
          if (flags[6] === 's') {
            ret.features.variant = Variant.short;
          }
        }
        else if (flags[6] === 'f') {
          ret.features.variant = Variant.full;
        }
        break;

      case 'P': // todo: Referent_Type
        ret.features.pronoun = Pronoun.yes;
        switch (flags[8]) {
          case 'n':
            ret.features.pos = Pos.noun;
            break;
          case 'a':
            ret.features.pos = Pos.adjective;
            break;
          case 'r':
            ret.features.pos = Pos.adverb;
            break;
          case 'm':
            ret.features.pos = Pos.numeral;
            break;
          default:
            throw new Error(`Unknown MTE pronoun Syntactic_Type: "${flags[8]}"`);
        }
        break;

      case 'M':
        if (flags[2] === 'o') {
          ret.features.pos = Pos.adjective;
          ret.features.ordinalNumeral = OrdinalNumeral.yes;
        }
        else if (flags[2] === 'c') {
          ret.features.pos = Pos.numeral;
        }
        break;

      case 'N':
      case 'R':
      case 'S':
      case 'C':
      case 'Q':
      case 'I':
      case 'X':
        break;

      default:
        throw new Error(`Unknown MTE POS: ${flags[0]}`);
    }

    // kill redundant info
    if (!isOddball(ret.features.gender) && ret.features.number === Numberr.singular
      && ret.features.pos !== Pos.numeral && ret.features.ordinalNumeral === null) {
      ret.features.number = null;
    }

    return ret;
  }

  toVesum() {
    let flags = [...this.otherFlags];

    for (let name of Object.keys(this.features)) {
      let value = this.features[name];
      if (value === null
        || this.features.number === Numberr.plural && name === 'gender'
        || this.isTransgressive() && this.isPerfect() && name === 'tense') {
        continue;
      }
      let flag = mapVesumFeatureValue(name, value);
      if (flag) {
        flags.push(flag);
      }
    }

    flags = flags.filter(x => x !== 'letter');  // temp, hack

    return flags.sort(createVesumFlagCompare(this.features.pos));
  }

  toVesumStr() {
    return this.toVesum().join(':');
  }

  toVesumStrMorphInterp() {
    return {
      lemma: this.lemma,
      flags: this.toVesumStr(),
    };
  }

  equals(other: MorphTag) {
    return this.toVesumStr() === other.toVesumStr();
  }

  grammaticallyEquals(other: MorphTag) {
    // todo
  }

  getFeatures() {
    let others = [...this.otherFlags].map(x => {
      let row = mapVesumFlag(x);
      return {
        featureName: row.featStr,
        feature: row.feat,
        value: row.vesum || row.mi,
      };
    });

    let ret = Object.keys(this.features)
      .filter(x => !isOddball(this.features[x]))
      .map(x => ({
        featureName: x,
        feature: STRING_MAP_FEAT.get(x),
        value: this.features[x],
      }));
    ret.push(...others);
    ret.sort(createVesumFlagComparator2(this.features.pos));

    return ret;
  }

  isNoun() { return this.features.pos === Pos.noun; }
  isVerb() { return this.features.pos === Pos.verb; }
  isAdjective() { return this.features.pos === Pos.adjective && this.features.beforedash !== Beforedash.yes; }
  isTransgressive() { return this.features.pos === Pos.transgressive; }

  isPerfect() { return this.features.aspect === Aspect.perfect; }
  isImperfect() { return this.features.aspect === Aspect.imperfect; }
  isFeminine() { return this.features.gender === Gender.feminine; }
  isSingular() { return this.features.number === Numberr.singular; }  // todo: tantum?
  isBeforedash() { return this.features.beforedash === Beforedash.yes; }
  isOdd() { return this.features.oddness === Oddness.yes; }

  hasNumber() { return this.features.number !== null; }

  setIsPerfect(value = true) { this.features.aspect = value ? Aspect.perfect : null; return this; }
  setIsAuto(value = true) { this.features.auto = value ? Auto.yes : null; return this; }

  canBeKharkivSty() {
    return this.isNoun() && this.isFeminine() && (this.isSingular() || !this.hasNumber());
  }

  private fromMte(mteFlags: string[]) {
    let posFeatures = MTE_FEATURES[mteFlags[0]];

    if (posFeatures[0] !== null) {
      this.features.pos = posFeatures[0];
    }
    for (let i = 1; i < posFeatures.length && i < mteFlags.length; ++i) {
      let feature = posFeatures[i];
      let mteFlag = mteFlags[i];

      if (feature && mteFlag !== '-') {
        let row = MAP_MTE.get(feature).get(mteFlag);
        if (row) {
          if (!(row.featStr in this.features)) {
            throw new Error(`${row.featStr} not in this`);
          }
          this.features[row.featStr] = ('vesum' in row) ? row.vesum : row.mi;
          if (this.features[row.featStr] === undefined) {
            throw new Error(`Cannot map ${mteFlags.join('')}`);
          }
        }
      }
    }
  }
}



export const FEATURE_ORDER = {
  [Pos.noun]: [
    Pos,
    Animacy,
    Numberr,
    Gender,
    Case,
    CaseInflectability,
    NumberTantum,
    Alternativity,
    NounType,
    NameType,
    Possessiveness,
    Pronoun,
    PronominalType,
  ],
  [Pos.adjective]: [
    Pos,
    Beforedash,
    Gender,
    Numberr,
    Case,
    RequiredAnimacy,
    Variant,
    Degree,
    Possessiveness,
    CaseInflectability,
    NumberTantum,
    Pronoun,
    Participle,
    AdjectiveNoun,
    Animacy,
    PronominalType,
    Aspect,
    Voice,
  ],
  [Pos.verb]: [
    Pos,
    Reflexivity,
    Voice,
    Aspect,
    Tense,
    Mood,
    Numberr,
    Person,
    Gender,
    Dimin,
    VuAlternativity,
  ],
  [Pos.numeral]: [
    Pos,
    Gender,
    Numberr,
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
  other: [  // todo check
    Pos,
    Degree,
    ConjunctionType,
    Case, RequiredCase,
    RequiredAnimacy,
    CaseInflectability,
    Alternativity,
    NumberTantum,
    ParadigmOmohnym,
    SemanticOmohnym,
    NameType,
    Possessiveness,
    Pronoun,
    Participle,
    OrdinalNumeral,
    AdjectiveNoun,
    PronominalType,
    Person,
  ],
};

for (let pos of Object.keys(FEATURE_ORDER)) {
  FEATURE_ORDER[pos].push(OmonymParadigm, Colloquial, Rarity, Bad, Oddness);
}

////////////////////////////////////////////////////////////////////////////////
export function createVesumFlagCompare(pos: Pos) {
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
  };
}

////////////////////////////////////////////////////////////////////////////////
export function createVesumFlagComparator2(pos: Pos) {
  let order = FEATURE_ORDER[pos] || FEATURE_ORDER.other;
  return (a, b) => {
    return overflowNegative(order.indexOf(a.feature)) - overflowNegative(order.indexOf(b.feature));
  };
}

////////////////////////////////////////////////////////////////////////////////
export function tryMapVesumFlag(value: string) {
  let match = /^x[vp](\d+)$/.exec(value);
  if (match) {
    return {
      featStr: value.charAt(1) === 'p' ? 'paradigmOmohnym' : 'semanticOmohnym',
      feat: value.charAt(1) === 'p' ? ParadigmOmohnym : SemanticOmohnym,
      vesum: Number.parseInt(match[1]),
      vesumStr: value,
    };
  }

  let ret = MAP_VESUM.get(value);
  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function mapVesumFlag(value: string) {
  let ret = tryMapVesumFlag(value);
  if (!ret) {
    throw new Error(`Unknown flag: ${value}`);
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
    if (row) {
      let ret = row.vesumStr || row.miStr;
      if (ret) {
        return ret;
      }
    }
  }

  return null;
}

////////////////////////////////////////////////////////////////////////////////
const featureCompareOrder = new Set([
  Pos,
  AdjectiveNoun,
  Participle,
  Pronoun,
  OrdinalNumeral,
  Animacy,
]);
export function compareTags(a: MorphTag, b: MorphTag) {
  if (a.lemma && b.lemma) {
    let res = a.lemma.localeCompare(b.lemma);
    if (res) {
      return res;
    }
  }
  for (let feature of featureCompareOrder) {
    let prop = FEAT_MAP_STRING.get(feature);
    let res = compare(a.features[prop], b.features[prop]);
    if (res) {
      return res;
    }
  }

  for (let pair of zipLongest(a.getFeatures(), b.getFeatures())) {
    if (pair[0] && pair[1] && pair[0].feature !== pair[1].feature) {
      return 0;
    }
    let res = compare(pair[0] && pair[0].value, pair[1] && pair[1].value);
    if (res) {
      return res;
    }
  }

  return 0;
}
