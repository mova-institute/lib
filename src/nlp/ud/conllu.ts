import { StringDict } from '../../types'
import { parseIntStrict, buildObject } from '../../lang'
import { UdPos } from './tagset'
// import { UdMiRelation } from './syntagset'


export class ConlluSentence {
  tokens = new Array<ConlluToken>()
}

export interface ConlluToken {
  form: string
  lemma: string
  upos: UdPos
  xpos: string
  feats: StringDict
  head: number
  rel: string
  deps: string
  misc: StringDict
}

////////////////////////////////////////////////////////////////////////////////
export function* parseConllu(lines: Iterable<string>) {
  let buf = new ConlluSentence()
  for (let line of lines) {
    if (!line && buf.tokens.length) {
      yield buf
      buf = new ConlluSentence()
    } else {
      let [, form, lemma, upos, xpos, featsStr, headStr, rel, deps, miscStr] = line.split('\t')
      let feats = parseUdKeyvalues(featsStr)
      let head = headStr ? parseIntStrict(headStr) - 1 : -1
      let misc = parseUdKeyvalues(miscStr)
      buf.tokens.push({
        form,
        lemma,
        upos: upos as UdPos,
        xpos,
        feats,
        head,
        rel,
        deps,
        misc
      })
    }
  }
}

//------------------------------------------------------------------------------
function parseUdKeyvalues(value: string) {
  let keyvalues = value.split('|').map(x => x.split('=')) as [string, string][]
  return buildObject(keyvalues)
}
