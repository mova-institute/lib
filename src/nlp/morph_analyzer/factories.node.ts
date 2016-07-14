import { Dictionary } from '../dictionary/dictionary';
import { WordDawgPayload } from '../dictionary/word_dawg_payload';
import { MorphAnalyzer } from './morph_analyzer';
import { getLibRootRelative } from '../../path.node';

import { readFileSync } from 'fs';
import { readStringMapDawgSync } from 'dawgjs';


export function createMorphAnalyzerSync(dictFolder = getLibRootRelative('../data/dict/vesum')) {
  let tags = JSON.parse(readFileSync(dictFolder + '/tags.json', 'utf8'));
  let suffixes = JSON.parse(readFileSync(dictFolder + '/suffixes.json', 'utf8'));

  let paradigms = new Array<Uint16Array>();
  let buf = readFileSync(dictFolder + '/paradigms.bin');
  let curByte = 0;
  while (curByte < buf.length) {
    let paradigmByteLen = buf.readUInt16LE(curByte) * 3 * Uint16Array.BYTES_PER_ELEMENT;
    curByte += Uint16Array.BYTES_PER_ELEMENT;
    paradigms.push(new Uint16Array(buf.buffer, curByte, paradigmByteLen / Uint16Array.BYTES_PER_ELEMENT));
    curByte += paradigmByteLen;
  }

  let words = readStringMapDawgSync<WordDawgPayload>(dictFolder + '/words.dawg', WordDawgPayload.create);

  let numberTag = dictFolder.includes('vesum') ? 'numr:digit' : 'Md';  // todo
  let dictionary = new Dictionary(words, paradigms, suffixes, tags);
  let ret = new MorphAnalyzer(dictionary, numberTag, 'x:foreign', 'x');

  return ret;
}
