#!/usr/bin/env node

import { writeFileSync } from 'fs'
import { join, basename } from 'path'
import * as minimist from 'minimist'
import * as glob from 'glob'

import { mu } from '../mu'
import { tokenStream2brat, tokenStream2bratPlaintext } from '../nlp/ud/utils'
import { mixml2tokenStream, tokenStream2sentences } from '../nlp/utils'
import { parseXmlFileSync } from '../xml/utils.node'
import { parseIntStrict } from '../lang'
import { zerofillMax, trimExtension } from '../string'

import { sync as mkdirpSync } from 'mkdirp'


function main() {
  const args = minimist(process.argv.slice(2), {
    default: {
      'n': 55,
      'dest': '.',
    },
  })

  let maxWordsPerFile = parseIntStrict(args.n)
  let inputFiles = glob.sync(args._[0], { nodir: true })
  for (let file of inputFiles) {
    // console.error(file)
    try {
      let base = trimExtension(basename(file))
      console.log(`generating brat file for ${base}`)
      let root = parseXmlFileSync(file)
      let dest = join(args.dest, base)
      mkdirpSync(dest)

      let tokenStream = mu(mixml2tokenStream(root))
        .transform(x => x.form = x.getForm())
      let sentenceStream = tokenStream2sentences(tokenStream)
      let chunks = mu(sentenceStream)
        .map(x => x.tokens)
        .chunkByMax(maxWordsPerFile, x => mu(x).count(xx => xx.isWord()))
        .toArray()

      for (let [i, chunk] of chunks.entries()) {
        let filename = `${zerofillMax(i + 1, chunks.length)}`
        let str = mu(tokenStream2brat(chunk)).join('\n', true)

        writeFileSync(join(dest, `${filename}.ann`), str)
        str = mu(tokenStream2bratPlaintext(chunk)).join('\n', true)
        writeFileSync(join(dest, `${filename}.txt`), str)
      }
    } catch (e) {
      console.error(`Error processing ${file}`)
      throw e
    }
  }
}

if (require.main === module) {
  main()
}
