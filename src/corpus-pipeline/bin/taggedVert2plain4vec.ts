#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'

import * as minimist from 'minimist'



interface Args {
  lemma: boolean
  lowercase: boolean
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  exitOnStdoutPipeError()

  const args: Args = minimist(process.argv.slice(2), {
    boolean: ['lemma', 'lowercase`']
  }) as any

  let firstInSent = true
  linesBackpressedStd((line, writer) => {
    if (!line.includes('\t')) {
      if (/^<\/s>/.test(line)) {
        writer.write('\n')
        firstInSent = true
      }
      return
    }
    let [form, lemma, , pos] = line.split('\t', 4)
    if (pos === 'punct') {
      return
    }

    let word = args.lemma ? lemma : form
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
