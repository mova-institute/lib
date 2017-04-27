import { CorpusDoc } from './doc_meta'
import { keyvalue2attributesNormalized } from '../xml/utils'
import { makeObject } from '../lang'
import { token2verticalLine } from './ud'
// import { UdPos, UdFeats } from '../nlp/ud/tagset'
import { streamparseConllu, Structure } from '../nlp/ud/conllu'



////////////////////////////////////////////////////////////////////////////////
export function* conlluAndMeta2vertical(conlluLines: Iterable<string>, meta: CorpusDoc) {
  let { authors, author, date, title, url } = meta
  author = author || authors.join('; ')
  let exportedMeta = { author, date, title, url }

  yield `<doc ${keyvalue2attributesNormalized(exportedMeta)}>`

  for (let tok of streamparseConllu(conlluLines)) {
    if (tok.structure) {
      if (tok.structure.type === Structure.document) {
        continue
      }

      let toyield = '<'
      if (!tok.structure.opening) {
        toyield += '/'
      }
      toyield += ['doc', 'p', 's'][tok.structure.type as number]
      toyield += '>'
      yield toyield
    } else {
      let { form, lemma, upos, feats, rel } = tok.token
      yield token2verticalLine(form, lemma, upos, makeObject(feats) as any, rel)
    }
  }

  yield `</doc>`
}

