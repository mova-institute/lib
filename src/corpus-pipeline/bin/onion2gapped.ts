#!/usr/bin/env node

import { exitOnStdoutPipeError, linesBackpressedStd } from '../../utils.node'
import { BackpressingWriter } from '../../lib/node/backpressing_writer';

import * as fs from 'fs'



const gapTagBytes = Buffer.from(`<gap type="dupe"/>\n`)

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  let offsetWriter = new BackpressingWriter(
    fs.createWriteStream(process.argv[2]), process.stdin)

  let insideGap = false
  let docStartOffset = 0
  let curOffset = 0
  linesBackpressedStd((line, write) => {
    let isMarkedAsDupe = line.startsWith('1')
    let payload = line.substr(2)

    if (isMarkedAsDupe) {
      if (!/^<doc[\s>]/.test(payload)) {
        insideGap = true
      }
    } else {
      if (insideGap) {
        write(gapTagBytes)
        curOffset += gapTagBytes.length
        insideGap = false
      }
      let outLine = `${payload}\n`
      let bytes = Buffer.from(outLine)
      write(bytes)
      curOffset += bytes.length
      if (/^<\/doc>/.test(outLine)) {
        offsetWriter.write(`${docStartOffset}\t${curOffset - docStartOffset}\n`)
        docStartOffset = curOffset
      }
    }
  })
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
