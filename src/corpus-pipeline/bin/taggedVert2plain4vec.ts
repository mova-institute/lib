#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'

import * as minimist from 'minimist'



interface Args {
  surfaceColumn: number
  uposColumn: number
  lowercase?: boolean
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  const args: Args = minimist(process.argv.slice(2), {
    boolean: ['lowercase']
  }) as any

  let splitMax = Math.max(args.uposColumn, args.surfaceColumn) + 1

  let firstInSent = true
  linesBackpressedStd((line, writer) => {
    if (!line.includes('\t')) {
      if (/^<\/s>/.test(line)) {
        writer.write('\n')
        firstInSent = true
      }
      return
    }

    let cells = line.split('\t', splitMax)
    let upos = cells[args.uposColumn]
    if (upos === 'punct') {
      return
    }

    let word = cells[args.surfaceColumn]
    if (args.lowercase) {
      word = word.toLowerCase()
    }
    if (!firstInSent) {
      writer.write(' ')
    }

    writer.write(word)

    firstInSent = false
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
