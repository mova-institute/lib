import {rysin2multext} from '../nlp/rysin2mulext';
import {ioArgs} from '../cli_utils';
import {createInterface} from 'readline';


let [input, output] = ioArgs();


let lemma: string;
let lemmaTag: string;
createInterface({input}).on('line', (line: string) => {
  let isLemma = !line.startsWith(' ');
  let [word, tag] = line.trim().replace('\'', '’').split(' ');
  if (isLemma) {
    lemma = word;
    lemmaTag = tag;
  }

  //console.log(lemma, lemmaTag, word, tag);
  try {
    let multextTags = rysin2multext(lemma, lemmaTag, word, tag);
    for (tag of multextTags) {
      if (!isLemma) {
        output.write('  ');  // todo
      }
      output.write(word + ' ' + tag + '\n');
    }
  }
  catch (e) {
    if (!/\bbad\b/.test(lemmaTag)) {
      console.error('EERR!!    ', lemma, lemmaTag, word, tag);
    }
    //throw e;
  }
});
