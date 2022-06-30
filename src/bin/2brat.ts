#!/usr/bin/env node

import { join, basename } from 'path'
import minimist from 'minimist'
import * as glob from 'glob'

import { mu } from '../mu'
import {
  tokenStream2bratSynt,
  tokenStream2bratPlaintext,
  tokenStream2bratCoref,
} from '../nlp/ud/utils'
import {
  mixml2tokenStream,
  tokenStream2sentences,
  SentenceStream,
  SentenceStreamElement,
} from '../nlp/utils'
import { parseXmlFileSync } from '../xml/utils.node'
import { zerofillMax, trimExtension } from '../string'

import { Token } from '../nlp/token'
import { writeFileSyncMkdirp } from '../utils.node'
import * as g from '../nlp/ud/uk_grammar'

interface Args {
  maxWordsPerFile: number
  dest: string
}

interface BratZoneConfig {
  enabled: boolean
  dirPath: Array<string>
  sentenceFilter: (sentence: SentenceStreamElement) => any
}

const zones: Array<BratZoneConfig> = [
  {
    enabled: true,
    dirPath: ['treebank', 'conjpropagation_only'],
    sentenceFilter(sentence: SentenceStreamElement) {
      return (
        g.isCompleteSentence(sentence.nodes) &&
        sentence.nodes.some((x) => g.isAmbigCoordModifier(x))
      )
    },
  },
  {
    enabled: true,
    dirPath: ['treebank', 'unfinished'],
    sentenceFilter(sentence: SentenceStreamElement) {
      return !g.isCompleteSentence(sentence.nodes)
    },
  },
]

function main() {
  const args = minimist<Args>(process.argv.slice(2), {
    default: {
      maxWordsPerFile: 55,
      dest: '.',
    },
  })

  let inputFiles = glob.sync(args._[0], { nodir: true })
  let allSentences = new Array<SentenceStreamElement>()
  for (let file of inputFiles) {
    // console.error(file)
    try {
      let base = trimExtension(basename(file))
      console.log(`generating brat files for ${base}`)
      let root = parseXmlFileSync(file)

      let tokens = mu(mixml2tokenStream(root))
        .transform((x) => (x.form = x.getForm())) // todo
        .toArray()

      let sentences = [...tokenStream2sentences(tokens)]
      allSentences.push(...sentences)

      doUd(
        sentences,
        args.maxWordsPerFile,
        join(args.dest, 'treebank', 'by_file', base),
      )
      doCoref(tokens, join(args.dest, 'coref', 'by_file', base))
    } catch (e) {
      console.error(`Error processing ${file}`)
      throw e
    }
  }
  zones.forEach((x) => doGeneric(x, allSentences, args.dest))
}

function doGeneric(
  config: BratZoneConfig,
  sentences: SentenceStream,
  dest: string,
) {
  if (config.enabled === false) {
    return
  }

  let chunks = mu(sentences)
    .filter(config.sentenceFilter)
    .map((x) => x.nodes)
    .chunkByMax(55, (x) => mu(x).count((xx) => xx.node.isWord()))
    .toArray()

  for (let [i, chunk] of chunks.entries()) {
    let filename = `${zerofillMax(i + 1, chunks.length)}`

    let str = mu(tokenStream2bratSynt(chunk)).join('\n', true)
    writeFileSyncMkdirp(join(dest, ...config.dirPath, `${filename}.ann`), str)

    let chunkTokens = chunk.map((x) => x.map((xx) => xx.node))
    str = mu(tokenStream2bratPlaintext(chunkTokens)).join('\n', true)
    writeFileSyncMkdirp(join(dest, ...config.dirPath, `${filename}.txt`), str)
  }
}

function doCoref(tokens: Array<Token>, dest: string) {
  let docs = mu(tokens)
    .split((x) => x.isDocumentStart())
    .window(2, 1)
    .drop(1)
    .map(([[, doc], [docTokens]]) => ({
      id: doc.getAttribute('id'),
      docTokens,
    }))

  for (let { id, docTokens } of docs) {
    let subdocs = mu(docTokens)
      .split0((x) => x.isClosingStructure('coref-split'))
      .toArray()
    for (let [i, subdoc] of subdocs.entries()) {
      let filename = id
      if (subdocs.length > 1) {
        filename += `_${zerofillMax(i + 1, subdocs.length + 11)}`
      }

      let paragraps = mu(subdoc)
        .split0((x) => x.isClosingStructure('paragraph'))
        .toArray()

      let str = mu(tokenStream2bratCoref(paragraps)).join('\n', true)
      writeFileSyncMkdirp(join(dest, `${filename}.ann`), str)

      str = mu(tokenStream2bratPlaintext(paragraps)).join('\n', true)
      writeFileSyncMkdirp(join(dest, `${filename}.txt`), str)
    }
  }
}

function doUd(
  sentenceStream: SentenceStream,
  maxWordsPerFile: number,
  dest: string,
) {
  let chunks = mu(sentenceStream)
    .map((x) => x.nodes)
    .chunkByMax(maxWordsPerFile, (x) => mu(x).count((xx) => xx.node.isWord()))
    .toArray()

  for (let [i, chunk] of chunks.entries()) {
    let filename = `${zerofillMax(i + 1, chunks.length)}`

    let str = mu(tokenStream2bratSynt(chunk)).join('\n', true)
    writeFileSyncMkdirp(join(dest, `${filename}.ann`), str)

    let chunkTokens = chunk.map((x) => x.map((xx) => xx.node))
    str = mu(tokenStream2bratPlaintext(chunkTokens)).join('\n', true)
    writeFileSyncMkdirp(join(dest, `${filename}.txt`), str)
  }
}

if (require.main === module) {
  main()
}
