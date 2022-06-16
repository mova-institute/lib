#!/usr/bin/env node

import { linesBackpressedStdPipeable } from '../../utils.node'
import { unescape } from 'he'

function main() {
  linesBackpressedStdPipeable((line, writer) => {
    if (!line.startsWith('<')) {
      writer.write(unescape(line))
      writer.write(' ')
    }
  })
}

if (require.main === module) {
  main()
}
