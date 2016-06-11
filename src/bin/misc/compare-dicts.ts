import { linesSync } from '../../utils.node';
import { complement } from '../../lang';
import { writeFileSync } from 'fs';

const args = require('minimist')(process.argv.slice(2));


let lemmataSheva = new Set<string>();
for (let line of linesSync(args._[0])) {
  lemmataSheva.add(line.split(' ')[1]/*.replace('\'', '')*/);
}

let lemmataRysin = new Set<string>();
for (let line of linesSync(args._[1])) {
  if (!line.startsWith(' ')) {
    lemmataRysin.add(line.split(' ')[0]/*.replace('\'', '')*/);
  }
}

let shevaExclusive = complement(lemmataSheva, lemmataRysin);
let rysinExclusive = complement(lemmataRysin, lemmataSheva);


let comparator = new Intl.Collator('uk-dict-UA').compare;

writeFileSync('sheva-exlusive.txt', [...shevaExclusive].sort(comparator).join('\n'));
writeFileSync('rysin-exlusive.txt', [...rysinExclusive].sort(comparator).join('\n'));
