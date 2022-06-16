import { streamparseConllu, Structure } from '../nlp/ud/conllu'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { tokenizeUkNew } from '../nlp/utils'



export function* fixUdpipeTokenization(
  stream: ReturnType<typeof streamparseConllu>,
  analyzer: MorphAnalyzer,
) {
  let buf/* : {
    structure
    token
    multitoken
  } */
  let wasAppended = false

  let makeYield = function* () {
    if (wasAppended) {
      let split = [...tokenizeUkNew(buf.token.form, analyzer)]
      if (split.length > 1) {
        let tokens = split.map((x, i) => {
          let copy = {
            token: {
              ...buf.token,
              form: x[0],
            }
          }
          if (i < split.length - 1) {
            delete copy.token.misc.SpaceAfter
          }
          return copy
        })
        yield* tokens
      } else {
        // console.error(`IT HAPPENED: ${buf.token.form}`)
        yield buf
      }
    } else {
      yield buf
    }

    wasAppended = false
    buf = undefined
  }

  for (let tok of stream) {
    if (tok.structure) {
      if (!tok.structure.opening && tok.structure.type === Structure.sentence) {
        yield* makeYield()
      }
      yield tok
    } else {
      if (buf) {
        if (buf.token.misc.SpaceAfter === 'No'
          && (buf.token.form.endsWith('-') || tok.token.form.startsWith('-'))
        ) {
          buf.token.form += tok.token.form
          buf.token.misc.SpaceAfter = tok.token.misc.SpaceAfter
          wasAppended = true
        } else {
          yield* makeYield()
          buf = tok
        }
      } else {
        buf = tok
      }
    }
  }
}
