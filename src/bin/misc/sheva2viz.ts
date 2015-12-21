import {linesSync} from '../../utils.node';
import {createWriteStream} from 'fs';

let args = require('minimist')(process.argv.slice(2));

let output = createWriteStream(args.o);

let lexemes = new Map<string, Array<[string, string]>>();
for (let line of linesSync(args.i)) {
  if (!line.includes(' ')) {
    let [form, lemma, tag] = line.split(',');
    if (!lexemes.has(lemma)) {
      lexemes.set(lemma, []);
    }
    lexemes.get(lemma).push([form, tag]);
  }
}

for (let [lemma, lexeme] of lexemes) {
  output.write(lexeme[0][0] + ' ' + lexeme[0][1] + '\n');
  for (let i = 1; i < lexeme.length; ++i) {
    let [form, tag] = lexeme[i];
    output.write('  ' + form + ' ' + tag + '\n');
  }
}