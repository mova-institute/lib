import {IElement} from '../xml/interfaces'
import {ioArgs} from '../cli_utils'
import {readTillEnd} from '../stream_utils.node'
//import {W_} from '../nlp/common_elements'
import {traverseDepthEl/*, nameNsEl*/} from '../xml/utils'
import {str2lxmlRoot} from '../utils.node'


let [input, output] = ioArgs();

(async () => {
	let inputStr = await readTillEnd(input);
	let root = str2lxmlRoot(inputStr);
	let idGen = 0;
	traverseDepthEl(root, (el: IElement) => {
		if (el.localName === 'w_') {
			el.setAttribute('word-id', (idGen++).toString());
		}
	});
	output.write(root.ownerDocument.toString());
})();