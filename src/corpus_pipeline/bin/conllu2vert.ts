#!/usr/bin/env node

import { lineBulksAsync, joinToStream, exitOnStdoutPipeError } from '../../utils.node'
import { conlluStrAndMeta2vertical } from '../tovert'



//------------------------------------------------------------------------------
async function main() {
  exitOnStdoutPipeError()
  process.stdin.setEncoding('utf8')
  lineBulksAsync(process.stdin, undefined, docs => {
    for (let docConlluStr of docs) {
      if (docConlluStr) {
        let stream = conlluStrAndMeta2vertical(docConlluStr)
        joinToStream(stream, process.stdout, '\n', true)
      }
    }
  }, '# newdoc')
}

if (require.main === module) {
  main().catch(e => console.error(e))
}
