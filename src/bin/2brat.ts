#!/usr/bin/env node

import { join, basename } from 'path'
import * as minimist from 'minimist'
import * as glob from 'glob'

import { mu } from '../mu'
import { tokenStream2brat, tokenStream2bratPlaintext, tokenStream2bratCoref } from '../nlp/ud/utils'
import { mixml2tokenStream, tokenStream2sentences } from '../nlp/utils'
import { parseXmlFileSync } from '../xml/utils.node'
import { zerofillMax, trimExtension } from '../string'

import { Token } from '../nlp/token'
import { writeFileSyncMkdirp } from '../utils.node'



//------------------------------------------------------------------------------
interface Args {
  maxWordsPerFile: number
  dest: string
}

//------------------------------------------------------------------------------
function main() {
  const args = minimist<Args>(process.argv.slice(2), {
    default: {
      'maxWordsPerFile': 55,
      'dest': '.',
    },
  })

  let inputFiles = glob.sync(args._[0], { nodir: true })
  for (let file of inputFiles) {
    // console.error(file)
    try {
      let base = trimExtension(basename(file))
      console.log(`generating brat files for ${base}`)
      let root = parseXmlFileSync(file)

      let tokens = mu(mixml2tokenStream(root))
        .transform(x => x.form = x.getForm())  // todo
        .toArray()

      doUd(tokens, args.maxWordsPerFile, join(args.dest, 'ud', base))
      doCoref(tokens, join(args.dest, 'coref', base))
    } catch (e) {
      console.error(`Error processing ${file}`)
      throw e
    }
  }
}

//------------------------------------------------------------------------------
function doCoref(
  tokens: Array<Token>,
  dest: string,
) {
  let docs = mu(tokens)
    .split(x => x.isDocumentStart())
    .window(2, 1)
    .drop(1)
    .map(([[, doc], [docTokens]]) => ({ id: doc.getAttribute('id'), docTokens }))

  for (let { id, docTokens } of docs) {
    let subdocs = mu(docTokens)
      .split0(x => x.isClosingStructure('coref-split'))
      .toArray()
    for (let [i, subdoc] of subdocs.entries()) {
      let filename = id
      if (subdocs.length > 1) {
        filename += `_${zerofillMax(i, Math.min(11, subdocs.length))}`
      }

      let paragraps = mu(subdoc)
        .split0(x => x.isClosingStructure('paragraph'))
        .toArray()

      let str = mu(tokenStream2bratCoref(paragraps)).join('\n', true)
      writeFileSyncMkdirp(join(dest, `${filename}.ann`), str)

      str = mu(tokenStream2bratPlaintext(paragraps)).join('\n', true)
      writeFileSyncMkdirp(join(dest, `${filename}.txt`), str)
    }
  }
}

//------------------------------------------------------------------------------
function doUd(
  tokens: Array<Token>,
  maxWordsPerFile: number,
  dest: string,
) {
  let sentenceStream = tokenStream2sentences(tokens)
  let chunks = mu(sentenceStream)
    .map(x => x.tokens)
    .chunkByMax(maxWordsPerFile, x => mu(x).count(xx => xx.isWord()))
    .toArray()

  for (let [i, chunk] of chunks.entries()) {
    let filename = `${zerofillMax(i + 1, chunks.length)}`

    let str = mu(tokenStream2brat(chunk)).join('\n', true)
    writeFileSyncMkdirp(join(dest, `${filename}.ann`), str)

    str = mu(tokenStream2bratPlaintext(chunk)).join('\n', true)
    writeFileSyncMkdirp(join(dest, `${filename}.txt`), str)
  }
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
