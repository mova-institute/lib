#!/usr/bin/env node

import { ioArgsPlain } from '../cli_utils'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { readTillEnd } from '../stream_utils.node'
import { tokenizeTei, morphInterpret, enumerateWords, interpretedTeiDoc2sketchVerticalTokens } from '../nlp/utils'
import { $t } from '../nlp/text_token'
import { string2lxmlRoot } from '../utils.node'
import { encloseInRootNsIf, NS } from '../xml/utils'
import * as xmlutils from '../xml/utils'
import { createReadStream, readFileSync } from 'fs'
import { getLibRootRelative } from '../path.node'
import { mu } from '../mu'
import * as minimist from 'minimist'



interface Args extends minimist.ParsedArgs {
  t?: string
  text?: string
  dict?: string
  n?: boolean
  numerate?: boolean
  tokenize?: boolean
  count?: boolean
  unknown?: boolean
  sort?: boolean
  vertical?: boolean
  mte?: boolean
}

const args: Args = minimist(process.argv.slice(2), {
  boolean: ['n', 'numerate', 'tokenize', 'mte', 'vertical', 'xml'],
})

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

  inputStr = xmlutils.removeProcessingInstructions(inputStr)
  if (!/^<[^>]*xmlns:mi="http:\/\/mova\.institute\/ns\/corpora\/0\.1"/.test(inputStr)) {
    inputStr = xmlutils.encloseInRootNs(inputStr)
  }


  let dictName = args.dict || 'vesum'
  let dictDir = getLibRootRelative('../data/dict', dictName)
  let tagger = createMorphAnalyzerSync(dictDir)

  let root = string2lxmlRoot(inputStr)
  tokenizeTei(root, tagger)
  if (!args.tokenize) {
    morphInterpret(root, tagger, args.mte)
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
  else if (args.count) {
    output.write([...root.evaluateElements('//mi:w_', NS)].length)
  }
  else {
    if (args.n || args.numerate) {
      enumerateWords(root)
    }
    if (args.vertical) {
      // mu(interpretedTeiDoc2sketchVerticalTokens(root)).forEach(x => output.write(x + '\n'))
    } else {
      output.write(root.document().serialize(true))
    }
  }

  output.write('\n')
})
