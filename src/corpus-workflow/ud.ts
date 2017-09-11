import { UdPos, UdFeats } from '../nlp/ud/tagset'
import { trimAfterLast } from '../string_utils'

////////////////////////////////////////////////////////////////////////////////
export function token2verticalLine(form: string, lemma: string, upos: UdPos, feats: UdFeats, rel: string, id?: string) {
  let domesticatedPos = domesticateUdPos(upos)
  let urel = prepareUrel(rel)

  let ret = [
    form,
    lemma,
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
    feats.NumForm,
    feats.NumType,
    feats.PartType,
    feats.Person,
    feats.Poss,
    feats.PrepCase,
    feats.PronType,
    feats.PunctSide,
    feats.PunctType,
    feats.Reflex,
    feats.Reverse,
    feats.Tense,
    feats.Variant,
    feats.VerbForm,
    feats.Voice,
    rel,
    urel,
    id,
  ].map(x => x || '')
    .join('\t')
    .toLowerCase()

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
