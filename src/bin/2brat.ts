#!/usr/bin/env node

import { writeFileSync } from 'fs'
import { join } from 'path'
import * as minimist from 'minimist'

import { mu } from '../mu'
import { tokenStream2brat, tokenStream2bratPlaintext } from '../nlp/ud/utils'
import { tei2tokenStream } from '../nlp/utils'
import { parseXmlFileSync } from '../xml/utils.node'
import { parseIntStrict } from '../lang'

import { sync as mkdirpSync } from 'mkdirp'


function main() {
  const args: any = minimist(process.argv.slice(2), {
  })
  let sentPerFile = parseIntStrict(args.n)
  let inputFile = args._[0]
  console.log(`reading ${inputFile}`)

  let root = parseXmlFileSync(inputFile)
  mkdirpSync(args.dest)
  let tokenStream = mu(tei2tokenStream(root))
  let i = 0
  tokenStream.split(x => x.isSentenceEnd() && !(++i % sentPerFile))
    .forEach(chunk => {
      let chunkNum = Math.floor(i / sentPerFile)
      let str = mu(tokenStream2brat(chunk)).join('\n')
      writeFileSync(join(args.dest, `${args.prefix}_${chunkNum}.ann`), str)
      str = mu(tokenStream2bratPlaintext(chunk)).join('\n')
      writeFileSync(join(args.dest, `${args.prefix}_${chunkNum}.txt`), str)
    })
}

if (require.main === module) {
  main()
}
