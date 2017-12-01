#!/usr/bin/env node

import { linesAsync, joinToStream, ignorePipeErrors } from '../../utils.node';
import { conlluStrAndMeta2vertical } from '../tovert'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  ignorePipeErrors()
  process.stdin.setEncoding('utf8')
  linesAsync(process.stdin, docs => {
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
