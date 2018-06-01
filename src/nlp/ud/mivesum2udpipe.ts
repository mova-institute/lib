#!/usr/bin/env node

import { logErrAndExit, linesBackpressedStdPipeable } from '../../utils.node'
import { DictCorpVizIterator } from '../vesum'
import { toUd, udFeatures2conlluString } from './tagset'
import { MorphInterp } from '../morph_interp'
import { standartizeMorphoForUd21, fillWithValencyFromDict } from './uk_grammar'
import { createValencyDictFromKotsybaTsvs } from '../valency_dictionary/factories.node'

import * as minimist from 'minimist'



//------------------------------------------------------------------------------
async function main() {
  const args = minimist(process.argv.slice(2))

  let valencyDict = args.valencyDict ?
    createValencyDictFromKotsybaTsvs(args.valencyDict)
    : undefined

  let iterator = new DictCorpVizIterator()
  linesBackpressedStdPipeable((line, writer) => {
    let { form, tag, lemma } = iterator.feedLine(line)
    let interp = MorphInterp.fromVesumStr(tag, lemma)
    standartizeMorphoForUd21(interp, form)
    if (valencyDict) {
      fillWithValencyFromDict(interp, valencyDict)
    }
    try {
      let udTag = toUd(interp)

      writer.write([
        form,
        lemma,
        udTag.pos,
        '_',  // no xpostag
        udFeatures2conlluString(udTag.features) || '_',
      ].join('\t'))
      writer.write('\n')
    } catch (e) {
      if (!e.message.startsWith('Emphatic pronoun conversion is not implemented')) {
        throw e
      }
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}
