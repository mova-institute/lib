#!/usr/bin/env node

import * as glob from 'glob'

import { allLinesFromStdin, exitOnStdoutPipeError } from '../utils.node'
import { CatStream } from '../cat_stream'
import { mu } from '../mu'



if (require.main === module) {
  main()
}

async function main() {
  let globStrFromArgs = process.argv[2]
  let globs = [globStrFromArgs] || (await allLinesFromStdin())
  let files = mu(globs).map(x => glob.sync(x)).flatten()
  let stream = new CatStream(files)
  stream.pipe(process.stdout)
  exitOnStdoutPipeError()
}
