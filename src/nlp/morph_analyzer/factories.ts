import { MorphAnalyzer } from '../morph_analyzer/morph_analyzer'
import { WordDawgPayload } from '../dictionary/word_dawg_payload'
import { Dictionary } from '../dictionary/dictionary'

import { readStringMapDawg } from 'dawgjs/factories'


export function createMorphAnalyser(
  wordsBuf: ArrayBuffer,
  paradigmsBuf: ArrayBuffer,
  suffixes: string[],
  tags: string[]) {

  let paradigms = new Array<Uint16Array>()
  let paradigmsView = new DataView(paradigmsBuf)
  let curByte = 0
  while (curByte < paradigmsBuf.byteLength) {
    let paradigmLen = paradigmsView.getUint16(curByte, true) * 3
    curByte += 2
    paradigms.push(new Uint16Array(paradigmsBuf, curByte, paradigmLen))
    curByte += paradigmLen * 2
  }

  let wordsDawg = readStringMapDawg(wordsBuf, WordDawgPayload.create, 1, true)
  let dictionary = new Dictionary(wordsDawg, paradigms, suffixes, tags)
  return new MorphAnalyzer(dictionary)
}
