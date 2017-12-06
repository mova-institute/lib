import { CorpusDoc } from './doc_meta'
import { keyvalue2attributesNormalized } from '../nlp/noske_utils'
import { tokenObj2verticalLine } from './ud'
import { streamparseConllu, Structure } from '../nlp/ud/conllu'

import { escape } from 'he'



////////////////////////////////////////////////////////////////////////////////
export function* conlluStrAndMeta2vertical(
  conlluLines: string,
  meta?: CorpusDoc,
  formOnly = false,
  pGapIndexes = Array<number>(),
) {
  yield* conlluAndMeta2vertical(conlluLines.split('\n'), meta, formOnly, pGapIndexes)
}

////////////////////////////////////////////////////////////////////////////////
export function* conlluAndMeta2vertical(
  conlluLines: Iterable<string>,
  meta?: CorpusDoc,
  formOnly = false,
  pGapIndexes = Array<number>(),
) {
  if (meta) {
    // let { authors, author, date, title, url } = meta
    // author = author || authors && authors.join('; ')
    // let exportedMeta = { author, date, title, url }
    // yield `<doc ${keyvalue2attributesNormalized(exportedMeta)}>`
    yield `<doc ${keyvalue2attributesNormalized(meta)}>`
  } else {
    yield '<doc>'
  }

  let pCount = 0
  let gapPointer = 0
  for (let tok of streamparseConllu(conlluLines)) {
    if (tok.structure) {
      if (tok.structure.type === Structure.document) {
        continue
      } else if (tok.structure.type === Structure.paragraph && pGapIndexes.length) {
        if (tok.structure.opening) {
          if (pGapIndexes[gapPointer] === 0) {
            yield '<gap type="filter"/>'
            ++gapPointer
          }
        }
      }
      let toyield = '<'
      if (!tok.structure.opening) {
        toyield += '/'
      }
      toyield += ['doc', 'p', 's'][tok.structure.type as number]
      toyield += '>'
      yield toyield

      if (tok.structure.type === Structure.paragraph
        && !tok.structure.opening
        && pGapIndexes.length
      ) {
        ++pCount
        if (pCount === pGapIndexes[gapPointer]) {
          yield '<gap type="filter"/>'
          ++gapPointer
        }
      }
    } else {
      if (formOnly) {
        // with multiple cols tags can be distinguished, but not with a single col
        yield escape(tok.token.form)
      } else {
        yield tokenObj2verticalLine(tok.token)
      }
      if (tok.token.misc.SpaceAfter === 'No') {
        yield '<g/>'
      }
    }
  }

  yield `</doc>`
}
