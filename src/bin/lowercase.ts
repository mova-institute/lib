#!/usr/bin/env node

import { BufferedBackpressWriter } from '../lib/node/backpressing_writer'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  process.stdin.setEncoding('utf8')
  let writer = new BufferedBackpressWriter(process.stdout, process.stdin)
  process.stdin.on('data', data => {
    writer.write(data.toLowerCase())
  }).on('close', () => writer.flush())
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
