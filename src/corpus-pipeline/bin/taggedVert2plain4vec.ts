#!/usr/bin/env node

import { linesBackpressedStd } from '../../utils.node'

import * as glob from 'glob'
import * as minimist from 'minimist'

import * as fs from 'fs'
import { join } from 'path'



interface Args {
  lemma: boolean
  noLc: boolean
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2), {
    boolean: ['lemma', 'noLc']
  }) as any

  let firstInSent = true
  await linesBackpressedStd((line, write) => {
    if (!line.includes('\t')) {
      if (/^<s[> ]/.test(line)) {
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
    if (!args.noLc) {
      word = word.toLowerCase()
    }
    if (!firstInSent) {
      write(' ')
      firstInSent = false
    }

    write(word)
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
