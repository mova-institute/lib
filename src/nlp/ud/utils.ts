import { Token, TokenTag } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'
import { MorphInterp } from '../morph_interp'
import { tokenStream2plaintextString } from '../utils'
import { mu } from '../../mu'



////////////////////////////////////////////////////////////////////////////////
export interface Sentence2conlluParams {
  xpos?: 'mte' | 'upos' | 'ud'
  morphOnly?: boolean
}
export function sentence2conllu(tokens: Array<Token>, sentenceLevelData, options: Sentence2conlluParams = {}) {
  let comments = new Array<string>()
  for (let [k, v] of Object.entries(sentenceLevelData)) {
    if (v === undefined) {
      continue
    } else if (v === true) {
      comments.push(k)
    } else {
      comments.push(`${k} = ${v}`)
    }
  }
  comments.push(`text = ${tokenStream2plaintextString(tokens)}`)

  let lines = comments.sort().map(x => `# ${x}`)

  tokens.forEach((token, i) => {
    let { pos, features } = toUd(token.interp)

    let udFeatureStr = udFeatures2conlluString(features)

    let misc = [`Id=${token.id}`]
    if (token.opensParagraph) {
      misc.push('NewPar=Yes')
    }
    if (token.isPromoted) {
      misc.push('Promoted=Yes')
    }
    if (token.isGraft) {
      misc.push('Graft=Yes')
    }
    if (token.gluedNext) {
      misc.push('SpaceAfter=No')
    }


    let xpos: string
    if (options.xpos === 'mte') {
      xpos = token.interp.toMte()
    } else if (options.xpos === 'upos') {
      xpos = pos
    } else if (options.xpos === 'ud'){
      xpos = `POS=${pos}`
      if (udFeatureStr) {
        xpos += `|${udFeatureStr}`
      }
    } else {
      xpos = '_'
    }

    lines.push([
      i + 1,
      token.getForm(),
      token.interp.lemma,
      pos,
      xpos,
      udFeatureStr || '_',
      options.morphOnly ? '_' : (token.headIndex === undefined ? 0 : token.headIndex + 1),
      options.morphOnly ? '_' : (token.rel || 'root'),
      '_',
      misc.sort().join('|') || '_',
    ].join('\t'))
  })

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
      let index = tokenIndex++
      for (let interp of token.interps) {
        let { pos, features } = toUd(interp)
        let misc = nextToken && nextToken.isGlue() ? 'SpaceAfter=No' : '_'
        yield [
          index,
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
}

//------------------------------------------------------------------------------
function sentenceIdLine(id: number | string) {
  return `# sent_id = ${id}`
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2bratPlaintext(stream: Iterable<Token[]>) {
  for (let sentence of stream) {
    let toyield = tokenSentence2bratPlaintext(sentence)
    if (toyield) {
      yield toyield
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function tokenSentence2bratPlaintext(sentence: Token[]) {
  return sentence.filter(x => x.isWord()).map(x => x.getForm()).join(' ')
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2brat(sentences: Token[][]) {
  let offset = 0
  let t = 1
  let a = 1
  let commentN = 1
  let n2id = {} as any
  for (let sentence of sentences) {
    let highlightHoles = mustHighlightHoles(sentence)
    for (let token of sentence) {
      if (token.isStructure()) {
        continue
      }

      if (token.id === undefined) {
        console.error(token)
        throw new Error(`Token has no id`)
      }

      let id = t++
      let tId = `T${id}`
      let rightOffset = offset + token.form.length

      let { pos, features } = toUd(token.interp)

      delete features['Animacy[gram]']
      if (highlightHoles && !token.rel) {
        features['AnnotationHole'] = 'Yes'
      }

      yield `${tId}\t${pos} ${offset} ${rightOffset}\t${token.form}`

      for (let feature of Object.keys(features)) {
        let toyield = `A${a++}\t${feature} ${tId}`
        let value = features[feature]
        if (value && value !== true) {
          toyield += ` ${value}`
        }
        yield toyield
      }

      n2id[token.id] = id
      yield `A${a++}\tN ${tId} ${token.id}`
      for (let tag of ['Promoted', 'Graft']) {
        if (token.tags.includes(tag.toLowerCase() as TokenTag)) {
          yield `A${a++}\t${tag} ${tId}`
        }
      }
      let comment = token.getAttribute('comment')
      if (comment) {
        yield `#${commentN++}\tAnnotatorNotes ${tId}\t${comment}`
      }
      offset = rightOffset + 1    // account for space
    }
  }

  let rId = 1
  for (let sentence of sentences) {
    for (let token of sentence) {
      for (let dep of token.deps) {
        let head = n2id[dep.headId]
        let dependant = n2id[token.id]
        yield `R${rId++}\t${dep.relation.replace(':', '_')} Arg1:T${head} Arg2:T${dependant}`
      }
    }
  }
}

//------------------------------------------------------------------------------
function mustHighlightHoles(sentence: Token[]) {
  let numRoots = mu(sentence).count(x => !x.hasDeps())
  if (numRoots === 1) {
    return false
  }

  if (numRoots / sentence.length < 0.41) {
    return true
  }

  return false
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
export function canBeConlluLine(line: string) {
  return !/^\s*#/.test(line) && /^([^\t]+\t){9}[^\t]+$/.test(line)
}

////////////////////////////////////////////////////////////////////////////////
export function interp2udVertFeatures(interp: MorphInterp) {
  let { pos, features } = toUd(interp)
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

////////////////////////////////////////////////////////////////////////////////
export interface BratSpan {
  index: number
  form: string
  annotations: any
  arcs?: { relation: string, head: BratSpan }[]
  comment?: string
}

////////////////////////////////////////////////////////////////////////////////
export function parseBratFile(lines: Iterable<string>) {
  let tokens = {} as { [key: string]: BratSpan }
  let counter = 0
  for (let line of lines) {
    // span
    let match = line.match(/^T(\d+).*\s(\S+)$/)
    if (match) {
      let [, id, form] = match
      tokens[id] = { form, index: counter++, annotations: {}, arcs: [] }
      continue
    }

    // annotation
    match = line.match(/^A\d+\t(\S+)\sT(\S+)(\s(\S+))?$/)
    if (match) {
      let [, key, id, , value] = match
      if (value === undefined) {
        tokens[id].annotations[key] = true
      } else {
        tokens[id].annotations[key] = value
      }
      continue
    }

    // relation
    match = line.match(/^R\d+\s(\S+)\sArg1:T(\S+)\sArg2:T(\S+)\s*$/)
    if (match) {
      let [, relation, headId, depId] = match
      tokens[depId].arcs.push({
        relation,
        head: tokens[headId]
      })
      continue
    }

    // comment
    match = line.match(/\tAnnotatorNotes T(\S+)\t(.+)/)
    if (match) {
      let [, id, comment] = match
      tokens[id].comment = comment
      continue
    }
  }

  return Object.values(tokens).sort((a, b) => a.index - b.index)
}

////////////////////////////////////////////////////////////////////////////////
export function uEq(rel: string, unirel: string) {  // universally equals
  return rel === unirel || rel && rel.startsWith(`${unirel}:`)
}

////////////////////////////////////////////////////////////////////////////////
export function uEqSome(rel: string, unirels: string[]) {  // universally equals
  return unirels.some(x => uEq(rel, x))
}
