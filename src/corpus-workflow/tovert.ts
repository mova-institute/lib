import { CorpusDoc } from './doc_meta'
import * as xmlutils from '../xml/utils'
import { token2verticalLine } from './ud'
import { UdPos, UdFeats } from '../nlp/ud/tagset'



////////////////////////////////////////////////////////////////////////////////
export function* conlluAndMeta2vertical(conlluLines: Iterable<string>, meta: CorpusDoc) {
  let { authors, author, date, title, url } = meta
  author = author || authors.join('; ')
  let exportedMeta = { author, date, title, url }

  yield `<doc ${xmlutils.keyvalue2attributesNormalized(exportedMeta)}>`

  for (let tok of streamparseConllu(conlluLines)) {
    if (tok.structure) {
      if (tok.structure.type === Structure.document) {
        continue
      }

      let toyield = '<'
      if (!tok.structure.opening) {
        toyield += '/'
      }
      toyield += ['doc', 'p', 's'][tok.structure.type as number]
      toyield += '>'
      yield toyield
    } else {
      let { form, lemma, upos, feats, rel} = tok.token
      yield token2verticalLine(form, lemma, upos, feats, rel)
    }
  }

  yield `</doc>`
}

export interface ConlluToken {
  form: string;
  lemma: string;
  upos: UdPos;
  xpos: string;
  feats: UdFeats;
  head: string;
  rel: string;
  misc: {};
}

const enum Structure { document, paragraph, sentence }

interface StructureToken {
  type: Structure
  opening: boolean
}

//------------------------------------------------------------------------------
function makeStructure(type: Structure, opening: boolean) {
  return {
    structure: { type, opening } as StructureToken,
    token: undefined as ConlluToken
  }
}

function makeToken(token: ConlluToken) {
  return {
    structure: undefined as StructureToken,
    token
  }
}

//------------------------------------------------------------------------------
function* streamparseConllu(conlluLines: Iterable<string>) {
  let insideDoc = false
  let insidePar = false
  let insideSent = false

  for (let line of conlluLines) {
    line = line.trim()
    if (line.startsWith('# newdoc')) {
      if (insideDoc) {
        yield makeStructure(Structure.document, false)
      }
      yield makeStructure(Structure.document, true)
      insideDoc = true
    } else if (line.startsWith('# newpar')) {
      if (insidePar) {
        yield makeStructure(Structure.paragraph, false)
      }
      yield makeStructure(Structure.paragraph, true)
      insidePar = true
    } else if (!line && insideSent) {
      yield makeStructure(Structure.sentence, false)
      insideSent = false
    } else if (line && !line.startsWith('#')) {
      if (!insideSent) {
        yield makeStructure(Structure.sentence, true)
        insideSent = true
      }
      let [, form, lemma, upos, xpos, featsStr, head, rel, , miscStr] = line.split('\t').map(x => x === '_' ? '' : x)

      let feats = parseKeyvals(featsStr)
      let misc = parseKeyvals(miscStr)

      let token = { form, lemma, upos, xpos, feats, head, rel, misc } as ConlluToken
      yield makeToken(token)
    }
  }
}

//------------------------------------------------------------------------------
function parseKeyvals(keyvals: string) {
  let ret = {}
  keyvals.split('|').map(x => x.split('=')).forEach(([key, val]) => ret[key] = val)
  return ret
}
