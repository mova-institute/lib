#!/usr/bin/env node

import { exitOnStdoutPipeError, linesBackpressedStd } from '../../utils.node'

import * as fs from 'fs'



const gapTagBytes = Buffer.from(`<gap type="dupe"/>\n`)

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  let insideGap = false
  linesBackpressedStd((line, writer) => {
    let isMarkedAsDupe = line.startsWith('1')
    let payload = line.substr(2)

    if (isMarkedAsDupe) {
      if (!/^<doc[\s>]/.test(payload)) {
        insideGap = true
      }
    } else {
      if (insideGap) {
        writer.write(gapTagBytes)
        insideGap = false
      }
      writer.write(`${payload}\n`)
    }
  })
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
