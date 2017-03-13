import { ConlluToken } from '../../nlp/ud/conllu'
import { UdPos } from '../../nlp/ud/tagset'

////////////////////////////////////////////////////////////////////////////////
export function conlluToken2vertical(token: ConlluToken) {
  let { form, lemma, upos, feats, rel } = token
  let pos = domesticateUdPos(upos)
  let urel = prepareUrel(rel)

  let ret = `${form}\t${lemma}\t`
  ret += [
    pos || '',
    upos || '',
    feats.Abbr || '',
    feats.Animacy || '',
    feats['Animacy[gram]'] || '',
    feats.Aspect || '',
    feats.Case || '',
    feats.Degree || '',
    feats.Foreign || '',
    feats.Gender || '',
    feats.Hyph || '',
    feats.Mood || '',
    feats.NameType || '',
    feats.Number || '',
    feats.NumForm || '',
    feats.NumType || '',
    feats.Person || '',
    feats.Poss || '',
    feats.PrepCase || '',
    feats.PronType || '',
    feats.Reflex || '',
    feats.Tense || '',
    feats.Variant || '',
    feats.VerbForm || '',
    feats.Voice || '',
    rel || '',
    urel || '',
  ].join('\t').toLowerCase()

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
    ret = rel.slice(0, rel.lastIndexOf(':'))
  }
  return ret
}
