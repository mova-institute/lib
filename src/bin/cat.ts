#!/usr/bin/env node

import { createInterface } from 'readline'

import { CatStreamEnqueueable } from '../cat_stream_enqueueable'



//------------------------------------------------------------------------------
function main() {
  let stream = new CatStreamEnqueueable()

  createInterface(process.stdin)
    .on('line', line => stream.enqueue(line))
    .on('close', () => stream.endOnDrain())

  stream.pipe(process.stdout)
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
