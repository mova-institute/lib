import { ObjectDawg } from '../../dawg/object_dawg';
import { IMorphInterp } from '../interfaces';
// import {WCHAR_NOT_UK_RE} from '../static';

////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  constructor(private words: ObjectDawg<WordDawgPayload>,
              private paradigms: Array<Uint16Array>,
              private suffixes: Array<string>,
              private tags: Array<string>,
              private numberTag: string,
              private xTag: string) {
  }

  dictHas(token: string) {
    return this.words.has(token) || this.words.has(token.toLowerCase());
  }

  tag(token: string) {
    if (/^\d+$/.test(token)) {
      return new Set<IMorphInterp>([{ lemma: token, tag: this.numberTag }]);
    }

    // if (WCHAR_NOT_UK_RE.test(token)) {
    //   return new Set<MorphInterp>([{lemma: token, tag: 'alien'}]);  // todo
    // }

    let ret = new Set<IMorphInterp>();

    let toLookup = [token];
    let lowercase = token.toLowerCase();
    if (lowercase !== token) {
      toLookup.push(lowercase);
    }
    for (let word of toLookup) {
      for (let paraIndex of this.words.get(word)) {
        ret.add(this.getTag(word, paraIndex));
      }
    }

    if (!ret.size) {
      ret.add({
        lemma: token,
        tag: this.xTag,
      });
    }

    return ret;
  }

  private getTag(word: string, paraIndex: WordDawgPayload): IMorphInterp {
    let paradigm = this.paradigms[paraIndex.paradigmId];

    let formSuffix = this.suffixes[paradigm[paraIndex.indexInPradigm]];
    let lemmaSuffix = this.suffixes[paradigm[0]];
    let lemma = word.slice(0, -formSuffix.length || word.length) + lemmaSuffix;
    // todo: prefixed

    let tag = this.tags[paradigm[paradigm.length / 3 + paraIndex.indexInPradigm]];

    return { lemma, tag };
  }
}



////////////////////////////////////////////////////////////////////////////////
export class WordDawgPayload {
  paradigmId: number;
  indexInPradigm: number;

  static create(buf: ArrayBuffer) {  // todo: reference constructor directly
    return new WordDawgPayload(buf);
  }

  constructor(buf: ArrayBuffer) {
    let view = new DataView(buf);
    this.paradigmId = view.getUint16(0, false);
    this.indexInPradigm = view.getUint16(2, false);
  }
}
