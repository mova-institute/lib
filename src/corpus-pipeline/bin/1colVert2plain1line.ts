#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'
import { unescape } from 'he'


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  linesBackpressedStd((line, writer) => {
    if (!line.startsWith('<')) {
      writer.write(unescape(line))
      writer.write(' ')
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
