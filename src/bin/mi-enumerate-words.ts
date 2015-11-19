import {ioArgs} from '../cli_utils'
import {readTillEnd} from '../stream_utils.node'
import {str2jsdomRoot} from '../utils.node'
import {W_} from '../nlp/common_elements'
import {traverseDepthEl, nameNsEl} from '../xml/utils'
let xmldom = require('xmldom');



let [input, output] = ioArgs();

(async () => {
	let doc = str2jsdomRoot(await readTillEnd(input));
	let idGen = 0;
	traverseDepthEl(doc, (el: HTMLElement) => {
		if (el.localName === 'mi:w_') { // todo, fuckyou, jsdom!
			el.setAttribute('word-id', (idGen++).toString());
		}
	});
	output.write(new xmldom.XMLSerializer().serializeToString(doc.ownerDocument));
})();