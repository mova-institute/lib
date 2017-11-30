#!/usr/bin/env node

import { linesCb, joinToStream } from '../../utils.node';
import { conlluStrAndMeta2vertical } from '../tovert'



async function main() {
  process.stdin.setEncoding('utf8')
  linesCb(process.stdin, (docs, ready) => {
    for (let docConlluStr of docs) {
      if (docConlluStr) {
        let stream = conlluStrAndMeta2vertical(docConlluStr)
        joinToStream(stream, process.stdout, '\n', true)
      }
    }
    ready()
  }, '# newdoc')
}

if (require.main === module) {
  main().catch(e => console.error(e))
}
