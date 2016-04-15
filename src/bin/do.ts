import {ioArgs4} from '../cli_utils';
import {readTillEnd} from '../stream_utils.node';
import {string2lxmlRoot} from '../utils.node';
import {IElement} from '../xml/api/interface';

const args = require('minimist')(process.argv.slice(2), {
  boolean: ['xml', 'inplace'],
});

let [path, funcName, filename1, filename2] = args._;
if (args.inplace) {
  filename2 = filename1;
}

let moduleObj = require('../' + path);
let func = moduleObj[funcName];


ioArgs4(filename1, filename2, async (input, output) => {
  try {
    let inputStr = await readTillEnd(input);

    if (args.xml) {
      let root = string2lxmlRoot(inputStr);
      let res: IElement = func(root) || root;
      output.write(res.ownerDocument.serialize());
    }
    else {
      let res = func(inputStr);
      res && output.write(res);
    }
  }
  catch (e) {
    console.error(e.stack);
  }
});
