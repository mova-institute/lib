#!/usr/bin/env node

import { ignorePipeErrors, linesBackpressed } from '../../utils.node';



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {  // todo: make binary and faster
  ignorePipeErrors()

  let insideGap = false
  await linesBackpressed(process.stdin, process.stdout, (line, write) => {
    if (line.startsWith('1')) {
      insideGap = true
    } else if (insideGap) {
      write(`<gap type="dupe"/>\n`)
      insideGap = false
    } else {
      write(`${line.substr(2)}\n`)
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
