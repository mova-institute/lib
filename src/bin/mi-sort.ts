import {ioArgs} from '../cli_utils';
import {createInterface} from 'readline';
import * as fs from 'fs';

let filename = process.argv[2];
let input = fs.createReadStream(filename, 'utf8');

//let [input, output] = ioArgs();

let lines = [];
createInterface({input}).on('line', (line: string) => {
	lines.push(line);
}).on('close', () => {
	let collator = new Intl.Collator('uk-dict-UA', {
		sensitivity: 'base',
		//ignorePunctuation: true,
		//localeMatcher: 'lookup',
		//numeric: true,
		caseFirst: 'upper'
	});
	lines.sort(collator.compare);
	fs.createWriteStream(filename).write(lines.join('\n'));
});