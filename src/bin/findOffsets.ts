#!/usr/bin/env node

import { exitOnStdoutPipeError, linesBackpressedStd } from '../utils.node'

import { Buffer } from 'buffer'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  let findRe = new RegExp(process.argv[2])

  let curOffset = 0
  let lastOffset = 0
  let lastHit: string
  linesBackpressedStd((line, write) => {
    if (findRe.test(line)) {
      if (curOffset) {
        write(`${lastOffset}\t${curOffset - lastOffset}\t${lastHit}\n`)
        lastOffset = curOffset
      }
      lastHit = line
    }
    curOffset += Buffer.from(line).length + 1
  })

  if (curOffset) {
    process.stdout.write(`${lastOffset}\t${curOffset - lastOffset}\t${lastHit}\n`)
  }
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
