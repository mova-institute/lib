import { MorphAnalyzer, WordDawgPayload } from '../morph_analyzer/morph_analyzer';
import { createStringMapDawg } from '../../dawg/factories';


export function createMorphAnalyser(
  wordsBuf: ArrayBuffer,
  paradigmsBuf: ArrayBuffer,
  suffixes: string[],
  tags: string[]) {

  let dawg = createStringMapDawg(wordsBuf, WordDawgPayload.create);

  let paradigms = new Array<Uint16Array>();
  let paradigmsView = new DataView(paradigmsBuf);
  let curByte = 0;
  while (curByte < paradigmsBuf.byteLength) {
    let paradigmLen = paradigmsView.getUint16(curByte, true) * 3;
    curByte += 2;
    paradigms.push(new Uint16Array(paradigmsBuf, curByte, paradigmLen));
    curByte += paradigmLen * 2;
  }

  let ret = new MorphAnalyzer(dawg, paradigms, suffixes, tags, 'num', 'x');  // todo
  return ret;
}
