#!/usr/bin/env node

import { writeFileSync } from 'fs'
import { join } from 'path'
import { parseXmlFileSync } from '../../xml/utils.node'
import { tei2tokenStream, tokenStream2sentences, tokenStream2plaintextString } from '../../nlp/utils'
import { sentence2conllu } from './utils'
import { mu } from '../../mu'
import { validateSentence } from './validation'

import * as glob from 'glob'



function main() {
  // const args: any = require('minimist')(process.argv.slice(2))

  let globStr = process.argv[2]
  let roots = mu(glob.sync(globStr)).map(x => parseXmlFileSync(x))

  let wordsExported = 0
  let wordsKept = 0
  for (let root of roots) {
    let tokenStream = tei2tokenStream(root)
    let sentenceStream = mu(tokenStream2sentences(tokenStream))
    sentenceStream.forEach(({sentenceId, tokens}) => {
      let numRoots = mu(tokens).count(x => !x.hasSyntax())
      let numWords = mu(tokens).count(x => !x.interp0().isPunctuation())
      if (numRoots < tokens.length) {
        if (numRoots !== 1) {
          wordsKept += numWords
          let text = tokenStream2plaintextString(tokens).slice(0, 30)
          // console.error(`Sentence ${sentenceId} has ${numRoots} roots: "${text}" `)
        } else {
          let problems = validateSentence(tokens)
          if (problems.length) {
            let text = tokenStream2plaintextString(tokens)
            wordsKept += numWords
            console.error(`Проблеми в реченні "${text}":\n${problems.join('\n')}\n`)
          } else {
            wordsExported += numWords
            process.stdout.write(sentence2conllu(tokens, sentenceId))
            process.stdout.write('\n\n')
          }
        }
      }
    })
  }
  console.error(`Words exported: ${wordsExported}\nWords kept: ${wordsKept}`)
}

if (require.main === module) {
  main()
}
