import { Token } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'
import { mu } from '../../mu'
import { MorphInterp } from '../morph_interp'



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
      let misc = nextToken && nextToken.isGlue() ? 'SpaceAfter=No' : '_'
      yield [
        tokenIndex++,
        token.form,
        interp.lemma,
        pos,
        interp.toVesumStr(),
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
export function* tokenStream2bratPlaintext(stream: Iterable<Token>) {
  let sentenceStream = mu(stream).split(x => x.isSentenceEnd())
  for (let sent of sentenceStream) {
    let toyield = tokenSentence2bratPlaintext(sent)
    if (toyield) {
      yield toyield
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function tokenSentence2bratPlaintext(sentence: Token[]) {
  return sentence.filter(x => x.isWord()).map(x => x.form).join(' ')
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2brat(stream: Iterable<Token>) {
  let offset = 0
  let t = 1
  let a = 1
  let sentenceStream = mu(stream)
    .split(x => x.isSentenceEnd())
  for (let sentence of sentenceStream) {
    for (let token of sentence) {
      if (token.isStructure()) {
        continue
      }
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
}

////////////////////////////////////////////////////////////////////////////////
export function* conll2sentenceStream(lines: Iterable<string>) {
  let buf: string[][] = []
  for (let line of lines) {
    if (/^\s*#\s*sent_id\s/.test(line) && buf.length) {
      yield buf
      buf = []
    } else if (/^\s*(#|$)/.test(line)) {
      continue
    } else {
      buf.push(line.split('\t').map(x => x.trim()))
    }
  }
}

//------------------------------------------------------------------------------
function conlluLineArr2Obj(line: string[]) {
  let [index, form, lemma, pos, , feat, head, deprel, misc] = line
  return { index, form, lemma, pos, feat, head, deprel, misc }
}

//------------------------------------------------------------------------------
function conlluLine2Obj(line: string) {
  return conlluLineArr2Obj(line.split('\t'))
}

////////////////////////////////////////////////////////////////////////////////
export function* conllu2bratPlaintext(lines: Iterable<string>) {
  for (let sent of conll2sentenceStream(lines)) {
    yield sent.map(x => x[1]).join(' ') + '\n'
  }
}

////////////////////////////////////////////////////////////////////////////////
export function canBeConlluLine(line: string) {
  return !/^\s*#/.test(line) && /^([^\t]+\t){9}[^\t]+$/.test(line)
}
