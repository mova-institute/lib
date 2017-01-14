#!/usr/bin/env node

/*

mi-2brat input.xml -n 5 --prefix prefix --dest ~/Downloads/dest

*/

import { writeFileSync } from 'fs'
import { join } from 'path'
import * as minimist from 'minimist'

import { mu } from '../mu'
import { tokenStream2brat, tokenStream2bratPlaintext } from '../nlp/ud/utils'
import { tei2tokenStream, splitNSentences } from '../nlp/utils'
import { parseXmlFileSync } from '../xml/utils.node'
import { parseIntStrict } from '../lang'
import { zerofillMax } from '../string_utils'

import { sync as mkdirpSync } from 'mkdirp'


function main() {
  const args: any = minimist(process.argv.slice(2), {
    default: {
      'n': 5,
      'dest': '.',
      'prefix': 'chunk',
    },
  })

  let sentPerFile = parseIntStrict(args.n)
  let inputFile = args._[0]
  console.log(`reading ${inputFile}`)

  let root = parseXmlFileSync(inputFile)
  mkdirpSync(args.dest)
  let tokenStream = mu(tei2tokenStream(root))
  let chunks = mu(splitNSentences(tokenStream, sentPerFile)).toArray()
  for (let [i, chunk] of chunks.entries()) {
    let filename = `${args.prefix}_${zerofillMax(i + 1, chunks.length)}`
    let str = mu(tokenStream2brat(chunk)).join('\n')

    writeFileSync(join(args.dest, `${filename}.ann`), str)
    str = mu(tokenStream2bratPlaintext(chunk)).join('\n')
    writeFileSync(join(args.dest, `${filename}.txt`), str)
  }
}

if (require.main === module) {
  main()
}
