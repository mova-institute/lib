#!/usr/bin/env node

import { forEachLine } from '../utils.node'
import { BufferedWriter } from '../lib/buffered_writer'




async function main() {
  let i = process.argv[2] === '--lemma' ? 1 : 0

  let prevLine: string
  let writer = new BufferedWriter(process.stdout)
  await forEachLine(process.stdin, line => {
    if (line.startsWith('#')) {
      return
    }

    if (line) {
      let cols = line.split('\t', 4 + i)

      if (cols[3] === 'PUNCT') {
        return
      }

      if (prevLine) {
        writer.write(' ')
      }
      writer.write(cols[1 + i])
    } else if (prevLine) {
      writer.write('\n')
    }

    prevLine = line
  })
  writer.flush()
}


//############################
if (require.main === module) {
  main()
}
