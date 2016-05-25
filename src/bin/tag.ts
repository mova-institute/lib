import { ioArgsPlain } from '../cli_utils';
import { createMorphAnalyserSync } from '../nlp/morph_analyzer/factories.node';
import { readTillEnd } from '../stream_utils.node';
import { tokenizeTei, tagTokenizedDom, enumerateWords } from '../nlp/utils';
import { string2lxmlRoot } from '../utils.node';
import { encloseInRootNsIf } from '../xml/utils';
import { createReadStream, readFileSync } from 'fs';
import { getLibRootRelative } from '../path.node';

const args = require('minimist')(process.argv.slice(2), {
  boolean: ['n', 'numerate', 'tokenize'],
});


ioArgsPlain(async (input, outputFromIoargs) => {
  let inputStr = args.t || args.text;
  let output;
  if (inputStr) {
    output = args._[0] && createReadStream(args._[0]) || process.stdout;
  }
  else {
    output = outputFromIoargs;
    inputStr = await readTillEnd(input);
    // inputStr = readFileSync(args._[0], 'utf8');
  }

  inputStr = encloseInRootNsIf(inputStr);


  let dictName = args.d || args.dict || 'vesum';
  let dictDir = getLibRootRelative('../data/dict', dictName);
  let tagger = createMorphAnalyserSync(dictDir);

  let root = string2lxmlRoot(inputStr);
  tokenizeTei(root, tagger);
  if (!args.tokenize) {
    tagTokenizedDom(root, tagger);
  }

  if (args.n || args.numerate) {
    enumerateWords(root);
  }

  output.write(root.document.serialize());
  output.write('\n');
});
