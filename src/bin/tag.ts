#!/usr/bin/env node

import { ioArgsPlain } from '../cli_utils'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { readTillEnd } from '../stream_utils.node'
import {
  tokenizeTei, morphInterpret, enumerateWords, tei2tokenStream, string2tokenStream,
  tokenStream2plainVertical, tokenizeUk, normalizeCorpusTextString, normalizeCorpusText,
  newline2Paragraph, interpretedTeiDoc2sketchVertical, tokenStream2cg, morphReinterpret,
} from '../nlp/utils'
import { $t } from '../nlp/text_token'
import { parseXml } from '../xml/utils.node'
import { NS } from '../xml/utils'
import * as xmlutils from '../xml/utils'
import { createReadStream } from 'fs'
import { getLibRootRelative } from '../path.node'
import { mu } from '../mu'
import * as minimist from 'minimist'
import { tokenStream2conllu, tokenStream2brat, tokenStream2bratPlaintext } from '../nlp/ud/utils'


type OutFormat = 'vertical' | 'xml' | 'conllu' | 'sketch' | 'cg' | 'brat' | 'brat_plaintext'

interface Args extends minimist.ParsedArgs {
  format: OutFormat
  f: OutFormat
  text?: string
  t?: string
  dict?: string
  numerate: boolean
  tokenize: boolean
  count: boolean
  unknown: boolean
  sort: boolean
  mte: boolean  // todo
  normalize: boolean
  forAnnotation: boolean
  nl2p: boolean
  reinterpret: boolean
}

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    boolean: [
      'count',
      'forAnnotation',
      'mte',
      'nl2p',
      'normalize',
      'numerate',
      'tokenize',
      'unknown',
      'reinterpret',
    ],
    string: [
      't',
      'text',
    ],
    alias: {
      forAnnotation: ['for-annotation'],
      numerate: ['n'],
      format: ['f'],
    },
    default: {
      format: 'cg',
    },
    unknown(arg: string) {
      console.error(`Unknown parameter "${arg}"`)
      return false
    },
  }) as any
  normalizeArgs(args)

  main(args)
}


//------------------------------------------------------------------------------
function normalizeArgs(args: Args) {
  if (args.forAnnotation) {
    args.numerate = true
    args.format = 'xml'
  }
  if (args.nl2p) {
    args.format = 'xml'
  }
}

//------------------------------------------------------------------------------
function main(args: Args) {
  ioArgsPlain(async (input, outputFromIoargs) => {
    const analyzer = createAnalyzer(args)

    let inputStr = args.t || args.text
    let output
    if (inputStr) {
      output = args._[0] && createReadStream(args._[0]) || process.stdout
    }
    else {
      output = outputFromIoargs
      inputStr = await readTillEnd(input)
    }


    if (outAsXml(inputStr, args)) {
      inputStr = xmlutils.removeProcessingInstructions(inputStr)
      if (!/^<[^>]*xmlns:mi="http:\/\/mova\.institute\/ns\/corpora\/0\.1"/.test(inputStr)) {
        inputStr = xmlutils.encloseInRootNs(inputStr, 'text')
        args.normalize = args.normalize || args.forAnnotation
      }
      let root = parseXml(inputStr)

      if (args.reinterpret) {
        morphReinterpret([...root.evaluateElements('//mi:w_', NS)], analyzer)
      }

      if (args.normalize) {
        normalizeCorpusText(root, analyzer)
      }

      if (args.nl2p) {
        newline2Paragraph(root)
      }

      tokenizeTei(root, analyzer)

      if (!args.tokenize) {
        morphInterpret(root, analyzer, args.mte)
      }

      if (args.count) {
        console.log(root.evaluateNumber('count(//mi:w_)', NS))
        return
      }

      if (args.unknown) {
        // todo use mu
        let unknowns = [...new Set(root.evaluateElements('//mi:w_[w[@ana="x"]]', NS).map(x => $t(x).text()))]
        if (args.sort) {
          const collator = new Intl.Collator('uk-UA')
          unknowns.sort(collator.compare)
        }
        for (let unknown of unknowns) {
          output.write(unknown + '\n')
        }
      }
      else {
        if (args.numerate) {
          enumerateWords(root)
        }
        if (args.format === 'conllu') {
          let tokenStream = mu(tei2tokenStream(root)).window(2)
          for (let line of tokenStream2conllu(tokenStream as any)) {
            output.write(line + '\n')
          }
        } else if (args.format === 'sketch') {
          mu(interpretedTeiDoc2sketchVertical(root))
            .chunk(3000)
            .forEach(x => output.write(x.join('\n') + '\n'))
        } else if (args.format === 'brat') {
          mu(tokenStream2brat(tei2tokenStream(root))).forEach(x => output.write(x + '\n'))
        } else if (args.format === 'brat_plaintext') {
          mu(tokenStream2bratPlaintext(tei2tokenStream(root)))  // todo: chunk
            .forEach(x => output.write(x + '\n'))
        } else if (args.format === 'cg') {
          mu(tokenStream2cg(tei2tokenStream(root))).forEach(x => output.write(x))
        } else {
          output.write(root.document().serialize(true))
          output.write('\n')
        }
      }
    } else {
      if (args.normalize) {
        inputStr = normalizeCorpusTextString(inputStr, analyzer)
      }
      if (args.count) {
        let len = mu(tokenizeUk(inputStr, analyzer)).length()
        output.write(len.toString() + '\n')
      } else if (args.unknown) {
        let tokens = string2tokenStream(inputStr, analyzer)
          .filter(x => x.isWord() && x.firstInterp().isX() && !x.firstInterp().isForeign())
          .map(x => x.form)
          .unique()
          .toArray()
        if (args.sort) {
          tokens.sort()
        }
        tokens.forEach(x => output.write(x + '\n'))
      }
      else {
        try {
          let root = parseXml(inputStr)
          var tokens = mu(tei2tokenStream(root))
        } catch (e) {
          tokens = string2tokenStream(inputStr, analyzer)
        }
        if (args.format === 'cg') {
          mu(tokenStream2cg(tokens)).forEach(x => output.write(x))
        } else if (args.format === 'brat') {
          mu(tokenStream2brat(tokens)).forEach(x => output.write(x + '\n'))
        } else if (args.format === 'brat_plaintext') {
          mu(tokenStream2bratPlaintext(tokens)).forEach(x => output.write(x + '\n'))
        } else {
          tokenStream2plainVertical(tokens, args.mte).forEach(x => output.write(x + '\n'))
        }
      }
    }
  }, args._)
}



//------------------------------------------------------------------------------
function outAsXml(inputStr: string, args: Args) {
  if (args.format === 'xml') {
    return true
  }
  if (args._.length > 1 && args._[0].endsWith('.txt')) {
    return false
  }
  if (/^<[^>]+>/.test(inputStr)) {
    return true
  }
  return false
}

//------------------------------------------------------------------------------
function createAnalyzer(args: Args) {
  let dictName = args.dict || 'vesum'
  let dictDir = getLibRootRelative('../data/dict', dictName)
  return createMorphAnalyzerSync(dictDir)
}
