import { iterateDictCorpVizLines } from '../vesum_utils'
import { toUd, udFeatures2conlluString } from './tagset'
import { MorphInterp } from '../morph_interp'
import { normalizeMorphoForUd } from '../utils'



////////////////////////////////////////////////////////////////////////////////
export function* mivesum2Udpipe(lines: Iterable<string>) {
  for (let { form, tag, lemma } of iterateDictCorpVizLines(lines)) {
    let interp = MorphInterp.fromVesumStr(tag, lemma)
    // interp.killNongrammaticalFeatures()
    normalizeMorphoForUd(interp, form)

    try {
      let udTag = toUd(interp)

      yield [
        form,
        lemma,
        udTag.pos,
        '_',  // no xpostag
        udFeatures2conlluString(udTag.features) || '_',
      ].join('\t')
    } catch (e) {
      if (!e.message.startsWith('Emphatic pronoun conversion is not implemented')) {
        throw e
      }
    }
  }
}
