#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'
import { unescape } from 'he'


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  linesBackpressedStd((line, write) => {
    if (!line.startsWith('<')) {
      write(unescape(line) + ' ')
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
