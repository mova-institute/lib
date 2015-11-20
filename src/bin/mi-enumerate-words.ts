import {IElement} from '../xml/interfaces'
import {ioArgs} from '../cli_utils'
import {readTillEnd} from '../stream_utils.node'
import {W_} from '../nlp/common_elements'
import {traverseDepthEl} from '../xml/utils'
import {str2lxmlRoot} from '../utils.node'


let [input, output] = ioArgs();

(async () => {
	let root = str2lxmlRoot(await readTillEnd(input));
	let idGen = 0;
	traverseDepthEl(root, (el: IElement) => {
		if (el.nameNs() === W_) {
			el.setAttribute('word-id', (idGen++).toString());
		}
	});
	output.write(root.ownerDocument.toString());
})();