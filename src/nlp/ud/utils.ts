import { Token } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'
import { mu } from '../../mu'
import { MorphInterp } from '../morph_interp'
import { tokenStream2plaintextString, tokenStream2sentences } from '../utils'



////////////////////////////////////////////////////////////////////////////////
export function sentence2conllu(sentence: Array<Token>, id = '') {
  let lines = [`# sent_id = ${id}`, `# text = ${tokenStream2plaintextString(sentence)}`]
  for (let i = 0; i < sentence.length; ++i) {
    let token = sentence[i]
    // let nextToken = sentence[i + 1]
    let interp = token.interp0()
    let { pos, features } = toUd(interp)
    let misc = token.glued ? 'SpaceAfter=No' : '_'
    lines.push([
      i + 1,
      token.form,
      interp.lemma,
      pos,
      '_',
      udFeatures2conlluString(features) || '_',
      token.head || 0,
      token.relation || 'root',
      '_',
      misc,
    ].join('\t'))
  }
  return lines.join('\n')
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2conllu(stream: Iterable<[Token, Token]>) {
  let tokenIndex = 1
  let sentenceId = 1
  for (let [token, nextToken] of stream) {
    if (tokenIndex === 1 && !token.isSentenceStartDeprecated()) {
      yield sentenceIdLine(sentenceId++)
    }
    if (token.isGlue()) {
      continue
    }
    if (token.isSentenceBoundary()) {
      tokenIndex = 1
      yield ''
    } else if (token.isWord()) {
      let interp = token.interp0()
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
function sentenceIdLine(id: number | string) {
  return `# sent_id = ${id}`
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2bratPlaintext(stream: Iterable<Token>) {
  let sentenceStream = mu(stream).split(x => x.isSentenceBoundary())
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
    .split(x => x.isSentenceBoundary())
  for (let sentence of sentenceStream) {
    for (let token of sentence) {
      if (token.isStructure()) {
        continue
      }
      let {pos, features} = toUd(token.interp0())
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

      if (token.getAttributes()) {
        let n = token.getAttributes().n
        if (n) {
          yield `A${a++}\tN ${tId} ${n}`
        }
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

////////////////////////////////////////////////////////////////////////////////
export function interp2udVertFeatures(interp: MorphInterp) {
  let {pos, features} = toUd(interp)
  // CAUTION: sort this list by js comparator, not by UD site
  return [
    pos,
    features.Abbr,
    features.Animacy,
    features.Aspect,
    features.Case,
    features.Degree,
    features.Foreign,  // todo
    features.Gender,
    features.Mood,
    features.NameType,  // todo
    features.Number,
    features.NumForm,  // todo
    features.NumType,
    features.Person,
    features.Poss,
    features.PrepCase,  // todo
    features.PronType,
    features.Reflex,
    features.Tense,
    features.VerbForm,
    features.Voice,
  ]
}

////////////////////////////////////////////////////////////////////////////////
export function mergeAmbiguityFeaturewise(arr: any[][]) {
  let ret = []
  for (let i = 0; i < arr[0].length; ++i) {
    ret.push([])
  }

  for (let i = 0; i < ret.length; ++i) {
    for (let j = 0; j < arr.length; ++j) {
      let v = arr[j][i]
      if (v) {
        let lc = v.toLowerCase()
        if (ret[i].indexOf(lc) === -1) {
          ret[i].push(lc)
        }
      }
    }
    ret[i] = ret[i].sort().join('|')
  }
  return ret
}
