import {createReadStream} from 'fs';
import {createInterface} from 'readline';

let args = require('minimist')(process.argv.slice(2));

let input = createReadStream(args._[0], 'utf8');

let collator = new Intl.Collator('uk-UA');


type Pack = Array<{ form: string, tag: string }>;

let pack: Pack = [];
createInterface({ input }).on('line', (line: string) => {
	let isLemma = !line.startsWith(' ');
	let [form, tag] = line.trim().replace('\'', '’').split(' ');
	if (isLemma) {
		if (pack) {
			f(pack);
		}
		pack = [];
	}
	pack.push({ form, tag });

}).on('close', () => {
	//f(null);
});


function f(pack: Pack) {
	let tag2forms = new Map<string, Array<string>>();
	let dupTags = new Map<string, string>();
	for (let i = 0; i < pack.length; ++i) {
		let {form, tag} = pack[i];

		// todo: delete :rare and stuff
		let tagNorm = tag.split(':').sort().join(':');
		if (tag2forms.has(tagNorm)) {
			dupTags.set(tagNorm, tag);
			tag2forms.get(tagNorm).push(form);
		}
		else {
			tag2forms.set(tagNorm, [form])
		}
	}

	filter(dupTags, tag2forms);

	if (dupTags.size) {
		// console.log();
		console.log(`${pack[0].form}`);
	}
	for (let [tagNorm, tagOrig] of dupTags) {
		let forms = tag2forms.get(tagNorm);
		console.log(`    ${tagOrig} ${forms.join(', ') }`);
	}
}

function filter(dupTags: Map<string, string>, tag2forms: Map<string, Array<string>>) {
	for (let tagNorm of dupTags.keys()) {
		let tagSet = new Set(tagNorm.split(':'));
		let forms = tag2forms.get(tagNorm).sort(collator.compare);

		if (tagSet.has('abbr') || forms[0].includes('-')) {
			dupTags.delete(tagNorm);
		}
		else if ((tagSet.has('adj') || tagSet.has('adjp')
				|| tagSet.has('noun') /*&& tagSet.has('anim')*/)
		  && tagSet.has('v_mis') && forms.length === 2
			&& forms[0].endsWith('ім') && forms[1].endsWith('ому')) {
			dupTags.delete(tagNorm);
		}
		// кондитерські кондитерських
		else if ((tagSet.has('adj') || tagSet.has('adjp'))
		  && tagSet.has('v_zna') && tagSet.has('p') && forms.length === 2
			&& (forms[0].endsWith('их') && forms[1].endsWith('і')
			  || forms[0].endsWith('ії') && forms[1].endsWith('іїх')
			  || forms[0].endsWith('і') && forms[1].endsWith('іх')
			)) {
			dupTags.delete(tagNorm);
		}
		else if (tagSet.has('verb')
			&& tagSet.has('rev')
			&& forms.length === 2
			&& forms[0].endsWith('сь') && forms[1].endsWith('ся')) {
			dupTags.delete(tagNorm);
		}
		else if (tagSet.has('verb')
		  && tagSet.has('p')
		  && tagSet.has('1')
			&& forms.length === 2
			&& (forms[0].endsWith('єм') && forms[1].endsWith('ємо')
				|| forms[0].endsWith('ем') && forms[1].endsWith('емо')
				|| forms[0].endsWith('им') && forms[1].endsWith('имо')
				|| forms[0].endsWith('їм') && forms[1].endsWith('їмо')
				)) {
			dupTags.delete(tagNorm);
		}
		// переселім, переселімо
		else if (tagSet.has('verb')
		  && tagSet.has('impr')
		  && tagSet.has('p')
		  && tagSet.has('1')
			&& forms.length === 2
			&& (forms[0].endsWith('ім') && forms[1].endsWith('імо')
				)) {
			dupTags.delete(tagNorm);
		}
		else if (tagSet.has('verb')
		  && tagSet.has('rev')
		  && tagSet.has('p')
		  && tagSet.has('1')
			&& forms.length === 3
			&& (forms[0].endsWith('мось') && forms[1].endsWith('мося') && forms[2].endsWith('мся')
				)) {
			dupTags.delete(tagNorm);
		}
		// відгорнено, відгорнуто
		else if (tagSet.has('verb')
		  && tagSet.has('perf')
		  && tagSet.has('impers')
			&& forms.length === 2
			&& (forms[0].endsWith('ено') && forms[1].endsWith('уто')
        || forms[0].endsWith('ено') && forms[1].endsWith('ото')
				)) {
			dupTags.delete(tagNorm);
		}
		// натягла, натягнула
		else if (tagSet.has('verb')
		  && tagSet.has('past')
			&& forms.length === 2
			&& (forms[0] === replaceLast(forms[1], 'ну', '')
				|| forms[1] === replaceLast(forms[0], 'ну', '')
				|| forms[0] === replaceLast(forms[0], 'нув', '')
			)) {
			
			dupTags.delete(tagNorm);
		}
		// подзвени, подзвеніть (ввічлива)
		else if (tagSet.has('verb')
		  && tagSet.has('impr')
		  && tagSet.has('s')
		  && tagSet.has('2')
			&& forms.length === 2
			&& (forms[0].endsWith('и') && forms[1].endsWith('іть')
				)) {
			dupTags.delete(tagNorm);
		}
		else if (tagSet.has('noun')
			&& tagSet.has('v_dav')
			&& forms.length === 2
			&& (forms[0].endsWith('ові') && forms[1].endsWith('у')
				|| forms[0].endsWith('ові') && forms[1].endsWith('ю')
				|| forms[0].endsWith('еві') && forms[1].endsWith('у')
				|| forms[0].endsWith('еві') && forms[1].endsWith('ю')
				|| forms[0].endsWith('єві') && forms[1].endsWith('ю'))
				) {
			dupTags.delete(tagNorm);
		}
		else if (tagSet.has('noun')
			&& tagSet.has('v_mis')
			&& forms.length === 2
			&& (forms[0].endsWith('ові') && forms[1].endsWith('у')
				/*|| forms[0].endsWith('єві') && forms[1].endsWith('ю')*/)
			) {
			dupTags.delete(tagNorm);
		}
		// Краснопільне, Краснопільного
		else if (tagSet.has('noun')
			&& tagSet.has('n')
			&& tagSet.has('v_zna')
			&& tagSet.has('inanim')
			&& forms.length === 2
			&& (forms[0].endsWith('е') && forms[1].endsWith('ого')
				/*|| forms[0].endsWith('єві') && forms[1].endsWith('ю')*/)
			) {
			dupTags.delete(tagNorm);
		}
		// підприємстві, підприємству
		else if (tagSet.has('noun')
			&& tagSet.has('n')
			&& tagSet.has('v_mis')
			&& forms.length === 2
			&& (forms[0].endsWith('і') && forms[1].endsWith('у')
				|| forms[0].endsWith('ї') && forms[1].endsWith('ю'))
			) {
			dupTags.delete(tagNorm);
		}
		else if (tagSet.has('noun')
			&& tagSet.has('v_mis')
			&& tagSet.has('m')
			/*&& forms.length === 3
			&& (forms[0].endsWith('і') && forms[1].endsWith('ові') && forms[2].endsWith('у')
				|| forms[0].endsWith('еві') && forms[1].endsWith('і') && forms[2].endsWith('у')
				|| forms[0].endsWith('еві') && forms[1].endsWith('і') && forms[2].endsWith('ю')
				|| forms[0].endsWith('єві') && forms[1].endsWith('ї') && forms[2].endsWith('ю')
				|| forms[0].endsWith('є') && forms[1].endsWith('ї') && forms[2].endsWith('ю')
				|| forms[0].endsWith('ові') && forms[1].endsWith('у') && forms[2].endsWith('і')
			)*/) {
			dupTags.delete(tagNorm);
		}
		// шулік, шуліки
		else if (tagSet.has('noun')
			&& tagSet.has('anim')
			&& tagSet.has('p')
			&& tagSet.has('v_zna')
			&& forms.length === 2
			&& (forms[0].endsWith('и') && forms[1].endsWith('ів')
			  || forms[0].endsWith('і') && forms[1].endsWith('ів')
				|| forms[0].endsWith('их') && forms[1].endsWith('і')
				|| forms[0].endsWith('ка') && forms[1].endsWith('ок')
				|| forms[0].endsWith('ят') && forms[1].endsWith('ята')
				|| forms[0].endsWith('') && forms[1].endsWith('ок')
				|| forms[0].endsWith('') && forms[1].endsWith('ць')
				|| forms[0].endsWith('') && forms[1].endsWith('и')
				|| forms[0].endsWith('') && forms[1].endsWith('і')
			)) {
			dupTags.delete(tagNorm);
		}
		else if (tagSet.has('noun')
			&& tagSet.has('v_mis')
			&& tagSet.has('n')
			&& forms.length === 2
			&& forms[0].endsWith('і') && forms[1].endsWith('ю')) {
			dupTags.delete(tagNorm);
		}
		// Кирєєві, Кирєєву
		else if (tagSet.has('noun')
			&& tagSet.has('anim')
			&& tagSet.has('v_mis')
			&& tagSet.has('lname')
			&& forms.length === 2) {
			dupTags.delete(tagNorm);
		}
		// стана, стану
		else if (tagSet.has('noun')
			&& tagSet.has('inanim')
			&& tagSet.has('m')
			&& tagSet.has('v_rod')
			&& forms.length === 2
			&& forms[0].endsWith('а') && forms[1].endsWith('у')) {
			dupTags.delete(tagNorm);
		}
	}
}

function replaceLast(str: string, substr: string, replacement: string) {
	let last = str.lastIndexOf(substr);
	if (last >= 0) {
		return str.substring(0, last) + str.substr(last + substr.length);
	}
	
	return str;
}