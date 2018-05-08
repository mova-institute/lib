#!/usr/bin/env node

import { logErrAndExit, exitOnStdoutPipeError, linesBackpressedStd } from '../../utils.node'
import { iterateDictCorpVizLines, DictCorpVizIterator } from '../vesum_utils'
import { toUd, udFeatures2conlluString } from './tagset'
import { MorphInterp } from '../morph_interp'
import { standartizeMorphoForUd21 } from './uk_grammar'
import { write } from 'fs'


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  exitOnStdoutPipeError()
  let iterator = new DictCorpVizIterator()
  linesBackpressedStd((line, writer) => {
    let { form, tag, lemma } = iterator.feedLine(line)
    let interp = MorphInterp.fromVesumStr(tag, lemma)
    standartizeMorphoForUd21(interp, form)
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
