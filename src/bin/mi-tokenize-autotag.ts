import {ioArgs} from '../cli_utils'
import {createTaggerSync} from '../factories.node'
import {readTillEnd} from '../stream_utils.node'
import {str2jsdomRoot} from '../utils.node'
import {tokenizeTeiDom, tagTokenizedDom} from '../nlp/utils'
let pd = require('pretty-data2').pd;
let xmldom = require('xmldom');



let [input, output] = ioArgs();
let tagger = createTaggerSync();

(async () => {
	let inputStr = await readTillEnd(input);
	let dom = str2jsdomRoot(inputStr);
	if (!dom) {  // plain text
		inputStr = '<text>' + inputStr + '</text>';
		dom = str2jsdomRoot(inputStr);
	}
	let tokenizedDom = tokenizeTeiDom(dom, tagger);
	let taggedDom = tagTokenizedDom(tokenizedDom, tagger);
	let stringi = new xmldom.XMLSerializer().serializeToString(tokenizedDom.ownerDocument);
	output.write(pd.xml(stringi));
	output.write('\n');
})();