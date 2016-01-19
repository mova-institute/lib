import {ObjectDawg} from '../../dawg/dawg'


export interface MorphTag {  // todo
  lemma: string;
  tag: string;
}

////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  constructor(
    private words: ObjectDawg<WordDawgPayload>,
    private paradigms: Array<Uint16Array>,
    private suffixes: Array<string>,
    private tags: Array<string>) {
      
    }

  dictHas(token: string) {
    return this.words.has(token);
  }

  tag(token: string) {
    if (/^\d+$/.test(token)) {
      return new Set<MorphTag>([{lemma: token, tag: 'Md'}]);
    }

    let ret = new Set<MorphTag>();

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

    return ret;
  }

  private getTag(word: string, paraIndex: WordDawgPayload): MorphTag {
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