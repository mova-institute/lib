#!/usr/bin/env node

import { exitOnStdoutPipeError, linesBackpressedStd } from '../../utils.node'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  let currGapTypes = []
  linesBackpressedStd((line, writer) => {
    let match = line.match(/^<gap type="([^"]+)"/)
    if (match) {
      currGapTypes.push(match[1])
    } else {
      if (currGapTypes.length) {
        writer.write(`<gap type="${currGapTypes.join(' ')}"/>\n`)
        currGapTypes = []
      }
      writer.write(line)
      writer.write('\n')
    }
  })
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
