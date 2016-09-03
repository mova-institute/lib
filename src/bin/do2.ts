import { gatherXps } from '../nlp/vesum_utils'

import * as glob from 'glob'
import { readFileSync } from 'fs'

const args = require('minimist')(process.argv.slice(2), {
  boolean: [],
})

let filestrs = glob.sync(args._[0]).map(x => readFileSync(x, 'utf8'))

for (let line of gatherXps(filestrs)) {
  process.stdout.write(line + '\n', 'utf8')
}
