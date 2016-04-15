import {ioArgs} from '../cli_utils';
import {stream2lxmlRoot} from '../utils.node';
import {enumerateWords} from '../nlp/utils';


let [input, output] = ioArgs();


(async() => {
  try {
    let root = await stream2lxmlRoot(input);
    enumerateWords(root);
    output.write(root.ownerDocument.serialize());
  }
  catch (e) {
    console.error(e.stack);
  }
})();
