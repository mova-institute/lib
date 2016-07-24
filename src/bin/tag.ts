import { ioArgsPlain } from '../cli_utils';
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node';
import { readTillEnd } from '../stream_utils.node';
import { tokenizeTei, morphInterpret, enumerateWords } from '../nlp/utils';
import { $t } from '../nlp/text_token';
import { string2lxmlRoot } from '../utils.node';
import { encloseInRootNsIf, NS } from '../xml/utils';
import * as xmlutils from '../xml/utils';
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

  inputStr = xmlutils.removeProcessingInstructions(inputStr);
  if (!/^<[^>]*xmlns:mi="http:\/\/mova\.institute\/ns\/corpora\/0\.1"/.test(inputStr)) {
    inputStr = xmlutils.encloseInRootNs(inputStr);
  }


  let dictName = args.d || args.dict || 'vesum';
  let dictDir = getLibRootRelative('../data/dict', dictName);
  let tagger = createMorphAnalyzerSync(dictDir);

  let root = string2lxmlRoot(inputStr);
  tokenizeTei(root, tagger);
  if (!args.tokenize) {
    morphInterpret(root, tagger);
  }
  if (args.unknown) {
    let unknowns = new Set(root.evaluateElements('//mi:w_[w[@ana="x"]]', NS).map(x => $t(x).text()));
    const collator = new Intl.Collator('uk-UA');
    for (let unknown of [...unknowns].sort(collator.compare)) {
      output.write(unknown + '\n');
    }
  }
  else if (args.count) {
    output.write([...root.evaluateElements('//mi:w_', NS)].length + '\n');
  }
  else {
    if (args.n || args.numerate) {
      enumerateWords(root);
    }
    output.write(root.document().serialize(true));
  }

  output.write('\n');
});
