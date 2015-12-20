import {linesSync} from '../../utils.node';
import {createWriteStream} from 'fs';

let args = require('minimist')(process.argv.slice(2));

let output = createWriteStream(args.o);

let lexemes = new Map<string, Map<string, string>>();
for (let line of linesSync(args.i)) {
	if (!line.includes(' ')) {
    let [form, lemma, tag] = line.split(',');
    if (!lexemes.has(lemma)) {
      lexemes.set(lemma, new Map());
    }
    lexemes.get(lemma).set(form, tag);
  }
}

for (let [lemma, lexeme] of lexemes) {
  output.write(lemma + ' ' + lexeme.get(lemma) + '\n');
  for (let [form, tag] of lexeme) {
    if (form !== lemma) {
      output.write('  ' + form + ' ' + tag + '\n');
    }
  }
}