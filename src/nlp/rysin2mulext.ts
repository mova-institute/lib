
const tagMap = {
	'anim': { feature: 'animacy', mte: 'y' },
	'inanim': { feature: 'animacy', mte: 'n' },
	
	'v_naz': { feature: 'case', mte: 'n' },
	'v_rod': { feature: 'case', mte: 'g' },
	'v_dav': { feature: 'case', mte: 'd' },
	'v_zna': { feature: 'case', mte: 'a' },
	'v_oru': { feature: 'case', mte: 'i' },
	'v_mis': { feature: 'case', mte: 'l' },
	'v_kly': { feature: 'case', mte: 'v' },
	'rv_naz': { feature: 'case', mte: 'n' }, 	// ?
	'rv_dav': { feature: 'case', mte: 'd' },
	'rv_zna': { feature: 'case', mte: 'a' },
	'rv_oru': { feature: 'case', mte: 'i' },
	'rv_mis': { feature: 'case', mte: 'l' },
	
	'imperf': { feature: 'aspect', mte: 'p' },
	'perf': { feature: 'aspect', mte: 'e' },
	
	'past': { feature: 'tense', mte: 's' },
	'pres': { feature: 'tense', mte: 'p' },
	'futr': { feature: 'tense', mte: 'f' },
	
	'impr': { feature: 'verbForm', mte: 'm' },
	'inf': { feature: 'verbForm', mte: 'n' },
	'impers': { feature: 'verbForm', mte: 'o' },
	
	'actv': { feature: 'voice', mte: 'a' },
	'pasv': { feature: 'voice', mte: 'p' },
	
	'compb': { feature: 'degree', mte: 'p' },
	'compr': { feature: 'degree', mte: 'c' },
	'super': { feature: 'degree', mte: 's' },
	
	'pers': { feature: 'pronounType', mte: 'p' },
	'refl': { feature: 'pronounType', mte: 'x' },
	'pos': { feature: 'pronounType', mte: 's' },
	'dem': { feature: 'pronounType', mte: 'd' },
	'int': { feature: 'pronounType', mte: 'q' },
	'rel': { feature: 'pronounType', mte: 'r' },
	'neg': { feature: 'pronounType', mte: 'z' },
	'ind': { feature: 'pronounType', mte: 'i' },
	'gen': { feature: 'pronounType', mte: 'g' },
	// ?
	
	'coord': { feature: 'сonjunctionType', mte: 'c' },
	'subord': { feature: 'сonjunctionType', mte: 's' },
	
	'noun': { feature: 'pos', mte: 'N' },
	'&pron': { feature: 'pos', mte: null },
	'verb': { feature: 'pos', mte: 'V' },
	'adj': { feature: 'pos', mte: 'A' },
	'adjp': { feature: 'pos', mte: null },
	'adv': { feature: 'pos', mte: 'R' },
	'advp': { feature: 'pos', mte: null },
	'prep': { feature: 'pos', mte: 'S' },
	'predic': { feature: 'pos', mte: null },  // ?
	'insert': { feature: 'pos', mte: null },  // ?
	'conj': { feature: 'pos', mte: 'C' },
	'part': { feature: 'pos', mte: 'Q' },
	'excl': { feature: 'pos', mte: 'I' },
	'numr': { feature: 'pos', mte: 'M' },
	
	'm': { feature: 'gender', mte: 'm' },
	'f': { feature: 'gender', mte: 'f' },
	'n': { feature: 'gender', mte: 'n' },

	'p': { feature: 'number', mte: 'p' },
	's': { feature: 'number', mte: 's' },

	'1': { feature: 'person', mte: '1' },
	'2': { feature: 'person', mte: '2' },
	'3': { feature: 'person', mte: '3' },

	'np': { feature: 'numberTantum', mte: null },
	'ns': { feature: 'numberTantum', mte: null },
};

function mapTag(flag: string) {
	return (flag in tagMap) ? tagMap[flag].mte : null;
}

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
			let feature = tagMap[flag].feature;
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
			let case_ = mapTag(formTag.case);
			let animacy = mapTag(formTag.animacy);

			toret.push('N' + type + gender + number_ + case_ + animacy);
			break;
		}
		case 'verb': {
			let type = lemma === 'бути' ? 'a' : 'm';  // todo
			let aspect = mapTag(formTag.aspect);
			let form = mapTag(formTag.verbForm) || 'i';
			let tense = mapTag(formTag.tense) || '-';
			let person = formTag.person || '-';
			let number_ = formTag.number || '-';
			let gender = formTag.gender || '-';

			toret.push('V' + type + aspect + form + tense + person + number_ + gender);
			break;
		}
		case 'advp': {
			let type = 'm';  // todo
			let aspect = mapTag(formTag.aspect);
			let tense = '-';  // todo: за закінченнями?

			toret.push('V' + type + aspect + 'g' + tense + '---');
			break;
		}
		case 'adj': {
			let type = formTag.degree ? 'f' : 'o';
			let degree = formTag.degree || '-';
			let gender = formTag.gender || '-';  // todo: загальний??
			let number_ = formTag.number || 's';
			let case_ = mapTag(formTag.case);
			let definiteness = 's';  // todo: додати нестягнену?
			let animacy = '-';  // todo: wut?
			
			toret.push('A' + type + degree + gender + number_ + case_ + definiteness + animacy + '---');
			break;
		}
		case 'adjp': {
			let gender = formTag.gender || '-';  // todo: загальний буває у дієприкм??
			let number_ = formTag.number || 's';
			let case_ = mapTag(formTag.case);
			let definiteness = 's';  // todo: додати нестягнену?
			let animacy = '-';  // todo: wut?
			let aspect = mapTag(formTag.aspect);
			let voice = mapTag(formTag.voice);
			let tense = formTag.tense === 'past' ? 's' : 'p';  // AR: тимчасово, todo
			
			toret.push('Ap-' + gender + number_ + case_ + definiteness + animacy + aspect + voice + tense);
			break;
		}
		case 'numr': {
			let type = 'c';  // todo: ordinal
			let gender = formTag.gender || '-';
			let number_ = formTag.number || 's';
			let case_ = mapTag(formTag.case);
			let animacy = '';  // todo
				
			toret.push('Ml' + type + gender + number_ + case_ + animacy)
			break;
		}
		case 'adv':
			toret.push('R' + (mapTag(formTag.degree) || ''));
			break;
		case 'prep': {
			let formation = form.includes('-') ? 'c' : 's';

			for (let rysinCase of formTag.prepositionCases) {
				let case_ = mapTag(rysinCase);
				if (!'gdail'.includes(case_)) {
					throw 'Unexpected case';
				}
				toret.push('Sp' + formation + case_);
			}

			break;
		}
		case 'conj': {
			let type = mapTag(formTag.сonjunctionType);  // todo: do all have?
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
			let type = mapTag(formTag.pronounType);  // todo
			let referentType = '-';  // todo
			let person = formTag.person || '-';
			let gender = formTag.gender || '-';
			let animacy = mapTag(formTag.animacy) || '-';
			let number_ = formTag.number || (formTag.gender ? 's' : '-');
			let case_ = mapTag(formTag.case) || '-';
			let syntacticType = mapTag(formFlags[0]);

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