import { UdPos, UdFeats, ud2conlluishString, UdNumType, UdVerbForm } from '../nlp/ud/tagset'
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
  let domesticatedPos = domesticateUdPos(upos, feats.NumType, feats.VerbForm)
  let urel = prepareUrel(rel)
  let relativeHead = prepareRelativeHead(head, sentIndex)
  let tag = `${lemma}/${ud2conlluishString(upos, feats)}`
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
    head + 1,
    relativeHead,
    gluedNext ? 'no' : '',
  ])
  if (id !== undefined) {
    ret += `\t${id}`
  }

  return ret
}

//------------------------------------------------------------------------------
function domesticateUdPos(upos: UdPos, numType: UdNumType, verbForm: UdVerbForm): UdPos {
  if (upos === 'PROPN' || upos ==='PRON') {
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

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function prepareUrel(rel: string | undefined) {
  let ret: string
  if (rel) {
    ret = trimAfterLast(rel, ':')
  }
  return ret
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function prepareRelativeHead(head: number, index: number) {
  if (head === 0) {
    return 0
  }
  if (head === undefined) {
    return ''
  }
  return head - index
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function feats2line(feats: (string | number)[]) {
  return feats.map(x => x === undefined ? '' : x).join('\t').toLowerCase()
}
