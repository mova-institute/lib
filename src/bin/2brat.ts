#!/usr/bin/env node

import { writeFileSync } from 'fs'
import { join, basename } from 'path'
import * as minimist from 'minimist'
import * as glob from 'glob'

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
  let inputFiles = glob.sync(args._[0], { nodir: true })
  for (let file of inputFiles) {
    // console.error(file)
    let base = trimExtension(basename(file))
    let root = parseXmlFileSync(file)
    let dest = join(args.dest, base)
    mkdirpSync(dest)

    let tokenStream = mu(tei2tokenStream(root)).transform(x => x.form = x.correctedForm())
    let sentenceStream = tokenStream2sentences(tokenStream)
    let arr = [] as Token[][]
    for (let { tokens } of sentenceStream) {
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
      let filename = `${zerofillMax(i + 1, chunks.length)}`
      let str = mu(tokenStream2brat(chunk)).join('\n', true)

      writeFileSync(join(dest, `${filename}.ann`), str)
      str = mu(tokenStream2bratPlaintext(chunk)).join('\n', true)
      writeFileSync(join(dest, `${filename}.txt`), str)
    }
  }


}

if (require.main === module) {
  main()
}
