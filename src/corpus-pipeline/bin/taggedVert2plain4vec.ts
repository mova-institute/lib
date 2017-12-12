#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError } from '../../utils.node'

import * as glob from 'glob'
import * as minimist from 'minimist'

import * as fs from 'fs'
import { join } from 'path'



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
  linesBackpressedStd((line, write) => {
    if (!line.includes('\t')) {
      if (/^<\/s>/.test(line)) {
        write('\n')
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
      write(' ')
    }

    write(word)

    firstInSent = false
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
