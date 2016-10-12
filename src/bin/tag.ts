#!/usr/bin/env node

import { ioArgsPlain } from '../cli_utils'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { readTillEnd } from '../stream_utils.node'
import {
  tokenizeTei, morphInterpret, enumerateWords, tei2tokenStream, string2tokenStream,
  tokenStream2plainVertical, tokenizeUk, normalizeCorpusTextString, normalizeCorpusText,
  newline2Paragraph,
} from '../nlp/utils'
import { $t } from '../nlp/text_token'
import { parseXml } from '../xml/utils.node'
import { NS } from '../xml/utils'
import * as xmlutils from '../xml/utils'
import { createReadStream } from 'fs'
import { getLibRootRelative } from '../path.node'
import { mu } from '../mu'
import * as minimist from 'minimist'
import { tokenStream2conllu } from '../nlp/ud/utils'



interface Args extends minimist.ParsedArgs {
  t?: string
  text?: string
  dict?: string
  numerate: boolean
  tokenize: boolean
  count: boolean
  unknown: boolean
  sort: boolean
  vertical: boolean
  mte: boolean
  conllu: boolean
  xml: boolean
  normalize: boolean
  forAnnotation: boolean
  nl2p: boolean
}

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    boolean: [
      'numerate',
      'tokenize',
      'mte',
      'vertical',
      'xml',
      'conllu',
      'count',
      'normalize',
      'forAnnotation',
      'nl2p',
    ],
    string: [
      't',
      'text',
    ],
    alias: {
      forAnnotation: ['for-annotation'],
      numerate: ['n'],
    },
  }) as any
  normalizeArgs(args)

  main(args)
}


//------------------------------------------------------------------------------
function normalizeArgs(args: Args) {
  if (args.forAnnotation) {
    args.xml = args.numerate /*= args.tokenize*/ = true
  }
  if (args.nl2p) {
    args.xml = true
  }
}

//------------------------------------------------------------------------------
function main(args: Args) {
  ioArgsPlain(async (input, outputFromIoargs) => {
    let inputStr = args.t || args.text
    let output
    if (inputStr) {
      output = args._[0] && createReadStream(args._[0]) || process.stdout
    }
    else {
      output = outputFromIoargs
      inputStr = await readTillEnd(input)
    }



    const analyzer = createAnalyzer(args)

    if (ifTreatAsXml(inputStr, args)) {
      inputStr = xmlutils.removeProcessingInstructions(inputStr)
      if (!/^<[^>]*xmlns:mi="http:\/\/mova\.institute\/ns\/corpora\/0\.1"/.test(inputStr)) {
        inputStr = xmlutils.encloseInRootNs(inputStr, 'text')
        args.normalize = args.normalize || args.forAnnotation
      }
      let root = parseXml(inputStr)

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
        if (args.conllu) {
          let tokenStream = mu(tei2tokenStream(root)).window(2)
          for (let line of tokenStream2conllu(tokenStream as any)) {
            output.write(line + '\n')
          }
        } else {
          output.write(root.document().serialize(true))
        }
      }
      output.write('\n')
    } else {
      if (args.normalize) {
        // console.log('nrm==================')
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
      } else {
        let tokens = string2tokenStream(inputStr, analyzer)
        // mu(tokenStream2brat(tokens)).forEach(x => output.write(x + '\n'))
        tokenStream2plainVertical(tokens, args.mte).forEach(x => output.write(x + '\n'))
      }
    }
  }, args._)
}



//------------------------------------------------------------------------------
function ifTreatAsXml(inputStr: string, args: Args) {
  if (args.xml) {
    return true
  }
  if (args.t || args.text || args.vertical) {
    return false
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
