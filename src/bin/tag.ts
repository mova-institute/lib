import {ioArgs} from '../cli_utils'
import {createMorphAnalyserSync} from '../nlp/morph_analyzer/factories.node'
import {readTillEnd} from '../stream_utils.node'
import {tokenizeTeiDom, tagTokenizedDom} from '../nlp/utils'
import {string2lxmlRoot} from '../utils.node'
import {cantBeXml} from '../xml/utils'
import {createReadStream} from 'fs'
import {join} from 'path';

let args = require('minimist')(process.argv.slice(2));


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
		
		if (cantBeXml(inputStr)) {
			inputStr = '<text xmlns="http://www.tei-c.org/ns/1.0" xmlns:mi="https://mova.institute/ns/mi/1" xml:lang="uk">'
				+ inputStr + '</text>';
		}
    
    let dictName = args.d || args.dict || 'rysin-mte';
    let dictDir = join(__dirname, '../../data/dict', dictName);
		let tagger = createMorphAnalyserSync(dictDir);
    
		let root = string2lxmlRoot(inputStr);
		tokenizeTeiDom(root, tagger);
		tagTokenizedDom(root, tagger);
		output.write(root.ownerDocument.serialize());
		output.write('\n');
	}
	catch(e) {
		console.error(e.stack);
	}
})();