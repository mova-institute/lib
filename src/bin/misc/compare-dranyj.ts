import {linesSync} from '../../utils.node';

const args = require('minimist')(process.argv.slice(2));

let lemmataSheva = new Map<string, Set<string>>();
for (let line of linesSync(args.sheva)) {
  let [, lemma, tag] = line.split(' ');
  if (!lemmataSheva.has(lemma)) {
    lemmataSheva.set(lemma, new Set());
  }
  lemmataSheva.get(lemma).add(tag);
}

let lemmataRysin = new Map<string, Set<string>>();
for (let line of linesSync(args.rysin)) {
  if (!line.startsWith(' ')) {
    let [lemma, tag] = line.split(' ');
    if (!lemmataRysin.has(lemma)) {
      lemmataRysin.set(lemma, new Set());
    }
    lemmataRysin.get(lemma).add(tag);
  }
}

for (let [lemma, tags] of lemmataSheva) {
  for (let tag of tags) {
    if (tag && /^A[fo]/.test(tag) && !/^.........a/.test(tag)) {
      if (tag.startsWith('Ao')) {
        console.error('ordinal: ' + lemma);
      }
      let rysins = [...lemmataRysin.get(lemma)];
      if (rysins.length
          && rysins.some(x => x.startsWith('Ap'))
          && !rysins.some(x => /^A[fo]/.test(x))) {
        console.log(lemma);
        break;
      }
    }
  }
}
