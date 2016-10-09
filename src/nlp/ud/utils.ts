import { Token } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'



////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2conllu(stream: Iterable<[Token, Token]>) {
  let tokenIndex = 1
  let sentenceId = 1
  for (let [token, nextToken] of stream) {
    if (tokenIndex === 1 && !token.isSentenceStart()) {
      yield sentenceIdLine(sentenceId++)
    }
    if (token.isGlue()) {
      continue
    }
    if (token.isSentenceEnd()) {
      tokenIndex = 1
      yield ''
    } else if (token.isWord()) {
      let interp = token.firstInterp()
      let { pos, features } = toUd(interp)
      let misc = `mi=${interp.toVesumStr()}`
      if (nextToken && nextToken.isGlue()) {
        misc += '|SpaceAfter=No'
      }
      yield [
        tokenIndex++,
        token.form,
        interp.lemma,
        pos,
        '_',
        udFeatures2conlluString(features),
        '_',
        '_',
        '_',
        misc,
      ].join('\t')
    }
  }
}

//------------------------------------------------------------------------------
function sentenceIdLine(id: number) {
  return `# sent_id ${id}`
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2brat(stream: Iterable<Token>) {
  let offset = 0
  let t = 1
  let a = 1
  for (let token of stream) {
    let {pos, features} = toUd(token.firstInterp())
    let rightOffset = offset + token.form.length
    let tId = `T${t++}`

    yield `${tId}\t${pos} ${offset} ${rightOffset}\t${token.form}`

    for (let feature of Object.keys(features)) {
      let toyield = `A${a++}\t${feature} ${tId}`
      let value = features[feature]
      if (value && value !== true) {
        toyield += ` ${value}`
      }
      yield toyield
    }
    offset = rightOffset + 1    // account for space
  }
}
