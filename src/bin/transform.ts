import {ioArgs2} from '../cli_utils';
import * as transforms from '../transforms';

const args = require('minimist')(process.argv.slice(2));


let command = args._[0];

try {
  ioArgs2(args._.slice(1), (input, output) => {
    return transforms[command](input, output);
  });
}
catch (e) {
  console.error(e.stack);
}
