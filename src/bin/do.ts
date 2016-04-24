import {ioArgs} from '../cli_utils';
import {readTillEnd} from '../stream_utils.node';
import {string2lxmlRoot} from '../utils.node';

const args = require('minimist')(process.argv.slice(2), {
  boolean: ['xml', 'inplace'],
});

let [path, funcName, filename1, filename2] = args._;
if (args.inplace) {
  filename2 = filename1;
}

let moduleObj = require('../' + path);
let func = moduleObj[funcName];


ioArgs(filename1, filename2, async (input, output) => {
  try {
    let inputStr = await readTillEnd(input);

    if (args.xml) {
      let root = string2lxmlRoot(inputStr);
      let res = func(root);
      if (typeof res === 'string') {
        output.write(res);
      }
      else {
        output.write((res || root).ownerDocument.serialize());
      }
    }
    else {
      let res = func(inputStr);
      if (res) {
        output.write(res);
      }
    }
  }
  catch (e) {
    console.error(e.stack);
  }
});
