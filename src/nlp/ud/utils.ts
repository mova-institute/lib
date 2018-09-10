import { Token, TokenTag } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'
import { MorphInterp } from '../morph_interp'
import { MultitokenDescriptor, tokenStream2plaintext } from '../utils'
import { mu } from '../../mu'
import { GraphNode } from '../../graph'
import { titlecase, trimAfterFirst } from '../../string'
import { CONJ_PROPAGATION_RELS_ARR, isRootOrHole } from './uk_grammar'
import { Dict } from '../../types'

import sortby = require('lodash.sortby')
import sorteduniq = require('lodash.sorteduniq')



////////////////////////////////////////////////////////////////////////////////
export interface Sentence2conlluParams {
  xpos?: 'mte' | 'upos' | 'ud'
  morphOnly?: boolean
  // noBasic?: boolean
  addIdToFeats?: boolean
}

////////////////////////////////////////////////////////////////////////////////
export function sentence2conllu(
  tokens: Array<Token>,
  multitokens: Array<MultitokenDescriptor>,
  sentenceLevelData,
  options: Sentence2conlluParams = {}
) {
  let text = mu(tokenStream2plaintext(tokens.filter(x => !x.isElided()), multitokens)).join('')
  let comments = [`text = ${text}`]
  for (let [k, v] of Object.entries(sentenceLevelData)) {
    if (v === undefined) {
      continue
    } else if (v === true) {
      comments.push(k)
    } else {
      comments.push(`${k} = ${v}`)
    }
  }


  let lines = comments.sort().map(x => `# ${x}`)

  let indices = buildConlluIndexMap(tokens)
  let multitokenIdx = 0
  for (let [i, token] of tokens.entries()) {
    // deal with multitoken
    let isInsideMultitoken: boolean
    if (multitokenIdx < multitokens.length) {
      let mt = multitokens[multitokenIdx]
      isInsideMultitoken = i >= mt.startIndex
      if (i === mt.startIndex) {
        lines.push([
          `${i + 1}-${i + mt.spanLength}`,
          mt.form,
          ...'_'.repeat(7),
        ].join('\t'))
      } else if (i === mt.startIndex + mt.spanLength - 1) {
        lines[lines.length - mt.spanLength] +=
          '\t' + (token.gluedNext ? 'SpaceAfter=No' : '_')
        ++multitokenIdx
      }
    }

    let { pos, features } = toUd(token.interp)

    if (options.addIdToFeats) {
      features['Id'] = token.id
    }

    let udFeatureStr = udFeatures2conlluString(features)

    let misc = [`Id=${token.id}`]
    if (i && token.opensParagraph) {
      misc.push('NewPar=Yes')
    }
    if (token.isPromoted) {
      misc.push('Promoted=Yes')
    }
    if (token.isGraft) {
      misc.push('Graft=Yes')
    }
    if (!isInsideMultitoken && !token.isElided() && token.gluedNext) {
      misc.push('SpaceAfter=No')
    }

    // conj propagation
    {
      let conjPropagation = token.getConjPropagation()
      if (conjPropagation) {
        misc.push(`ConjPropagation=${titlecase(conjPropagation)}`)
      }
    }

    // XPOS
    let xpos: string
    if (options.xpos === 'mte') {
      xpos = token.interp.toMte()
    } else if (options.xpos === 'upos') {
      xpos = pos
    } else if (options.xpos === 'ud') {
      xpos = `POS=${pos}`
      if (udFeatureStr) {
        xpos += `|${udFeatureStr}`
      }
    } else {
      xpos = '_'
    }

    // head, deprel
    let head: string
    let deprel: string
    if (!options.morphOnly && !token.isElided()) {
      let dep = token.deps.find(x => !tokens[x.headIndex].isElided())
      if (dep) {
        head = indices[dep.headIndex]
        deprel = dep.relation
      } else {
        head = '0'
        deprel = 'root'
      }
    }

    let edeps = sortby(token.edeps, x => x.headIndex, x => x.relation)
      .map(x => `${indices[x.headIndex] || 0}:${x.relation}`)

    lines.push([
      indices[i],
      token.getForm(),
      token.interp.lemma,
      pos,
      xpos,
      udFeatureStr || '_',
      head || '_',
      deprel || '_',
      edeps.join('|') || '_',
      misc.sort().join('|') || '_',
    ].join('\t'))
  }

  return lines.join('\n')
}

//------------------------------------------------------------------------------
function buildConlluIndexMap(tokens: Array<Token>) {
  let ret = new Array<string>()
  let basicIndex = 0
  let enchancedSubindex = 1
  for (let t of tokens) {
    if (t.isElided()) {
      ret.push(`${basicIndex}.${enchancedSubindex++}`)
    } else {
      enchancedSubindex = 1
      ++basicIndex
      ret.push(basicIndex.toString())
    }
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2conllu(stream: Iterable<Token>) {
  let tokenIndex = 1
  let sentenceId = 1
  for (let [token, nextToken] of mu(stream).window(2)) {
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
export function* tokenStream2bratPlaintext(stream: Iterable<Array<Token>>) {
  for (let sentence of stream) {
    let toyield = tokenSentence2bratPlaintext(sentence)
    if (toyield) {
      yield toyield
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function tokenSentence2bratPlaintext(sentence: Array<Token>) {
  return sentence.filter(x => x.isWord()).map(x => x.getForm()).join(' ')
}

//------------------------------------------------------------------------------
function isAmbigCoordModifier(node: GraphNode<Token>) {
  return node.parent
    && node.parent.children.some(x => uEq(x.node.rel, 'conj')
      && !x.node.rel.endsWith(':parataxis'))
    && !uEqSome(node.node.rel, [
      'conj',
      'cc',
      'sconj',
      'mark',
      'punct',
      'xcomp',
      'appos',
      'parataxis',
      'flat',
      'compound',
    ])
    && !(uEq(node.node.rel, 'discourse') && (node.node.interp.isConsequential()
      || node.node.interp.lemma === 'тощо')
    )
    && !node.node.hdeps.some(xx => uEqSome(xx.relation, CONJ_PROPAGATION_RELS_ARR))
}

//------------------------------------------------------------------------------
function hasAmbigCoordDependents(node: GraphNode<Token>) {
  return node.children.some(x => isAmbigCoordModifier(x))
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2bratSynt(sentences: Array<Array<GraphNode<Token>>>) {
  let offset = 0
  let t = 1
  let a = 1
  let commentN = 1
  let n2id = {} as any
  for (let sentence of sentences) {
    let highlightHoles = mustHighlightHoles(sentence)
    for (let node of sentence) {
      let token = node.node
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

      Object.keys(features)
        .filter(x => /[[\]]/.test(x))
        .forEach(x => delete features[x])

      if (isAmbigCoordModifier(node)) {
        features['IsAmbigCoordModifier'] = 'Yes'
      }
      if (hasAmbigCoordDependents(node)) {
        features['HasAmbigCoordModifier'] = 'Yes'
      }

      let highlightHole = highlightHoles && isRootOrHole(node)
      if (highlightHole) {
        features['AnnotationHole'] = 'Yes'
      }

      if (token.isElided()) {
        features['Elided'] = 'Yes'
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
      for (let tag of ['Promoted', 'Graft', 'ItSubj']) {
        if (token.tags.has(tag.toLowerCase() as TokenTag)) {
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
      for (let deps of [token.node.deps, token.node.edeps, token.node.hdeps]) {
        for (let dep of deps) {
          let head = n2id[dep.headId]
          let dependant = n2id[token.node.id]
          yield `R${rId++}\t${dep.relation.replace(':', '_')} Arg1:T${head} Arg2:T${dependant}`
        }
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2bratCoref(sentences: Array<Array<Token>>) {
  let offset = 0
  let t = 1
  let a = 1
  let commentN = 1
  let n2id = {} as any
  for (let sentence of sentences) {
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
      let pronType = features['PronType']
      if (pronType) {
        pos += `_${pronType}`
      }

      yield `${tId}\t${pos} ${offset} ${rightOffset}\t${token.form}`

      n2id[token.id] = id
      yield `A${a++}\tN ${tId} ${token.id}`
      let comment = token.getAttribute('comment-coref')
      if (comment) {
        yield `#${commentN++}\tAnnotatorNotes ${tId}\t${comment}`
      }
      offset = rightOffset + 1    // account for space
    }
  }

  let rId = 1
  for (let sentence of sentences) {
    for (let token of sentence) {
      for (let dep of token.corefs) {
        let head = n2id[dep.headId]
        let dependant = n2id[token.id]
        yield `R${rId++}\t${dep.type.replace(':', '_')} Arg1:T${head} Arg2:T${dependant}`
      }
    }
  }
}

//------------------------------------------------------------------------------
function mustHighlightHoles(sentence: Array<GraphNode<Token>>) {
  let numRoots = mu(sentence).count(x => isRootOrHole(x))
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
  let buf: Array<Array<string>> = []
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
export function mergeAmbiguityFeaturewise(arr: Array<Array<any>>) {
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
export interface BratArrow {
  relation: string
  head: BratSpan
}

////////////////////////////////////////////////////////////////////////////////
export interface BratSpan {
  index: number
  form: string
  annotations: any
  arrows?: Array<BratArrow>
  comment?: string
}

////////////////////////////////////////////////////////////////////////////////
export function parseBratFile(lines: Iterable<string>) {
  let tokens: Dict<BratSpan> = {}
  let counter = 0
  for (let line of lines) {
    // span
    let match = line.match(/^T(\d+).*\s(\S+)$/)
    if (match) {
      let [, id, form] = match
      tokens[id] = { form, index: counter++, annotations: {}, arrows: [] }
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
      tokens[depId].arrows.push({
        relation,
        head: tokens[headId],
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
export function stripSubrel(rel: string) {
  return trimAfterFirst(rel, ':')
}

////////////////////////////////////////////////////////////////////////////////
export function uEq(rel: string, unirel: string) {  // universally equals
  return rel === unirel || rel && rel.startsWith(`${unirel}:`)
}

////////////////////////////////////////////////////////////////////////////////
export function uEqSome(rel: string, unirels: Array<string>) {  // universally equals
  return unirels.some(x => uEq(rel, x))
}
