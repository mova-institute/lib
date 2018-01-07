import { UdPos, UdFeats, ud2conlluishString } from '../nlp/ud/tagset'
import { trimAfterLast } from '../string_utils'
import { ConlluToken } from '../nlp/ud/conllu'


////////////////////////////////////////////////////////////////////////////////
export function tokenObj2verticalLine(token: ConlluToken) {
  return token2verticalLine(token.form, token.lemma, token.upos, token.feats as any,
    token.rel, token.index, token.head, token.misc.SpaceAfter !== 'No')
}

////////////////////////////////////////////////////////////////////////////////
export function token2verticalLine(
  form: string,
  lemma: string,
  upos: UdPos,
  feats: UdFeats,
  rel: string,
  sentIndex: number,
  head: number,
  gluedNext = false,
  id?: string,
) {
  let tag = `${lemma}/${ud2conlluishString(upos, feats)}`
  let domesticatedPos = domesticateUdPos(upos)
  let urel = prepareUrel(rel)
  let relativeHead = prepareRelativeHead(head, sentIndex)

  let featsArray = [
    upos,
    domesticatedPos,
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
    feats.NameType,
    feats.Number,
    // feats.NumForm,
    feats.NumType,
    feats.PartType,
    feats.Person,
    feats.Poss,
    // feats.PrepCase,
    feats.PronType,
    // feats.PunctSide,
    feats.PunctType,
    feats.Reflex,
    feats.Reverse,
    feats.Tense,
    feats.Variant,
    feats.VerbForm,
    feats.Voice,
    sentIndex + 1,
    rel,
    urel,
    head + 1,
    relativeHead,
    gluedNext ? 'no' : '',
  ]

  if (id !== undefined) {
    featsArray.push(id)
  }

  let ret = `${form}\t${lemma}\t${tag}\t`
  ret += featsArray.map(x => x === undefined ? '' : x).join('\t').toLowerCase()

  return ret
}

//------------------------------------------------------------------------------
function domesticateUdPos(upos: UdPos) {
  let ret = upos
  if (ret === 'DET') {
    ret = 'ADJ'
  } else if (ret === 'PROPN') {
    ret = 'NOUN'
  }

  return ret
}

//------------------------------------------------------------------------------
function prepareUrel(rel: string | undefined) {
  let ret: string
  if (rel) {
    ret = trimAfterLast(rel, ':')
  }
  return ret
}

//------------------------------------------------------------------------------
function prepareRelativeHead(head: number, index: number) {
  if (head === 0) {
    return 0
  }
  if (head === undefined) {
    return ''
  }
  return head - index
}
