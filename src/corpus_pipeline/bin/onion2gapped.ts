#!/usr/bin/env node

import { linesBackpressedStdPipeable } from '../../utils.node'

const enum GapType {
  none,
  par,
  doc,
}

async function main() {
  let gap = GapType.none
  await linesBackpressedStdPipeable((line, writer) => {
    if (line.startsWith('1')) {
      // onion marked it as a dupe
      if (!gap) {
        gap = /^..<doc[\s>]/.test(line) ? GapType.doc : GapType.par
      }
    } else {
      if (gap) {
        if (gap === GapType.par) {
          writer.write(`<gap type="dupe"/>\n`)
        }
        gap = GapType.none
      }
      writer.write(`${line.substr(2)}\n`)
    }
  })
}

if (require.main === module) {
  main()
}
