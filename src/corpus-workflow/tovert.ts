import { CorpusDoc } from './doc_meta'
import { keyvalue2attributesNormalized } from '../nlp/noske_utils'
import { token2verticalLine } from './ud'
import { streamparseConllu, Structure } from '../nlp/ud/conllu'



////////////////////////////////////////////////////////////////////////////////
export function* conlluStrAndMeta2vertical(conlluLines: string, meta: CorpusDoc, formOnly = false) {
  yield* conlluAndMeta2vertical(conlluLines.split('\n'), meta, formOnly)
}

////////////////////////////////////////////////////////////////////////////////
export function* conlluAndMeta2vertical(conlluLines: Iterable<string>, meta: CorpusDoc, formOnly = false) {
  let { authors, author, date, title, url } = meta
  author = author || authors && authors.join('; ')
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
      if (formOnly) {
        yield tok.token.form
      } else {
        let { form, lemma, upos, feats, rel } = tok.token
        yield token2verticalLine(form, lemma, upos, feats as any, rel, tok.token.misc.SpaceAfter !== 'No')
      }
      if (tok.token.misc.SpaceAfter === 'No') {
        yield '<g/>'
      }
    }
  }

  yield `</doc>`
}
