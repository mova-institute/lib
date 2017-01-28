#!/usr/bin/env node

import { writeFileSync } from 'fs'
import { join, basename } from 'path'
import * as minimist from 'minimist'

import { mu } from '../mu'
import { tokenStream2brat, tokenStream2bratPlaintext } from '../nlp/ud/utils'
import { tei2tokenStream, tokenStream2sentences } from '../nlp/utils'
import { Token } from '../nlp/token'
import { parseXmlFileSync } from '../xml/utils.node'
import { parseIntStrict } from '../lang'
import { zerofillMax, trimExtension } from '../string_utils'

import { sync as mkdirpSync } from 'mkdirp'


function main() {
  const args: any = minimist(process.argv.slice(2), {
    default: {
      'n': 55,
      'dest': '.',
    },
  })

  let maxWordsPerFile = parseIntStrict(args.n)
  let inputFile = args._[0]
  let base = trimExtension(basename(inputFile))
  let dest = join(args.dest, base)

  let root = parseXmlFileSync(inputFile)
  mkdirpSync(dest)

  let sentenceStream = tokenStream2sentences(tei2tokenStream(root))
  let arr = [] as Token[][]
  for (let {tokens} of sentenceStream) {
    // for (let i = 0; i < tokens.length; ++i) {
    //   if (tokens[i].interp0().isPreposition()) {
    //     for (let j = i + 1; j < tokens.length && j < i + 4; ++j) {
    //       if (tokens[j].interp0().isAdjective()) {
    //         continue
    //       } else if (tokens[j].interp0().isNoun()) {
    //         tokens[i].relation = 'case'
    //         tokens[i].head = j
    //       } else {
    //         break
    //       }
    //     }
    //   }
    // }
    arr.push(tokens)
  }

  let chunks = mu(arr)
    .chunkByMax(maxWordsPerFile, x => mu(x).count(xx => xx.isWord()))
    .toArray()

  for (let [i, chunk] of chunks.entries()) {
    let filename = `${base}_${zerofillMax(i + 1, chunks.length)}`
    let str = mu(tokenStream2brat(chunk)).join('\n')

    writeFileSync(join(dest, `${filename}.ann`), str)
    str = mu(tokenStream2bratPlaintext(chunk)).join('\n')
    writeFileSync(join(dest, `${filename}.txt`), str)
  }
}

if (require.main === module) {
  main()
}
