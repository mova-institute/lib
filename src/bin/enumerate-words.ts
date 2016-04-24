import {ioArgsPlain} from '../cli_utils';
import {stream2lxmlRoot} from '../utils.node';
import {enumerateWords} from '../nlp/utils';

ioArgsPlain(async (input, output) => {
  let root = await stream2lxmlRoot(input);
  enumerateWords(root);
  output.write(root.ownerDocument.serialize());
});
