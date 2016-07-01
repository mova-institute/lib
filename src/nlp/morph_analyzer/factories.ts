import { MorphAnalyzer } from '../morph_analyzer/morph_analyzer';
import { WordDawgPayload } from '../dictionary/word_dawg_payload';
// import { readStringMapDawgSync } from 'dawgjs/factories';


export function createMorphAnalyser(
  wordsBuf: ArrayBuffer,
  paradigmsBuf: ArrayBuffer,
  suffixes: string[],
  tags: string[]) {

  throw new Error('Not implemented');
  // let paradigms = new Array<Uint16Array>();
  // let paradigmsView = new DataView(paradigmsBuf);
  // let curByte = 0;
  // while (curByte < paradigmsBuf.byteLength) {
  //   let paradigmLen = paradigmsView.getUint16(curByte, true) * 3;
  //   curByte += 2;
  //   paradigms.push(new Uint16Array(paradigmsBuf, curByte, paradigmLen));
  //   curByte += paradigmLen * 2;
  // }
  // console.log('fuuuuuuuuisdjflksbflksdbfkshbd');


  // let dawg = createStringMapDawg(wordsBuf, WordDawgPayload.create);
  // let ret = new MorphAnalyzer(dawg, paradigms, suffixes, tags, 'num', 'x');  // todo
  // return ret;
}
