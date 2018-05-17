#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'

import * as minimist from 'minimist'



interface Args {
  surfaceColumn: number
  uposColumn: number
  lowercase?: boolean
  noPunct?: boolean
  newContextOnRe?: string
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  const args: Args = minimist(process.argv.slice(2), {
    boolean: [
      'lowercase',
      'noPunct',
    ]
  }) as any

  let newContextRe = new RegExp(args.newContextOnRe || '^</doc>')

  let splitMax = Math.max(args.uposColumn, args.surfaceColumn) + 1

  let firstInSent = true
  linesBackpressedStd((line, writer) => {
    if (!line.includes('\t')) {
      if (newContextRe.test(line)) {
        writer.write('\n')
        firstInSent = true
      }
      return
    }

    let cells = line.split('\t', splitMax)
    let upos = cells[args.uposColumn]
    if (args.noPunct && upos === 'punct') {
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
