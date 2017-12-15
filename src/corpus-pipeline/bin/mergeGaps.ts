#!/usr/bin/env node

import { exitOnStdoutPipeError, linesBackpressedStd } from '../../utils.node'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  let currGapTypes = []
  linesBackpressedStd((line, write) => {
    let match = line.match(/^<gap type="([^"]+)"/)
    if (match) {
      currGapTypes.push(match[1])
    } else {
      if (currGapTypes.length) {
        write(`<gap type="${currGapTypes.join(' ')}"/>\n`)
        currGapTypes = []
      }
      write(line)
      write('\n')
    }
  })
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
