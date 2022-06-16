import {
  UdPos,
  UdFeats,
  ud2conlluishString,
  UdNumType,
  UdVerbForm,
} from '../nlp/ud/tagset'
import { trimAfterLast } from '../string'
import { ConlluToken, ConlluMultitoken } from '../nlp/ud/conllu'

import * as _ from 'lodash'

export function tokenObj2verticalLineUk(token: ConlluToken) {
  return token2verticalLineUk(
    token.form,
    token.lemma,
    token.upos,
    token.feats as any,
    token.rel,
    token.index,
    token.head,
  )
}

export function tokenOrMulti2verticalLineGeneric(
  token: ConlluToken,
  multitoken: ConlluMultitoken,
  featsOrder: Array<string>,
) {
  if (token) {
    return tokenObj2verticalColsGeneric(token, featsOrder).join('\t')
  }

  let rows = multitoken.tokens.map((x) =>
    tokenObj2verticalColsGeneric(x, featsOrder),
  )
  const MULTISEP = '||'
  let cols = _.unzip(rows).map((x) => _.uniq(x).sort().join(MULTISEP))
  cols[0] = multitoken.surfaceForm // todo: do not assume

  return cols.join('\t')
}

export function tokenObj2verticalColsGeneric(
  token: ConlluToken,
  featsOrder: Array<string>,
) {
  return token2verticalColsGeneric(
    token.form,
    token.lemma,
    token.upos,
    token.feats as any,
    featsOrder,
    token.rel,
    token.index,
    token.head,
    token.misc.SpaceAfter !== 'No',
  )
}

export function token2verticalLineUk(
  form: string,
  lemma: string,
  upos: UdPos,
  feats: UdFeats,
  rel: string,
  sentIndex: number,
  head: number,
  // gluedNext = false,
  id?: string,
) {
  let domesticatedPos = domesticateUdPos(upos, feats.NumType, feats.VerbForm)
  let urel = prepareUrel(rel)
  let headStr = head === undefined ? '' : head + 1
  let relativeHead = prepareRelativeHead(head, sentIndex)
  let tag = ud2conlluishString(upos, feats)
  let nameType = feats.NameType || (upos === 'PROPN' && 'Oth') || ''

  let ret = `${form}\t${lemma}\t`
  ret += feats2line([
    domesticatedPos,
    upos,
    feats.Abbr,
    feats.Animacy,
    feats['Animacy[gram]'],
    feats.Aspect,
    feats.Case,
    feats.Degree,
    feats.Foreign,
    feats.Gender,
    feats.Hyph,
    feats.Mood,
    nameType,
    feats.Number,
    feats.NumType,
    feats.Orth,
    feats.PartType,
    feats.Person,
    feats.Poss,
    feats.PronType,
    feats.PunctType,
    feats.Reflex,
    // feats.Reverse,
    feats.Tense,
    feats.Uninflect,
    feats.Variant,
    feats.VerbForm,
    feats.Voice,
  ])
  ret += `\t${tag}\t`
  ret += feats2line([
    sentIndex + 1,
    rel,
    urel,
    headStr,
    relativeHead,
    // gluedNext ? 'no' : '',
  ])

  if (id !== undefined) {
    ret += `\t${id}`
  }

  return ret
}

export function token2verticalColsGeneric(
  form: string,
  lemma: string,
  upos: UdPos,
  feats: UdFeats,
  featsOrder: Array<string>,
  rel: string,
  sentIndex: number,
  head: number,
  gluedNext = false,
  id?: string,
) {
  let urel = prepareUrel(rel)
  let relativeHead = prepareRelativeHead(head, sentIndex)
  let tag = ud2conlluishString(upos, feats)

  let ret = [
    form,
    lemma,
    prepareFeatValue(upos),
    ...featsOrder.map((x) => prepareFeatValue(feats[x])),
    tag,
    ...[
      sentIndex + 1,
      rel,
      urel,
      head + 1,
      relativeHead,
      // gluedNext ? 'no' : '',
    ].map((x) => prepareFeatValue(x)),
  ]
  if (id !== undefined) {
    ret.push(id)
  }

  return ret
}

export function domesticateUdPos(
  upos: UdPos,
  numType: UdNumType,
  verbForm: UdVerbForm,
): UdPos {
  if (upos === 'PROPN' || upos === 'PRON') {
    return 'NOUN'
  }
  if (upos === 'DET') {
    if (numType) {
      return 'NUM'
    }
    return 'ADJ'
  }
  if (upos === 'AUX') {
    if (verbForm) {
      return 'VERB'
    }
    return 'PART'
  }

  return upos
}

function prepareUrel(rel: string | undefined) {
  let ret: string
  if (rel) {
    ret = trimAfterLast(rel, ':')
  }
  return ret
}

function prepareRelativeHead(head: number, index: number) {
  if (head === 0) {
    return 0
  }
  if (head === undefined) {
    return ''
  }
  return head - index
}

function prepareFeatValue(feat: string | number) {
  return feat === undefined ? '' : feat.toString().toLowerCase()
}

function feats2line(feats: Array<string | number>) {
  return feats.map((x) => prepareFeatValue(x)).join('\t')
}
