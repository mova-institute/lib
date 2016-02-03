import * as transforms from '../transforms';

const args = require('minimist')(process.argv.slice(2));


let command = args._[0];
args._ = args._.splice(1);

transforms[command](args);