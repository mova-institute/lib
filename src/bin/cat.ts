#!/usr/bin/env node

import { CatStreamEnqueueable } from '../cat_stream_enqueueable'
import { mu } from '../mu'
import { trimmedNonemptyLinesSync } from '../utils.node'

import { createInterface } from 'readline'
import minimist = require('minimist')

interface Args {}

function main() {
  const args = minimist<Args>(process.argv.slice(2))
  let [fileWithNames] = args._

  let stream = new CatStreamEnqueueable()

  if (fileWithNames) {
    mu(trimmedNonemptyLinesSync(fileWithNames)).forEach((x) =>
      stream.enqueue(x),
    )
  } else {
    createInterface(process.stdin)
      .on('line', stream.enqueue)
      .on('close', stream.setEndOnDrain)
  }

  stream.pipe(process.stdout)
}

if (require.main === module) {
  main()
}
