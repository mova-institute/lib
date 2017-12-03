#!/usr/bin/env node

import { ignorePipeErrors, linesBackpressedStd } from '../../utils.node'
import { writeBackpressed } from '../../stream_utils.node'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {  // todo: make it binary thus faster
  ignorePipeErrors()

  let insideGap = false
  await linesBackpressedStd((line, write) => {
    if (line.startsWith('1')) {
      insideGap = true
    } else {
      if (insideGap) {
        write(`<gap type="dupe"/>\n`)
        insideGap = false
      }
      write(`${line.substr(2)}\n`)
    }
  })
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
