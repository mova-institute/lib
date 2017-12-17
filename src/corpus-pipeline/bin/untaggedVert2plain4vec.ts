#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'
import { unescape } from 'he'


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  let newContextOn = new RegExp(process.argv[2] || /^<\/doc>/)

  let firstInContext = true
  linesBackpressedStd((line, write) => {
    if (line.startsWith('<')) {
      if (newContextOn.test(line)) {
        write('\n')
        firstInContext = true
      }
      return
    }
    if (!firstInContext) {
      write(' ')
    }
    write(unescape(line))
    firstInContext = false
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
