
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
	'rv_rod': { feature: 'case', mte: 'g' },
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

	'short': { feature: 'definiteness', mte: 's' },
	'uncontr': { feature: 'definiteness', mte: 'f' },

	'pers': { feature: 'pronounType', mte: 'p' },
	'refl': { feature: 'pronounType', mte: 'x' },
	'pos': { feature: 'pronounType', mte: 's' },
	'dem': { feature: 'pronounType', mte: 'd' },
	'int': { feature: 'pronounType', mte: 'q' },
	'rel': { feature: 'pronounType', mte: 'r' },
	'neg': { feature: 'pronounType', mte: 'z' },
	'ind': { feature: 'pronounType', mte: 'i' },
	'gen': { feature: 'pronounType', mte: 'g' },
	'def': { feature: 'pronounType', mte: '?' },  // todo
	
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
	'transl': { feature: 'pos', mte: null },  // ?
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

	constructor(flags: Array<string>) {
		for (let flag of flags) {
			if (flag in tagMap) {
				let feature = tagMap[flag].feature;
				if (this.pos === 'prep' && feature === 'case') {
					this.pushToArrayFeature('prepositionCases', flag);
				} else if (feature === 'pronounType') {
					this.pushToArrayFeature('pronounType', flag);
				} else {
					this[feature] = flag;
				}
			}
			else if (flag.startsWith('&_')) {
				this.shadowPos = this.pos;
				this.pos = flag.substr(2);
			}
			else if (flag.startsWith('&')) {
				this.pushToArrayFeature('altPoses', flag.substr(1));
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

	private pushToArrayFeature(feature: string, flag: string) {
		this[feature] = this[feature] || new Array<string>();
		this[feature].push(flag);
	}
}


////////////////////////////////////////////////////////////////////////////////
export function rysin2multext(lemma: string, lemmaTagStr: string, form: string, formTagStr: string) {
	let toret = new Array<string>();

	let lemmaFlags = lemmaTagStr.split(':');
	let formFlags = formTagStr.split(':');
	let lemmaTag = new RysinTag(lemmaFlags);
	let formTag = new RysinTag(formFlags);

	for (let pos of formTag.poses()) {
		switch (formTag.pos) {
			case 'noun': {
				let isProper = startsWithCap(form);  // todo: abbrs
				let type = isProper ? 'p' : 'c';
	
				// todo: common, filter plu tantum
				let gender = lemmaTag.numberTantum === 'ns' ? '-' : mapTag(lemmaTag.gender);
				let number_ = formTag.number || 's';
				let case_ = mapTag(formTag.case);
				let animacy = mapTag(formTag.animacy);

				toret.push('N' + type + gender + number_ + case_ + animacy);
				break;
			}
			case 'verb': {
				let type = lemma === 'бути' ? 'a' : 'm';
				let aspect = mapTag(formTag.aspect);
				let form = tryMapTag(formTag.verbForm) || 'i';
				let tense = tryMapTag(formTag.tense) || '-';
				let person = formTag.person || '-';
				let number_ = formTag.number || '-';
				let gender = formTag.gender || '';

				toret.push(trimTrailingDash('V' + type + aspect + form + tense + person + number_ + gender));
				break;
			}
			case 'advp': {
				let type = 'm';  // todo: wait for дієслівна лема
				let aspect = mapTag(formTag.aspect);
				let tense = '-';  // todo: за закінченнями?
	
				toret.push('V' + type + aspect + 'g' + tense);
				break;
			}
			case 'adj': {
				let type = formTag.degree ? 'f' : 'o';
				let degree = formTag.degree || '-';
				let gender = formTag.gender || '-';
				let number_ = formTag.number || 's';
				let case_ = mapTag(formTag.case);
				let definiteness = tryMapTag(formTag.definiteness) || defaultDefiniteness(gender, case_);
				let animacy = '';  // todo
				
				toret.push('A' + type + degree + gender + number_ + case_ + definiteness + animacy);
				break;
			}
			case 'adjp': {
				let gender = formTag.gender || '-';
				let number_ = formTag.number || 's';
				let case_ = mapTag(formTag.case);
				let definiteness = tryMapTag(formTag.definiteness) || defaultDefiniteness(gender, case_);
				let animacy = '-';  // todo
				let aspect = mapTag(formTag.aspect);
				let voice = mapTag(formTag.voice);
				let tense = tryMapTag(formTag.tense) || '';  // todo
				
				toret.push('Ap-' + gender + number_ + case_ + definiteness + animacy + aspect + voice + tense);
				break;
			}
			case 'numr': {
				let type = formTag.shadowPos === 'adj' ? 'o' : 'c';
				let gender = formTag.gender || '-';
				let number_ = formTag.number || 's';
				let case_ = mapTag(formTag.case);
				let animacy = '';  // todo
				
				toret.push('Ml' + type + gender + number_ + case_ + animacy);
				break;
			}
			case 'adv':
				toret.push('R' + (tryMapTag(formTag.degree) || ''));
				break;
			case 'prep': {
				let formation = form.includes('-') ? 'c' : 's';

				for (let rysinCase of formTag.prepositionCases) {
					let case_ = mapTag(rysinCase);
					toret.push('Sp' + formation + case_);
				}
				break;
			}
			case 'conj': {
				let type = mapTag(formTag.сonjunctionType);
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
				let referentType = '-';  // todo
				let person = formTag.person || '-';
				let gender = formTag.gender || '-';
				let animacy = tryMapTag(formTag.animacy) || '-';
				let number_ = formTag.number || (formTag.gender ? 's' : '-');
				let case_ = tryMapTag(formTag.case) || '-';
				let syntacticType = mapTag(formFlags[0]).toLocaleLowerCase();

				if (formTag.pronounType) {
					for (let type of formTag.pronounType) {
						toret.push('P' + mapTag(type) + referentType + person + gender + animacy + number_ + case_ + syntacticType);
					}
				} else {  // todo
					toret.push('P' + '?' + referentType + person + gender + animacy + number_ + case_ + syntacticType);
				}


				break;
			}
			// todo: abbr
			default:
			//throw new Error(`Unexpected POS tag: '${formTag.pos}'`);
			//console.log(`Unexpected POS tag: '${formTag.pos}'`);
		}
	}

	return toret;
}



////////////////////////////////////////////////////////////////////////////////
function tryMapTag(flag: string): string {
	return (flag in tagMap) ? tagMap[flag].mte : null;
}

////////////////////////////////////////////////////////////////////////////////
function mapTag(flag: string): string {
	let toret = tryMapTag(flag);
	if (!toret) {
		throw new Error(`Unmappable flag: ${flag}`);
	}

	return toret;
}

////////////////////////////////////////////////////////////////////////////////
function defaultDefiniteness(gender: string, case_: string) {  // todo: загалний
	if ((gender === 'f' || gender === 'n') && (case_ === 'n' || case_ === 'a')) {
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