#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'
import { unescape } from 'he'


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  let newContextOn = new RegExp(process.argv[2] || /^<\/doc>/)

  let firstInContext = true
  linesBackpressedStd((line, writer) => {
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

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
