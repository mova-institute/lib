#!/usr/bin/env node

import { linesBackpressedStdPipeable } from '../../utils.node'

import minimist from 'minimist'

interface Args {
  surfaceColumn: number
  uposColumn: number
  lowercase?: boolean
  noPunct?: boolean
  newContextOn?: string
}

function main() {
  const args = minimist<Args>(process.argv.slice(2), {
    boolean: ['lowercase', 'noPunct'],
  }) as any

  args.newContextOn = args.newContextOn || 'doc'
  let newContextRe = new RegExp(`^</${args.newContextOn}>`)

  let splitMax = Math.max(args.uposColumn, args.surfaceColumn) + 1

  let firstInSent = true
  linesBackpressedStdPipeable((line, writer) => {
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

if (require.main === module) {
  main()
}
