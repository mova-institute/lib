import { keyvalue2attributesNormalized } from '../nlp/noske'
import { tokenObj2verticalLineUk, tokenOrMulti2verticalLineGeneric } from './ud'
import { streamparseConllu, Structure } from '../nlp/ud/conllu'

import { escape } from 'he'

export interface ConlluAndMeta2verticalOptions {
  formOnly?: boolean
  meta?: any
  pGapIndexes?: Array<number>
  featsOrder?: Array<string>
}

export function* conlluStrAndMeta2vertical(
  conlluLines: string,
  options: ConlluAndMeta2verticalOptions = {},
) {
  yield* conlluAndMeta2vertical(conlluLines.split('\n'), options)
}

export function* conlluStreamAndMeta2vertical(
  stream: ReturnType<typeof streamparseConllu>,
  options: ConlluAndMeta2verticalOptions = {},
) {
  if (options.meta) {
    // let { authors, author, date, title, url } = meta
    // author = author || authors && authors.join('; ')
    // let exportedMeta = { author, date, title, url }
    // yield `<doc ${keyvalue2attributesNormalized(exportedMeta)}>`
    yield `<doc ${keyvalue2attributesNormalized(options.meta)}>`
  } else {
    yield '<doc>'
  }

  let pCount = 0
  let gapPointer = 0
  for (let tok of stream) {
    if (tok.structure) {
      if (tok.structure.type === Structure.document) {
        continue
      } else if (
        tok.structure.type === Structure.paragraph &&
        options.pGapIndexes &&
        options.pGapIndexes.length
      ) {
        if (tok.structure.opening) {
          if (options.pGapIndexes[gapPointer] === 0) {
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

      if (
        tok.structure.type === Structure.paragraph &&
        !tok.structure.opening &&
        options.pGapIndexes &&
        options.pGapIndexes.length
      ) {
        ++pCount
        if (pCount === options.pGapIndexes[gapPointer]) {
          yield '<gap type="filter"/>'
          ++gapPointer
        }
      }
    } else {
      if (options.formOnly) {
        // with multiple cols structures can be distinguished, but not with a single col
        yield escape(tok.token.form)
      } else {
        if (options.featsOrder) {
          yield tokenOrMulti2verticalLineGeneric(
            tok.token,
            tok.multitoken,
            options.featsOrder,
          )
        } else {
          yield tokenObj2verticalLineUk(tok.token)
        }
      }
      if ((tok.token || tok.multitoken).misc.SpaceAfter === 'No') {
        yield '<g/>'
      }
    }
  }

  yield `</doc>`
}

export function* conlluAndMeta2vertical(
  conlluLines: Iterable<string>,
  options: ConlluAndMeta2verticalOptions = {},
) {
  yield* conlluStreamAndMeta2vertical(streamparseConllu(conlluLines), options)
}
