//import {logException} from '../lang'
import {IElement} from '../xml/api/interfaces'
import {ioArgs} from '../cli_utils'
import {readTillEnd} from '../stream_utils.node'
import {W_} from '../nlp/common_elements'
import {traverseDepthEl} from '../xml/utils'
import {str2lxmlRoot} from '../utils.node'


let [input, output] = ioArgs();


(async() => {
	try {
		let root = str2lxmlRoot(await readTillEnd(input));
		let idGen = 0;
		traverseDepthEl(root, el => {
			if (el.nameNs() === W_) {
				el.setAttribute('word-id', (idGen++).toString());
			}
		});
		output.write(root.ownerDocument.serialize());
	}
	catch (e) {
		console.error(e.stack);
	}
})();