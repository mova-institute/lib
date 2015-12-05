
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
	
	'': '',
};

class RysinTag {
	pos: string;
	aspect: string;
	tense: string;
	person: string;
	animacy: string;
	case: string;
	prepositionCases: Array<string>;
	gender: string;
	number: string;
	degree: string;
	pronounType: string;
	сonjunctionType: string;

	constructor(str: string) {
		for (let flag of str.split(':')) {
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
export function rysin2multext(lemma: string, lemmaTagStr: string, form: string, formTagStr: string) {
	let toret = new Array<string>();

	let lemmaTag = new RysinTag(lemmaTagStr);
	let formTag = new RysinTag(formTagStr);
	if (lemmaTag.pos !== '&pron') {
		switch (formTag.pos) {
			case 'noun': {
				let isProper = startsWithCap(form);  // todo: abbrs
				let type = isProper ? 'p' : 'c';

				let gender = formTag.gender;  // todo: common, pluralia tantum
				
				let number_ = formTag.number || 's';

				let case_ = caseMap[formTag.case];

				let animacy = animacyMap[formTag.animacy];

				toret.push('N' + type + gender + number_ + case_ + animacy);
				break;
			}
			case 'verb': {
				let type = lemma === 'бути' ? 'a' : 'm';

				let aspect = aspectMap[formTag.aspect];	 // never biaspectual
				
				let form = '';  // todo, indicative — якщо не інша, але -но, -то
				
				let tense = tenseMap[formTag.tense];

				let person = formTag.person || '-';

				let number_ = '';  // todo
				
				let gender = '';

				toret.push('V' + type + aspect + form + tense + person + number_ + gender);
				break;
			}
			case 'adj': {
				// qualificative/ordinal взяти з наявності форми порівн
				// загальний??
				// нема нестягненої взагалі
				// двовидовість?
				// чому тут дієприкм?
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
			case 'adjp': {
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

			default:
				throw `Unexpected POS tag: "${formTag.pos}"`;
		}
	} else {

	}
		
	/*} else {
		let prevConverted = toret[toret.length - 1];
		switch (secondPosSubtags[0]) {
			case '&pron':
				let topush = 'P';
				
				// Type
				topush += pronounType[secondPosSubtags[1]];	 // problems here
				
				// Referent_Type
				topush += '-'; // ?????????????
				
				let syntacticType = prevConverted.charAt(0).toLowerCase();
				if (syntacticType === 'r') {
					topush += '-----r';
				} else {
					
					// Person
					topush += topush.charAt(1) === 'p' ? secondPosSubtags[2] : '-';

					// Gender
					// Animate
					// Number
					// Case
					
					// Syntactic_Type
					topush += syntacticType;
				}

				toret.push(topush);
				break;
			default:
				throw `Unexpected second POS tag: "${secondPosSubtags[0]}"`;
		}*/

	return toret;
}



// дієприкметник?
// чому у скорочення немає нічого
// Abbreviation?



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