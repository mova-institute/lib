#!/usr/bin/env node

import { createInterface } from 'readline'

import { CatStreamEnqueueable } from '../cat_stream_enqueueable'



//------------------------------------------------------------------------------
function main() {
  let stream = new CatStreamEnqueueable()

  createInterface(process.stdin)
    .on('line', stream.enqueue)
    .on('close', stream.setEndOnDrain)

  stream.pipe(process.stdout)
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
