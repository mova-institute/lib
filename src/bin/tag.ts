import {ioArgs} from '../cli_utils';
import {createMorphAnalyserSync} from '../nlp/morph_analyzer/factories.node';
import {readTillEnd} from '../stream_utils.node';
import {tokenizeTeiDom, tagTokenizedDom, enumerateWords} from '../nlp/utils';
import {string2lxmlRoot} from '../utils.node';
import {encloseInRootNsIf} from '../xml/utils';
import {createReadStream} from 'fs';
import {join} from 'path';

const args = require('minimist')(process.argv.slice(2));


// todo: treat same file, temp



(async () => {
  try {
    let inputStr = args.t || args.text;
    let output;
    if (inputStr) {
      output = args._[0] && createReadStream(args._[0]) || process.stdout;
    }
    else {
      let [input, outputFromIoargs] = ioArgs();
      output = outputFromIoargs;
      inputStr = await readTillEnd(input);
    }
    
    inputStr = encloseInRootNsIf(inputStr);
    
    
    let dictName = args.d || args.dict || 'vesum';
    let dictDir = join(__dirname, '../../data/dict', dictName);
    let tagger = createMorphAnalyserSync(dictDir);
    
    let root = string2lxmlRoot(inputStr);
    tokenizeTeiDom(root, tagger);
    tagTokenizedDom(root, tagger);
    
    if (args.n || args.numerate) {
      enumerateWords(root);
    }
    
    output.write(root.ownerDocument.serialize());
    output.write('\n');
  }
  catch(e) {
    console.error(e.stack);
  }
})();
