import {ObjectDawg} from '../../dawg/dawg';
import {MorphInterp} from '../interfaces';
// import {WCHAR_NOT_UK_RE} from '../static';

////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  constructor(
    private _words: ObjectDawg<WordDawgPayload>,
    private _paradigms: Array<Uint16Array>,
    private _suffixes: Array<string>,
    private _tags: Array<string>,
    private _numberTag: string,
    private _xTag: string) {
    }

  dictHas(token: string) {
    return this._words.has(token) || this._words.has(token.toLowerCase());
  }

  tag(token: string) {
    if (/^\d+$/.test(token)) {
      return new Set<MorphInterp>([{lemma: token, tag: this._numberTag}]);
    }
    
    // if (WCHAR_NOT_UK_RE.test(token)) {
    //   return new Set<MorphInterp>([{lemma: token, tag: 'alien'}]);  // todo      
    // }

    let ret = new Set<MorphInterp>();

    let toLookup = [token];
    let lowercase = token.toLowerCase();
    if (lowercase !== token) {
      toLookup.push(lowercase);
    }
    for (let word of toLookup) {
      for (let paraIndex of this._words.get(word)) {
        ret.add(this._getTag(word, paraIndex));
      }
    }
    
    if (!ret.size) {
      ret.add({
        lemma: token,
        tag: this._xTag
      });
    }

    return ret;
  }

  private _getTag(word: string, paraIndex: WordDawgPayload): MorphInterp {
    let paradigm = this._paradigms[paraIndex.paradigmId];

    let formSuffix = this._suffixes[paradigm[paraIndex.indexInPradigm]];
    let lemmaSuffix = this._suffixes[paradigm[0]];
    let lemma = word.slice(0, -formSuffix.length || word.length) + lemmaSuffix;
    // todo: prefixed

    let tag = this._tags[paradigm[paradigm.length / 3 + paraIndex.indexInPradigm]];

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
