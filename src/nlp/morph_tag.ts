import {indexTableByColumns} from '../algo';

export enum Pos { // todo
  adjective,
  adposition,
  adverb,
  auxiliaryVerb, // ?
  coordinatingConjunction, // ?
  // determiner,
  interjection,
  noun,
  numeral,
  particle,
  pronoun,
  properNoun,  // ?
  //punctuation,
  subordinatingConjunction, //?
  //symbol
  verb
};

///// Nominal /////
export enum Gender { masculine, feminine, neuter, /*common*/ };
export enum Animacy { animate, inanimate };
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
// export enum VerbType { main, auxilary };

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
  emphatic
}

export enum NumeralType {

}

export enum Variant {
  short,
  full
}

export enum Style {
  colloquial,
  archaic,
  rare,
}


export const featureTable = [
  { feat: 'animacy', featMi: Animacy, mi: Animacy.animate, vesum: 'anim', mte: 'y' },
  { feat: 'animacy', featMi: Animacy, mi: Animacy.inanimate, vesum: 'inanim', mte: 'n' },
  { feat: 'animacy', featMi: Animacy, mi: Animacy.animate, vesum: 'ranim', mte: 'y' },  // ?
  { feat: 'animacy', featMi: Animacy, mi: Animacy.inanimate, vesum: 'rinanim', mte: 'n' },  // ?

  { feat: 'case', featMi: Case, mi: Case.nominative, vesum: 'v_naz', mte: 'n' },
  { feat: 'case', featMi: Case, mi: Case.genitive, vesum: 'v_rod', mte: 'g' },
  { feat: 'case', featMi: Case, mi: Case.dative, vesum: 'v_dav', mte: 'd' },
  { feat: 'case', featMi: Case, mi: Case.accusative, vesum: 'v_zna', mte: 'a' },
  { feat: 'case', featMi: Case, mi: Case.instrumental, vesum: 'v_oru', mte: 'i' },
  { feat: 'case', featMi: Case, mi: Case.locative, vesum: 'v_mis', mte: 'l' },
  { feat: 'case', featMi: Case, mi: Case.vocative, vesum: 'v_kly', mte: 'v' },
  // { feat: 'case', featMi: Case, mi: Case, vesum: 'rv_naz', mte: 'n' }, 	// featMi: Case?
  { feat: 'case', featMi: Case, mi: Case.genitive, vesum: 'rv_rod', mte: 'g' }, 	// featMi: Case?
  { feat: 'case', featMi: Case, mi: Case.dative, vesum: 'rv_dav', mte: 'd' }, 	// featMi: Case?
  { feat: 'case', featMi: Case, mi: Case.accusative, vesum: 'rv_zna', mte: 'a' }, 	// featMi: Case?
  { feat: 'case', featMi: Case, mi: Case.instrumental, vesum: 'rv_oru', mte: 'i' }, 	// featMi: Case?
  { feat: 'case', featMi: Case, mi: Case.locative, vesum: 'rv_mis', mte: 'l' }, 	// featMi: Case?

  { feat: 'aspect', featMi: Aspect, mi: Aspect.imperfect, vesum: 'imperf', mte: 'p' },
  { feat: 'aspect', featMi: Aspect, mi: Aspect.perfect, vesum: 'perf', mte: 'e' },

  { feat: 'tense', featMi: Tense, mi: Tense.past, vesum: 'past', mte: 's' },
  { feat: 'tense', featMi: Tense, mi: Tense.present, vesum: 'pres', mte: 'p' },
  { feat: 'tense', featMi: Tense, mi: Tense.future, vesum: 'futr', mte: 'f' },

  { feat: 'verbForm', featMi: Mood, mi: Mood.imperative, vesum: 'impr', mte: 'm' },
  { feat: 'verbForm', featMi: Mood, mi: Mood.infinitive, vesum: 'inf', mte: 'n' },
  { feat: 'verbForm', featMi: Mood, mi: Mood.impersonal, vesum: 'impers', mte: 'o' },

  { feat: 'voice', featMi: Voice, mi: Voice.active, vesum: 'actv', mte: 'a' },
  { feat: 'voice', featMi: Voice, mi: Voice.passive, vesum: 'pasv', mte: 'p' },

  { feat: 'degree', featMi: Degree, mi: Degree.positive, vesum: 'compb', mte: 'p' },
  { feat: 'degree', featMi: Degree, mi: Degree.comparative, vesum: 'compr', mte: 'c' },
  { feat: 'degree', featMi: Degree, mi: Degree.superlative, vesum: 'super', mte: 's' },

  { feat: 'definiteness', featMi: Variant, mi: Variant.short, vesum: 'short', mte: 's' },
  { feat: 'definiteness', featMi: Variant, mi: Variant.full, vesum: 'uncontr', mte: 'f' },

  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.personal, vesum: 'pers', mte: 'p' },
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.reflexive, vesum: 'refl', mte: 'x' },
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.possessive, vesum: 'pos', mte: 's' },
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.demonstrative, vesum: 'dem', mte: 'd' },
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.interrogative, vesum: 'int', mte: 'q' },
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.relative, vesum: 'rel', mte: 'r' },
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.negative, vesum: 'neg', mte: 'z' },
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.indefinite, vesum: 'ind', mte: 'i' },
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.general, vesum: 'gen', mte: 'g' },
  { feat: 'pronounType', featMi: null, mi: null, vesum: 'def', mte: '?' },  // todo
  { feat: 'pronounType', featMi: PronominalType, mi: PronominalType.emphatic, vesum: 'emph', mte: 'h' },

  { feat: 'сonjunctionType', featMi: null, mi: Pos.coordinatingConjunction, vesum: 'coord', mte: 'c' },
  { feat: 'сonjunctionType', featMi: null, mi: Pos.subordinatingConjunction, vesum: 'subord', mte: 's' },

  { feat: 'pos', featMi: null, mi: null, vesum: 'noun', mte: 'N' },
  { feat: 'pos', featMi: Pos, mi: Pos.pronoun, vesum: 'pron', mte: null },  // todo: null?
  { feat: 'pos', featMi: Pos, mi: Pos.verb, vesum: 'verb', mte: 'V' },
  { feat: 'pos', featMi: Pos, mi: Pos.adjective, vesum: 'adj', mte: 'A' },
  { feat: 'pos', featMi: null, mi: null, vesum: 'adjp', mte: null },
  { feat: 'pos', featMi: Pos, mi: Pos.adverb, vesum: 'adv', mte: 'R' },
  { feat: 'pos', featMi: null, mi: null, vesum: 'advp', mte: null },
  { feat: 'pos', featMi: Pos, mi: Pos, vesum: 'prep', mte: 'S' },
  { feat: 'pos', featMi: null, mi: null, vesum: 'predic', mte: null },  // ?
  { feat: 'pos', featMi: null, mi: null, vesum: 'insert', mte: null },  // ?
  { feat: 'pos', featMi: null, mi: null, vesum: 'transl', mte: null },  // ?
  { feat: 'pos', featMi: null, mi: null, vesum: 'conj', mte: 'C' },
  { feat: 'pos', featMi: Pos, mi: Pos.particle, vesum: 'part', mte: 'Q' },
  { feat: 'pos', featMi: Pos, mi: Pos.interjection, vesum: 'excl', mte: 'I' },
  { feat: 'pos', featMi: Pos, mi: Pos.numeral, vesum: 'numr', mte: 'M' },
  // { feat: 'pos', featMi: Pos, mi: Pos.auxiliaryVerb, mte: 'M' },

  { feat: 'gender', featMi: Gender, mi: Gender.masculine, vesum: 'm', mte: 'm' },
  { feat: 'gender', featMi: Gender, mi: Gender.feminine, vesum: 'f', mte: 'f' },
  { feat: 'gender', featMi: Gender, mi: Gender.neuter, vesum: 'n', mte: 'n' },

  { feat: 'number', featMi: Numberr, mi: Numberr.plural, vesum: 'p', mte: 'p' },
  { feat: 'number', featMi: Numberr, mi: Numberr.singular, vesum: 's', mte: 's' },

  { feat: 'person', featMi: Person, mi: Person.first, vesum: '1', mte: '1' },
  { feat: 'person', featMi: Person, mi: Person.second, vesum: '2', mte: '2' },
  { feat: 'person', featMi: Person, mi: Person.third, vesum: '3', mte: '3' },

  { feat: 'numberTantum', featMi: null, vesum: 'np', mte: null },
  { feat: 'numberTantum', featMi: null, vesum: 'ns', mte: null },
];


const mapMi = indexTableByColumns(featureTable, ['featMi', 'mi']);
const mapVesum: Map<string, any> = indexTableByColumns(featureTable, ['vesum']);




export class MorphTag {
  pos: Pos;
  case: Case;
  number: Numberr;
  aspect: Aspect;
  tense: Tense;
  mood: Mood;
  person: Person;
  // voice: Voice;
  animacy: Animacy;
  gender: Gender;
  degree: Degree;

  static fromMte5(value: string): any {
    return featureTable;
  }

  // expects altFlagsStr() output
  static fromVesum(lemma: string, flags: string[]) {
    let ret = new MorphTag();

    for (let flag of flags) {
      let row = mapVesum.get(flag);
      if (row) {
        if (row.featMi) {
          ret[row.feat] = row.mi;  // todo
        }
        else {
          let feature = row.feat;
          if (feature === 'сonjunctionType') {
            ret.pos = row.mi;
          }
          else if (flag === 'conj') { }
          else if (flag === 'noun') {
            ret.pos = startsWithCapital(lemma) ? Pos.properNoun : Pos.noun;  // todo: abbrs
          }
          else if (flag === '&pron') {
            
            ret.pos = Pos.pronoun;
          }
          else if (flag === 'advp') {
            ret.pos = Pos.verb;
          }
        }
      }
      else {
        console.error(`No mapping for vesum’s '${flag}'`);
      }
    }

    return ret;
  }

  static fromUd(value: string) {

  }

  toMte5() {
    switch (this.pos) {
      case Pos.noun:
      case Pos.properNoun: {
        return 'N'
          + ''
      }
      
      case Pos.verb:
      case Pos.auxiliaryVerb: {
        let ret = 'V'
          + (this.pos === Pos.verb ? 'm' : 'a')
        // + ;
        return ret;
      }
      
      case Pos.numeral:
        return 'Ml'
          + ''
      
      case Pos.adverb:
        return 'R'
          + '';
      
      case Pos.adposition:
        return 'Sp'
          + '-'  // todo: formation
          + mapMi.get(Case).get(this.case);
          
      case Pos.coordinatingConjunction:
      case Pos.coordinatingConjunction:
        return 'C'
          + (this.pos === Pos.coordinatingConjunction ? 'c' : 's')
          + '';  // todo: simple/compound
          
      case Pos.interjection:
        return 'I';
        
      case Pos.particle:
        return 'Q';
    }

  }

  toVesum() {

  }

  toUd() {

  }
}


// Expands dict_corp_viz.txt tag into an array of unambiguous morph interpretations
////////////////////////////////////////////////////////////////////////////////
export function expandVesumTag(value: string) {
  let [mainFlagsStr, altFlagsStr] = value.split(/:&_|:&(?=adjp)/);  // adj:m:v_zna:rinanim:&adjp:pasv:imperf

  let mainFlagsArray = mainFlagsStr.split(':');
  let mainFlags = new Set(mainFlagsArray);
  let arrayFeature = [];
  for (let flag of mainFlagsArray) {
    if (mapVesum.has(flag)) {
      let feature = mapVesum.get(flag).feat;
      if (mainFlagsArray[0] === 'prep' && feature === 'case' || feature === 'pronounType') {
        arrayFeature.push(flag);
        mainFlags.delete(flag);
      }
    }
  }

  let ret = new Array<Array<string>>();
  if (arrayFeature.length) {
    let base = Array.from(mainFlags);
    for (let flag of arrayFeature) {
      ret.push([...base, flag]);
    }
  }
  else {
    ret.push(mainFlagsArray);
  }

  if (altFlagsStr) {
    let altFlagArray = altFlagsStr.split(':');
    for (let i = 0, length = ret.length; i < length; ++i) {
      ret.push([...ret[i], '&' + altFlagArray[0], ...altFlagArray.slice(1)]);
    }
  }

  return ret;
}




//------------------------------------------------------------------------------
function startsWithCapital(str: string) {
  return str && str.charAt(0).toLowerCase() !== str.charAt(0);
}


/*

todo:
- all string identifiers/symbols to symbol/enum
- verb form/mood

vesum tests:
- conjunction always has type

*/