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


const tagMap = {
  'anim': { feat: 'animacy', mte: 'y' },
  'inanim': { feat: 'animacy', mte: 'n' },
  'ranim': { feat: 'animacy', mte: 'y' },
  'rinanim': { feat: 'animacy', mte: 'n' },

  'v_naz': { feature: Case, feat: 'case', mte: 'n' },
  'v_rod': { feature: Case, feat: 'case', mte: 'g' },
  'v_dav': { feature: Case, feat: 'case', mte: 'd' },
  'v_zna': { feature: Case, feat: 'case', mte: 'a' },
  'v_oru': { feature: Case, feat: 'case', mte: 'i' },
  'v_mis': { feature: Case, feat: 'case', mte: 'l' },
  'v_kly': { feature: Case, feat: 'case', mte: 'v' },
  'rv_naz': { feat: 'case', mte: 'n' }, 	// ?
  'rv_rod': { feat: 'case', mte: 'g' },
  'rv_dav': { feat: 'case', mte: 'd' },
  'rv_zna': { feat: 'case', mte: 'a' },
  'rv_oru': { feat: 'case', mte: 'i' },
  'rv_mis': { feat: 'case', mte: 'l' },

  'imperf': { feat: 'aspect', mte: 'p' },
  'perf': { feat: 'aspect', mte: 'e' },

  'past': { feat: 'tense', mte: 's' },
  'pres': { feat: 'tense', mte: 'p' },
  'futr': { feat: 'tense', mte: 'f' },

  'impr': { feat: 'verbForm', mte: 'm' },
  'inf': { feat: 'verbForm', mte: 'n' },
  'impers': { feat: 'verbForm', mte: 'o' },

  'actv': { feat: 'voice', mte: 'a' },
  'pasv': { feat: 'voice', mte: 'p' },

  'compb': { feat: 'degree', mte: 'p' },
  'compr': { feat: 'degree', mte: 'c' },
  'super': { feat: 'degree', mte: 's' },

  'short': { feat: 'definiteness', mte: 's' },
  'uncontr': { feat: 'definiteness', mte: 'f' },

  'pers': { feat: 'pronounType', mte: 'p' },
  'refl': { feat: 'pronounType', mte: 'x' },
  'pos': { feat: 'pronounType', mte: 's' },
  'dem': { feat: 'pronounType', mte: 'd' },
  'int': { feat: 'pronounType', mte: 'q' },
  'rel': { feat: 'pronounType', mte: 'r' },
  'neg': { feat: 'pronounType', mte: 'z' },
  'ind': { feat: 'pronounType', mte: 'i' },
  'gen': { feat: 'pronounType', mte: 'g' },
  'def': { feat: 'pronounType', mte: '?' },  // todo
  'emph': { feat: 'pronounType', mte: 'h' },
	
  'coord': { feat: 'сonjunctionType', mte: 'c' },
  'subord': { feat: 'сonjunctionType', mte: 's' },

  'noun': { feat: 'pos', mte: 'N' },
  'pron': { feat: 'pos', mte: null },
  'verb': { feat: 'pos', mte: 'V' },
  'adj': { feat: 'pos', mte: 'A' },
  'adjp': { feat: 'pos', mte: null },
  'adv': { feat: 'pos', mte: 'R' },
  'advp': { feat: 'pos', mte: null },
  'prep': { feat: 'pos', mte: 'S' },
  'predic': { feat: 'pos', mte: null },  // ?
  'insert': { feat: 'pos', mte: null },  // ?
  'transl': { feat: 'pos', mte: null },  // ?
  'conj': { feat: 'pos', mte: 'C' },
  'part': { feat: 'pos', mte: 'Q' },
  'excl': { feat: 'pos', mte: 'I' },
  'numr': { feat: 'pos', mte: 'M' },

  'm': { feat: 'gender', mte: 'm' },
  'f': { feat: 'gender', mte: 'f' },
  'n': { feat: 'gender', mte: 'n' },

  'p': { feat: 'number', mte: 'p' },
  's': { feat: 'number', mte: 's' },

  '1': { feat: 'person', mte: '1' },
  '2': { feat: 'person', mte: '2' },
  '3': { feat: 'person', mte: '3' },

  'np': { feat: 'numberTantum', mte: null },
  'ns': { feat: 'numberTantum', mte: null },
};

////////////////////////////////////////////////////////////////////////////////
class RysinTag {
  pos: string;
  shadowPos: string
  altPoses: Array<string>;
  aspect: string;
  tense: string;
  verbForm: string;
  person: string;
  animacy: string;
  voice: string;
  case: string;
  prepositionCases: Array<string>;
  gender: string;
  number: string;
  degree: string;
  definiteness: string
  pronounType: Array<string>;
  сonjunctionType: string;
  numberTantum: string;

  constructor(flags: string) {
    for (let flag of flags.split(':')) {
      if (flag in tagMap) {
        let feature = tagMap[flag].feat;
        if (this.pos === 'prep' && feature === 'case') {
          this._pushToArrayFeature('prepositionCases', flag);
        }
        else if (feature === 'pronounType') {
          this._pushToArrayFeature('pronounType', flag);
        }
        else {
          this[feature] = flag;
        }
      }
      else if (flag.startsWith('&_')) {
        this.shadowPos = this.pos;
        this.pos = flag.substr(2);
      }
      else if (flag.startsWith('&')) {
        this._pushToArrayFeature('altPoses', flag.substr(1));
      }
    }
  }

  *poses() {  // todo: not destructive
    yield this;
    this.shadowPos = this.pos;
    for (let altPos of this.altPoses || []) {
      this.pos = altPos;
      yield this;
    }
  }

  private _pushToArrayFeature(feature: string, flag: string) {
    this[feature] = this[feature] || new Array<string>();
    this[feature].push(flag);
  }
}

export class UdFeaturesBag {
  
}

////////////////////////////////////////////////////////////////////////////////
export function rysin2ud(lemma: string, lemmaTagStr: string, form: string, formTagStr: string) {
  let ret = new Array<{ pos: string, features: string }>();

  let lemmaTag = new RysinTag(lemmaTagStr);
  let formTag = new RysinTag(formTagStr);

  for (let pos of formTag.poses()) {
    // todo: treat special
    if (!skipMainPos(formTag)) {
      switch (formTag.pos) {
        case 'noun': {
          let isProper = startsWithCap(form);  // todo: abbrs
          
          break;
        }
        case 'verb': {
          
        }
        default:
          throw new Error(`Unexpected POS tag: '${formTag.pos}'`);
      }
    }
  }

  return ret;
}


function skipMainPos(tag: RysinTag) {
  // when &pron present, only add main pos if numr
  return tag.pos !== 'pron' && tag.pos !== 'numr'
    && tag.altPoses && tag.altPoses.indexOf('pron') >= 0;
}

////////////////////////////////////////////////////////////////////////////////
export function rysin2multext(lemma: string, lemmaTagStr: string, form: string, formTagStr: string) {
  let ret = new Array<string>();

  let lemmaTag = new RysinTag(lemmaTagStr);
  let formTag = new RysinTag(formTagStr);

  for (let pos of formTag.poses()) {
    if (treatSpecialCases(ret, form, formTag) || skipMainPos(formTag)) {
      continue;
    }

    switch (formTag.pos) {
      case 'noun': {
        let isProper = startsWithCap(form);  // todo: abbrs
        let type = isProper ? 'p' : 'c';
	
        // todo: common, filter plu tantum
        let gender = lemmaTag.numberTantum === 'ns' ? '-' : mapTag(lemmaTag.gender);
        let number_ = formTag.number || 's';
        let case_ = mapTag(formTag.case);
        let animacy = mapTag(formTag.animacy);

        ret.push('N' + type + gender + number_ + case_ + animacy);
        break;
      }
      case 'verb': {
        let type = lemma === 'бути' ? 'a' : 'm';
        let aspect = mapTag(formTag.aspect);
        let form = tryMapTag(formTag.verbForm) || 'i';
        let tense = tryMapTag(formTag.tense) || '-';
        let person = tryMapTag(formTag.person) || '-';
        let number_ = tryMapTag(formTag.number) || (formTag.gender ? 's' : '-');
        let gender = tryMapTag(formTag.gender) || '';

        ret.push(trimTrailingDash('V' + type + aspect + form + tense + person + number_ + gender));
        break;
      }
      case 'advp': {
        let type = 'm';  // todo: wait for дієслівна лема
        let aspect = mapTag(formTag.aspect);
        if (!lemma.endsWith('чи') && !lemma.endsWith('ши')
          && !lemma.endsWith('чись') && !lemma.endsWith('шись')) {
          throw new Error('');
        }
        let tense = (lemma.endsWith('чи') || lemma.endsWith('чись')) ? 'p' : 's';  // todo: test
	
        ret.push('V' + type + aspect + 'g' + tense);
        break;
      }
      case 'adj': {
        let type = formTag.degree ? 'f' : 'o';
        let degree = tryMapTag(formTag.degree) || '-';
        let gender = formTag.gender || '-';
        let number_ = formTag.number || 's';
        let case_ = mapTag(formTag.case);
        let animacy = tryMapTag(formTag.animacy) || '';
        let definiteness = tryMapTag(formTag.definiteness)
          || defaultDefiniteness(gender, number_, case_, animacy);

        ret.push('A' + type + degree + gender + number_ + case_ + definiteness + animacy);
        break;
      }
      case 'adjp': {
        let gender = formTag.gender || '-';
        let number_ = formTag.number || 's';
        let case_ = mapTag(formTag.case);
        let animacy = tryMapTag(formTag.animacy) || '-';
        let definiteness = tryMapTag(formTag.definiteness)
          || defaultDefiniteness(gender, number_, case_, animacy);
        let aspect = mapTag(formTag.aspect);
        let voice = mapTag(formTag.voice);
        let tense = tryMapTag(formTag.tense) || '';  // todo
				
        ret.push('Ap-' + gender + number_ + case_ + definiteness + animacy + aspect + voice + tense);
        break;
      }
      case 'numr': {
        let type = formTag.shadowPos === 'adj' ? 'o' : 'c';
        let gender = formTag.gender || '-';
        let number_ = formTag.number || 's';
        let case_ = mapTag(formTag.case);
        let animacy = tryMapTag(formTag.animacy) || '';

        ret.push('Ml' + type + gender + number_ + case_ + animacy);
        break;
      }
      case 'adv':
        ret.push('R' + (tryMapTag(formTag.degree) || ''));
        break;
      case 'prep': {
        let formation = form.includes('-') ? 'c' : 's';

        for (let rysinCase of formTag.prepositionCases) {
          let case_ = mapTag(rysinCase);
          ret.push('Sp' + formation + case_);
        }
        break;
      }
      case 'conj': {
        let type = mapTag(formTag.сonjunctionType);
        let formation = form.includes('-') ? 'c' : 's';

        ret.push('C' + type + formation);
        break;
      }
      case 'part':
        ret.push('Q');
        break;
      case 'excl':
        ret.push('I');
        break;
      case 'pron': {
        let referentType = '-';  // todo
        let person = formTag.person || '-';
        let gender = formTag.gender || '-';
        let animacy = tryMapTag(formTag.animacy) || '-';
        let number_ = formTag.number || (formTag.gender ? 's' : '-');
        let case_ = tryMapTag(formTag.case) || '-';
        let syntacticType = mapTag(formTag.shadowPos).toLocaleLowerCase();

        if (formTag.pronounType) {
          for (let type of formTag.pronounType) {
            ret.push('P' + mapTag(type) + referentType + person + gender + animacy + number_ + case_ + syntacticType);
          }
        }
        else {  // todo
          ret.push('P' + '?' + referentType + person + gender + animacy + number_ + case_ + syntacticType);
        }

        break;
      }
      // todo: abbr
      default:
        throw new Error(`Unexpected POS tag: '${formTag.pos}'`);
      //console.log(`Unexpected POS tag: '${formTag.pos}'`);
    }
  }

  return ret;
}



////////////////////////////////////////////////////////////////////////////////
function tryMapTag(flag: string): string {
  return (flag in tagMap) ? tagMap[flag].mte : null;
}

////////////////////////////////////////////////////////////////////////////////
function mapTag(flag: string): string {
  let ret = tryMapTag(flag);
  if (!ret) {
    throw new Error(`Unmappable flag: ${flag}`);
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
function defaultDefiniteness(gender: string, number_: string, case_: string, animacy: string) {  // todo: загалний
  if ((gender === 'f' || gender === 'n' || (number_ === 'p' && animacy !== 'y'))
    && (case_ === 'n' || case_ === 'a')) {

    return 's';
  }

  return 'f';
}

////////////////////////////////////////////////////////////////////////////////
function startsWithCap(str: string) {
		return str.length && str.charAt(0).toLowerCase() !== str.charAt(0);
}

////////////////////////////////////////////////////////////////////////////////
function trimTrailingDash(str: string) {
  for (var i = str.length;
    i >= 0 && str.charAt(i - 1) === '-'; --i);

  return str.substring(0, i);
}

////////////////////////////////////////////////////////////////////////////////
function treatSpecialCases(ret: Array<string>, form: string, formTag: RysinTag) {
  if (form === 'незважаючи' && formTag.pos === 'prep') {
    ret.push('Vmpgp');
    return true;
  }
}

// todo: його/нього і різні форми з однаковими тегами загалом