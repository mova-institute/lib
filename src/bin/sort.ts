import {ioArgs3} from '../cli_utils';
import {readTillEnd} from '../stream_utils.node';

const args = require('minimist')(process.argv.slice(2));

let [input, output] = ioArgs3(args._[0], args._[1]);


let collator = new Intl.Collator('uk-dict-UA', {
    sensitivity: 'base',
    //ignorePunctuation: true,
    //localeMatcher: 'lookup',
    //numeric: true,
    caseFirst: 'upper'
  });

async function main() {
  let inputStr = await readTillEnd(input);
  output.write(inputStr.split('\n').filter(x => !!x).sort(collator.compare).join('\n'));
}

main();