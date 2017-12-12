#!/usr/bin/env node

import { exitOnStdoutPipeError, linesBackpressedStd } from '../../utils.node'
import { BackpressingWriter } from '../../lib/node/backpressing_writer';

import * as fs from 'fs'



const gapTagBytes = Buffer.from(`<gap type="dupe"/>\n`)

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  exitOnStdoutPipeError()

  let offsetWriter = new BackpressingWriter(
    fs.createWriteStream(process.argv[2]), process.stdin)

  let insideGap = false
  let docStartOffset = 0
  let curOffset = 0
  await linesBackpressedStd((line, write) => {
    if (line.startsWith('1')) {
      if (!/^1\t<doc[\s>]/.test(line)) {
        insideGap = true
      }
    } else {
      if (insideGap) {
        write(gapTagBytes)
        curOffset += gapTagBytes.length
        insideGap = false
      }
      let outLine = `${line.substr(2)}\n`
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
  main().catch(e => console.error(e))
}
