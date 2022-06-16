#!/usr/bin/env node

import { linesBackpressedStdPipeable } from '../../utils.node'
import { unescape } from 'he'



function main() {
  let newContextOn = new RegExp(process.argv[2] || '^</doc>')

  let firstInContext = true
  linesBackpressedStdPipeable((line, writer) => {
    if (line.startsWith('<')) {
      if (newContextOn.test(line)) {
        writer.write('\n')
        firstInContext = true
      }
      return
    }
    if (!firstInContext) {
      writer.write(' ')
    }
    writer.write(unescape(line))
    firstInContext = false
  })
  process.stdout.write('\n')
}

if (require.main === module) {
  main()
}
