#!/usr/bin/env node

import { writeFileSync } from 'fs'
import { join } from 'path'
import { parseXmlFileSync } from '../../xml/utils.node'
import { tei2tokenStream, tokenStream2sentences, tokenStream2plaintext } from '../../nlp/utils'
import { sentence2conllu } from './utils'
import { mu } from '../../mu'

import * as glob from 'glob'



function main() {
  // const args: any = require('minimist')(process.argv.slice(2))

  let globStr = process.argv[2]
  let roots = mu(glob.sync(globStr)).map(x => parseXmlFileSync(x))

  for (let root of roots) {
    let tokenStream = tei2tokenStream(root)
    let sentenceStream = mu(tokenStream2sentences(tokenStream))
    sentenceStream.forEach(({sentenceId, tokens}) => {
      let numRoots = mu(tokens).count(x => !x.hasSyntax())
      if (numRoots < tokens.length) {
        if (numRoots !== 1) {
          console.error(`Sentence "${tokenStream2plaintext(tokens)}" has ${numRoots} roots`)
        } else {
          process.stdout.write(sentence2conllu(tokens, sentenceId))
          process.stdout.write('\n\n')
        }
      }
    })
  }
}

if (require.main === module) {
  main()
}
