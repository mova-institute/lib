import { mu, Mu } from '../../mu'
import { UdPos } from './tagset'
import { makeObject, mapInplace } from '../../lang'
import { Dict } from '../../types'



////////////////////////////////////////////////////////////////////////////////
export enum ConlluField {
  id,
  form,
  lemma,
  upos,
  xpos,
  feats,
  head,
  depsrel,
  deps,
  misc,
}

////////////////////////////////////////////////////////////////////////////////
export interface ConlluToken {
  index: number
  form: string
  lemma: string
  upos: UdPos
  xpos: string
  feats: Dict<string>
  head: number
  rel: string
  deps: Array<[number, string]>
  misc: Dict<string>
}

////////////////////////////////////////////////////////////////////////////////
export class ConlluMultitoken {
  indexFrom: number
  surfaceForm: string
  tokens = Array<ConlluToken>()
  misc: Dict<string>

  toString() {
    return this.surfaceForm
  }
}

////////////////////////////////////////////////////////////////////////////////
export const enum Structure { document, paragraph, sentence }

////////////////////////////////////////////////////////////////////////////////
export interface StructureToken {
  type: Structure
  opening: boolean
}

////////////////////////////////////////////////////////////////////////////////
export function getCol(line: string, col: ConlluField) {
  return line.split('\t')[col]
}

////////////////////////////////////////////////////////////////////////////////
export function parseConlluSentences(lines: Iterable<string>) {
  return mu(streamparseConllu(lines))
    .filter(x => !x.structure || x.structure.type === Structure.sentence && !x.structure.opening)
    .map(x => x.structure ? undefined : x.token)
    .split0(x => !x)
    .filter(x => x.length)
}

////////////////////////////////////////////////////////////////////////////////
export function* streamparseConllu(lines: Iterable<string>) {
  let insideDoc = false
  let insidePar = false
  let insideSent = false
  let multitoken: ConlluMultitoken
  let multitokenLastToken: number

  for (let line of lines) {
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

      if (/^\d+\./.test(line)) {  // skip empty nodes
        continue
      }

      let multitokenMatch = line.match(/^(\d+)-(\d+)/)
      if (multitokenMatch) {
        if (multitoken) {
          throw new Error(`Logic error: Malformed CONLL-U`)
        }
        multitoken = new ConlluMultitoken()
        let temp = parseConlluTokenLine(line)
        multitoken.surfaceForm = temp.form
        multitoken.misc = temp.misc
        multitoken.indexFrom = Number(multitokenMatch[1])
        multitokenLastToken = Number(multitokenMatch[2])
      } else if (multitoken) {
        let subtoken = parseConlluTokenLine(line)
        multitoken.tokens.push(subtoken)
        if (subtoken.index === multitokenLastToken) {
          yield makeMultitoken(multitoken)
          multitoken = undefined
        }
      } else {
        yield makeToken(parseConlluTokenLine(line))
      }
    }
  }
  if (insidePar) {
    yield makeStructure(Structure.paragraph, false)
  }
  if (insideDoc) {
    yield makeStructure(Structure.document, false)
  }
}

////////////////////////////////////////////////////////////////////////////////
export function parseConlluTokenLine(value: string) {
  return parseConlluTokenCells(value.split('\t'))
}

////////////////////////////////////////////////////////////////////////////////
export function parseConlluTokenCells(value: Array<string>) {
  mapInplace(value, x => x === '_' ? '' : x, 3)
  let [indexStr, form, lemma, upos, xpos, featsStr, headStr, rel, , miscStr] = value

  let index = Number(indexStr)
  let head = Number(headStr)
  let feats = parseUdKeyvalues(featsStr)
  let misc = parseUdKeyvalues(miscStr)

  return { index, form, lemma, upos, xpos, feats, head, rel, misc } as ConlluToken
}

//------------------------------------------------------------------------------
function parseUdKeyvalues(keyvals: string) {
  if (!keyvals) {
    return makeObject<string>([])
  }
  return makeObject(keyvals.split('|').map(x => x.split('=')) as Array<[string, string]>)
}

//------------------------------------------------------------------------------
function makeStructure(type: Structure, opening: boolean) {
  return {
    structure: { type, opening } as StructureToken,
    token: undefined as ConlluToken,
    multitoken: undefined as ConlluMultitoken,
  }
}

//------------------------------------------------------------------------------
function makeToken(token: ConlluToken) {
  return {
    structure: undefined as StructureToken,
    token,
    multitoken: undefined as ConlluMultitoken,
  }
}

//------------------------------------------------------------------------------
function makeMultitoken(multitoken: ConlluMultitoken) {
  return {
    structure: undefined as StructureToken,
    token: undefined as ConlluToken,
    multitoken,
  }
}
