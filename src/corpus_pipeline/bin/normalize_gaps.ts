#!/usr/bin/env node

import { linesBackpressedStdPipeable } from '../../utils.node'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  let isInsideDoc = false
  let currGapTypes = []
  await linesBackpressedStdPipeable((line, writer) => {
    let match = line.match(/^<gap type="([^"]+)"/)
    if (match) {
      if (isInsideDoc) {
        currGapTypes.push(match[1])
      }
    } else {
      if (/^<doc[\s>]/.test(line)) {
        isInsideDoc = true
      } else if (line.startsWith('</doc>')) {
        isInsideDoc = false
      }

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
