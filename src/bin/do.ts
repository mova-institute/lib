import {ioArgs3} from '../cli_utils';
import {readTillEnd} from '../stream_utils.node';
import {string2lxmlRoot} from '../utils.node';
import {IElement} from '../xml/api/interfaces';

const args = require('minimist')(process.argv.slice(2), {
  boolean: ['xml']
});

let [action, filename1, filename2] = args._;
let [funcName, ...path] = action.split('.').reverse();
let moduleObj = require('../' + path.reverse().join('/'));
let func = moduleObj[funcName];
let [input, output] = ioArgs3(filename1, filename2);


main();


async function main() {
  try {
    let inputStr = await readTillEnd(input);

    if (args.xml) {
      let root = string2lxmlRoot(inputStr);
      let res: IElement = func(root);
      output.write(res.ownerDocument.serialize());
    }
    else {
      output.write(func(inputStr));
    }
  }
  catch (e) {
    console.error(e)
  }
}