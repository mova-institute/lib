import {ioArgs} from '../cli_utils'
import {createTaggerSync} from '../factories.node'
import {readTillEnd} from '../stream_utils.node'
import {tokenizeTeiDom, tagTokenizedDom} from '../nlp/utils'
import {str2lxmlRoot} from '../utils.node'
import {cantBeXml} from '../xml/utils'


let [input, output] = ioArgs();
let tagger = createTaggerSync();



(async () => {
	try {
		let inputStr = await readTillEnd(input);
		if (cantBeXml(inputStr)) {
			inputStr = '<text>' + inputStr + '</text>';
		}
		let root = str2lxmlRoot(inputStr);
		tokenizeTeiDom(root, tagger);
		tagTokenizedDom(root, tagger);
		output.write(root.ownerDocument.toString());
		output.write('\n');
	}
	catch(e) {
		console.log(e);
	}
})();