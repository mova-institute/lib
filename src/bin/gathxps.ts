import { gatherXps } from '../nlp/vesum'

import * as glob from 'glob'
import { readFileSync } from 'fs'

const args = require('minimist')(process.argv.slice(2), {
  boolean: [],
})

let lines = glob
  .sync(args._[0])
  .map((x) => readFileSync(x, 'utf8'))
  .join('\n')
  .split('\n')

for (let line of gatherXps(lines)) {
  process.stdout.write(line + '\n', 'utf8')
}
