import { filename2lxmlRootSync } from '../utils.node'
import { tei2nosketch } from './utils'

import * as fs from 'fs'
import * as path from 'path';

const globSync = require('glob').sync
const args = require('minimist')(process.argv.slice(2))



main()

//------------------------------------------------------------------------------
function main() {
  let sourcePaths = globSync(args._[0])
  let dest = fs.openSync(args.out, 'a');
  for (let [i, sourcePath] of sourcePaths.entries()) {
    let basename = path.basename(sourcePath);
//console.log('pasing');

    let root = filename2lxmlRootSync(sourcePath)

    console.log(`processing ${i + 1} of ${sourcePaths.length} "${basename}"`);
    for (let line of tei2nosketch(root)) {
      fs.appendFileSync(dest as any, line + '\n', 'utf8');
    }
  }
}
