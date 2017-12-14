#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  let firstInSent = true
  linesBackpressedStd((line, write) => {
    if (line.startsWith('<')) {
      if (/^<\/s>/.test(line)) {
        write('\n')
        firstInSent = true
      }
      return
    }
    if (!firstInSent) {
      write(' ')
    }
    write(line)
    firstInSent = false
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
