#!/usr/bin/env node

import { ioArgsPlain } from '../cli_utils'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { readTillEnd } from '../stream_utils.node'
import {
  tokenizeMixml, morphInterpret, numerateTokensGently, mixml2tokenStream, string2tokenStream,
  tokenStream2plainVertical, tokenizeUk, autofixDirtyText, normalizeCorpusText,
  newline2Paragraph, tokenStream2cg, morphReinterpret, token2sketchVertical,
  applyMiTeiDocTransforms,
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
  autofix: boolean
  forMorphDisamb: boolean
  nl2p: boolean
  reinterpret: boolean
  apply: boolean
  expandAdjAsNoun: boolean
}

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    boolean: [
      'count',
      'forMorphDisamb',
      'mte',
      'nl2p',
      'normalize',
      'numerate',
      'tokenize',
      'unknown',
      'reinterpret',
      'apply',
      'expandAdjAsNoun',
      'text',
      // 't',
    ],
    string: [
    ],
    alias: {
      text: ['t'],
      forMorphDisamb: ['for-morph-disamb'],
      numerate: ['n'],
      format: ['f'],
      expandAdjAsNoun: ['adj-as-noun'],
    },
    default: {
      format: 'xml',
    },
    // unknown(arg: string) {
    //   console.error(`Unknown parameter "${arg}"`)
    //   return false
    // },
  }) as any
  normalizeArgs(args)

  main(args)
}


//------------------------------------------------------------------------------
function normalizeArgs(args: Args) {
  if (args.forMorphDisamb) {
    args.numerate = true
    args.format = 'xml'
  }
  if (args.nl2p) {
    args.format = 'xml'
  }
}

//------------------------------------------------------------------------------
function main(args: Args) {
  let inputStr: string
  if (args.text) {
    inputStr = args._.join(' ')
    args._ = []
  }

  ioArgsPlain(async (input, outputFromIoargs) => {
    const analyzer = createAnalyzer(args)
      .setExpandAdjectivesAsNouns(args.expandAdjAsNoun)

    let output
    if (inputStr) {
      output = args._[0] && createReadStream(args._[0]) || process.stdout
    }
    else {
      output = outputFromIoargs
      inputStr = await readTillEnd(input)
    }

    if (args.format === 'xml') {
      inputStr = xmlutils.removeProcessingInstructions(inputStr)
      if (!/^<[^>]*xmlns:mi="http:\/\/mova\.institute\/ns\/corpora\/0\.1"/.test(inputStr)) {
        inputStr = xmlutils.encloseInRootNs(inputStr, 'text')
      }
      let root = parseXml(inputStr)

      if (args.reinterpret) {
        morphReinterpret(root.evaluateElements('//mi:w_|w_', NS).toArray(), analyzer)
      }

      if (args.autofix) {
        normalizeCorpusText(root, analyzer)
      }

      if (args.nl2p) {
        newline2Paragraph(root)
      }

      tokenizeMixml(root, analyzer)

      if (!args.tokenize) {
        morphInterpret(root, analyzer, args.mte)
      }

      if (args.count) {
        console.log(root.evaluateNumber('count(//*[local-name()="w_"])'))
        return
      }

      if (args.forMorphDisamb) {
        root.evaluateElements('//mi:w_|//w_', NS)
          .map(x => $t(x))
          .filter(x => x.getDefiniteInterps().some(x => x.flags.startsWith('punct')))
          .forEach(x => x.elem.setAttribute('disamb', '0'))
        //console.error(x.elem.attributesObj()
      }

      if (args.unknown) {
        // todo use mu
        let unknowns = [...new Set(root.evaluateElements('//mi:w_[w[@ana="x"]]|w_[w[@ana="x"]]', NS).map(x => $t(x).text()))]
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
          numerateTokensGently(root)
        }
        output.write(root.document().serialize(true))
        output.write('\n')
      }
    } else {
      if (args.autofix) {
        inputStr = autofixDirtyText(inputStr, analyzer)
      }
      if (args.count) {
        let len = mu(tokenizeUk(inputStr, analyzer)).length()
        output.write(len.toString() + '\n')
      } else if (args.unknown) {
        let tokens = string2tokenStream(inputStr, analyzer)
          .filter(x => x.isWord() && x.interp0().isX() && !x.interp0().isForeign())
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
          if (args.apply) {
            applyMiTeiDocTransforms(root)
          }
          var tokenStream = mu(mixml2tokenStream(root))
        } catch (e) {
          tokenStream = string2tokenStream(inputStr, analyzer)
        }
        if (args.reinterpret) {
          tokenStream = tokenStream.window(2).map(([curr, next]) => {
            if (curr.form) {
              let newInterps = analyzer.tag(curr.form, next && next.form)
                .filter(x => !curr.interps.find(xx => xx.featurewiseEquals(x)))
              curr.addInterps(newInterps)
            }
            return curr
          })
        }
        if (args.format === 'cg') {
          mu(tokenStream2cg(tokenStream)).forEach(x => output.write(x))
        } else if (args.format === 'sketch') {
          tokenStream.map(x => token2sketchVertical(x))
            .chunk(1000)
            .forEach(x => output.write(x.join('\n') + '\n'))
          // .forEach(x => output.write(x + '\n'))
        } else if (args.format === 'conllu') {
          for (let line of tokenStream2conllu(tokenStream)) {
            output.write(line + '\n')
          }
        } else if (args.format === 'brat') {
          mu(tokenStream2brat([[...tokenStream]])).forEach(x => output.write(x + '\n'))
        } else if (args.format === 'brat_plaintext') {
          mu(tokenStream2bratPlaintext(tokenStream)).forEach(x => output.write(x + '\n'))
        } else {
          tokenStream2plainVertical(tokenStream, args.mte).forEach(x => output.write(x + '\n'))
        }
      }
    }
  }, args._)
}


//------------------------------------------------------------------------------
function createAnalyzer(args: Args) {
  let dictName = args.dict || 'vesum'
  let dictDir = getLibRootRelative('../data/dict', dictName)
  return createMorphAnalyzerSync(dictDir)
}
