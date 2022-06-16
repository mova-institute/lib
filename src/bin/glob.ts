#!/usr/bin/env node

import { createInterface } from 'readline'

import * as glob from 'glob'
import minimist from 'minimist'


//------------------------------------------------------------------------------
function main() {
  let args = minimist(process.argv.splice(2))

  if (process.stdin.isTTY) {
    args._.forEach(x => globAndWrite(x, args))
  } else {
    createInterface(process.stdin)
      .on('line', line => globAndWrite(line, args))
      .on('close', () => args._.forEach(x => globAndWrite(x, args)))
  }
}

//------------------------------------------------------------------------------
function globAndWrite(globStr: string, args) {
  let paths = glob.sync(globStr, args)
  if (paths.length) {
    process.stdout.write(paths.join('\n') + '\n')
  }
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
