import {rysin2multext} from '../nlp/rysin2mulext'
import {ioArgs} from '../cli_utils'
import {createInterface} from 'readline'


let [input, output] = ioArgs();


let lemma: string;
let lemmaTag: string;
createInterface({input}).on('line', (line: string) => {
	let isLemma = !line.startsWith(' ');
	let [word, tag] = line.trim().split(' ');
	if (isLemma) {
		lemma = word;
		lemmaTag = tag;
	} else {
		output.write('  ');
	}
	
	console.log(lemma, lemmaTag, word, tag);
	let multextTag = rysin2multext(lemma, lemmaTag, word, tag);
	
	output.write(word + ' ' + multextTag.join(',') + ' ' + tag + '\n');
});