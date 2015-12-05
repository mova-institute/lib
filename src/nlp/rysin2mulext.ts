
const animacyMap = {
	'anim': 'y',
	'inanim': 'n',
};
const aspectMap = {
	'imperf': 'p',
	'perf': 'e'
};
const tenseMap = {
	'past': 's',
	'pres': 'p',
	'futr': 'f',
};
const verbFormMap = {
	'impr': 'm',
	'inf': 'n',
	'impers': 'o',
};
const voiceMap = {
	'actv': 'a',
	'pasv': 'p',
};
const caseMap = {
	'v_naz': 'n',
	'v_rod': 'g',
	'v_dav': 'd',
	'v_zna': 'a',
	'v_oru': 'i',
	'v_mis': 'l',
	'v_kly': 'v',
};
const adverbDegreeMap = {
	'compb': 'p',
	'compr': 'c',
	'super': 's',
};
const pronounTypeMap = {
	'pers': 'p',
	'refl': 'x',
	'pos': 's',
	'dem': 'd',
	'int': 'q',
	'rel': 'r',
	'neg': 'z',
	'ind': 'i',
	'gen': 'g',
	// ?
};
const pronounSyntacticTypeMap = {
	'noun': 'n',
	'adj': 'a',
	'adv': 'r',
};
const сonjunctionTypeMap = {
	'coord': 'c',
	'subord': 's',
};


const tagType = {
	'noun': 'pos',
	'&pron': 'pos',
	'verb': 'pos',
	'adj': 'pos',
	'adjp': 'pos',
	'adv': 'pos',
	'advp': 'pos',
	'prep': 'pos',
	'predic': 'pos',  // ?
	'insert': 'pos',  // ?
	'conj': 'pos',
	'part': 'pos',
	'excl': 'pos',
	'numr': 'pos',

	'imperf': 'aspect',
	'perf': 'aspect',

	'past': 'tense',
	'pres': 'tense',
	'futr': 'tense',

	'impr': 'verbForm',
	'inf': 'verbForm',
	'impers': 'verbForm',

	'anim': 'animacy',
	'inanim': 'animacy',

	'pers': 'pronounType',
	'refl': 'pronounType',
	'pos': 'pronounType',
	'dem': 'pronounType',
	'def': 'pronounType',
	'int': 'pronounType',
	'rel': 'pronounType',
	'neg': 'pronounType',
	'ind': 'pronounType',
	'gen': 'pronounType',	// todo
	
	'v_naz': 'case',
	'v_rod': 'case',
	'v_dav': 'case',
	'v_zna': 'case',
	'v_oru': 'case',
	'v_mis': 'case',
	'v_kly': 'case',
	'rv_naz': 'case', 	// ?
	'rv_dav': 'case',
	'rv_zna': 'case',
	'rv_oru': 'case',
	'rv_mis': 'case',

	'm': 'gender',
	'f': 'gender',
	'n': 'gender',

	'p': 'number',
	's': 'number',

	'1': 'person',
	'2': 'person',
	'3': 'person',

	'compb': 'degree',
	'compr': 'degree',
	'super': 'degree',

	'subord': 'сonjunctionType',
	'coord': 'сonjunctionType',

	'np': 'numberTantum',
	'ns': 'numberTantum',
	
	'': '',
};

////////////////////////////////////////////////////////////////////////////////
class RysinTag {
	pos: string;
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
	pronounType: string;
	сonjunctionType: string;
	numberTantum: string;

	constructor(flags: Array<string>) {
		for (let flag of flags) {
			let feature = tagType[flag];
			if (!feature) {
				throw `Unknown feature for "${flag}"`;
			}

			if (this.pos === 'prep' && feature === 'case') {
				this.prepositionCases = this.prepositionCases || new Array<string>();
				this.prepositionCases.push(flag);
			} else {
				this[feature] = flag;
			}
		}
	}
}


////////////////////////////////////////////////////////////////////////////////
// NOTES:
// never biaspectual
//
export function rysin2multext(lemma: string, lemmaTagStr: string, form: string, formTagStr: string) {
	let toret = new Array<string>();

	let lemmaFlags = lemmaTagStr.split(':');
	let formFlags = formTagStr.split(':');
	let lemmaTag = new RysinTag(lemmaFlags);
	let formTag = new RysinTag(formFlags);
	
	switch (formTag.pos) {
		case 'noun': {
			let isProper = startsWithCap(form);  // todo: abbrs
			let type = isProper ? 'p' : 'c';

			// todo: common, filter plu tantum
			let gender = lemmaTag.gender || (lemmaTag.numberTantum === 'ns' ? '-' : null);
			if (!gender) {
				throw 'Gender problem…';
			}
			let number_ = formTag.number || 's';
			let case_ = caseMap[formTag.case];
			let animacy = animacyMap[formTag.animacy];

			toret.push('N' + type + gender + number_ + case_ + animacy);
			break;
		}
		case 'verb': {
			let type = lemma === 'бути' ? 'a' : 'm';  // todo
			let aspect = aspectMap[formTag.aspect];
			let form = verbFormMap[formTag.verbForm] || 'i';
			let tense = tenseMap[formTag.tense] || '-';
			let person = formTag.person || '-';
			let number_ = formTag.number || '-';
			let gender = formTag.gender || '-';

			toret.push('V' + type + aspect + form + tense + person + number_ + gender);
			break;
		}
		case 'advp': {
			let type = 'm';  // todo
			let aspect = aspectMap[formTag.aspect];
			let tense = '-';  // todo: за закінченнями?

			toret.push('V' + type + aspect + 'g' + tense + '---');
			break;
		}
		case 'adj': {
			let type = formTag.degree ? 'f' : 'o';
			let degree = formTag.degree || '-';
			let gender = formTag.gender || '-';  // todo: загальний??
			let number_ = formTag.number || 's';
			let case_ = caseMap[formTag.case];
			let definiteness = 's';  // todo: додати нестягнену?
			let animacy = '-';  // todo: wut?
			
			toret.push('A' + type + degree + gender + number_ + case_ + definiteness + animacy + '---');
			break;
		}
		case 'adjp': {
			let gender = formTag.gender || '-';  // todo: загальний буває у дієприкм??
			let number_ = formTag.number || 's';
			let case_ = caseMap[formTag.case];
			let definiteness = 's';  // todo: додати нестягнену?
			let animacy = '-';  // todo: wut?
			let aspect = aspectMap[formTag.aspect];
			let voice = voiceMap[formTag.voice];
			let tense = formTag.tense === 'past' ? 's' : 'p';  // AR: тимчасово, todo
			
			toret.push('Ap-' + gender + number_ + case_ + definiteness + animacy + aspect + voice + tense);
			break;
		}
		case 'numr': {
			let type = 'c';  // todo: ordinal
			let gender = formTag.gender || '-';
			let number_ = formTag.number || 's';
			let case_ = caseMap[formTag.case];
			let animacy = '';  // todo
				
			toret.push('Ml' + type + gender + number_ + case_ + animacy)
			break;
		}
		case 'adv':
			toret.push('R' + (adverbDegreeMap[formTag.degree] || ''));
			break;
		case 'prep': {
			let formation = form.includes('-') ? 'c' : 's';

			for (let rysinCase of formTag.prepositionCases) {
				let case_ = caseMap[rysinCase];
				if (!'gdail'.includes(case_)) {
					throw 'Unexpected case';
				}
				toret.push('Sp' + formation + case_);
			}

			break;
		}
		case 'conj': {
			let type = сonjunctionTypeMap[formTag.сonjunctionType];  // todo: do all have?
			let formation = form.includes('-') ? 'c' : 's';

			toret.push('C' + type + formation);
			break;
		}
		case 'part':
			toret.push('Q');
			break;
		case 'excl':
			toret.push('I');
			break;
		case '&pron': {
			let type = pronounTypeMap[formTag.pronounType];  // todo
			let referentType = '-';  // todo
			let person = formTag.person || '-';
			let gender = formTag.gender || '-';
			let animacy = animacyMap[formTag.animacy] || '-';
			let number_ = formTag.number || (formTag.gender ? 's' : '-');
			let case_ = caseMap[formTag.case] || '-';
			let syntacticType = pronounSyntacticTypeMap[formFlags[0]];

			toret.push('P' + type + referentType + person + gender + animacy + number_ + case_ + syntacticType);
			break;
		}
		default:
			throw `Unexpected POS tag: "${formTag.pos}"`;
	}

	return toret;
}




/*

3.11.3.  Ukrainian Noun
3.11.4.  Ukrainian Verb
3.11.5.  Ukrainian Adjective
3.11.6.  Ukrainian Pronoun
---------3.11.7.  Ukrainian Adverb
---------3.11.8.  Ukrainian Adposition
---------3.11.9.  Ukrainian Conjunction
3.11.10. Ukrainian Numeral
---------3.11.11. Ukrainian Particle
---------3.11.12. Ukrainian Interjection
3.11.13. Ukrainian Abbreviation
_________3.11.14. Ukrainian Residual
	
*/

function startsWithCap(str: string) {
		return str.length && str.charAt(0).toLowerCase() !== str.charAt(0);
}