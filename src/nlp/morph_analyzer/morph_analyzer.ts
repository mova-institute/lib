import { MapDawg } from 'dawgjs/map_dawg';
import { IMorphInterp } from '../interfaces';
import { MorphTag, Pos, Gender, Numberr } from '../morph_tag';
// import {WCHAR_NOT_UK_RE} from '../static';

////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  constructor(private words: MapDawg<string, WordDawgPayload>,
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


    let toLookup = [token];
    let lowercase = token.toLowerCase();
    if (lowercase !== token) {
      toLookup.push(lowercase);
    }

    let ret = this.lookup(toLookup);

    if (!ret.size) {
      ret = this.lookup(toLookup.map(x => x.replace(/ґ/g, 'г')));
    }

    if (!ret.size && lowercase.endsWith('сти')) {
      lowercase = lowercase.slice(0, -1) + 'і';
      ret = new Set([...this.lookup([lowercase])].filter(x => {
        let tag = MorphTag.fromVesumStr(x.tag);  // todo: lemmaTag?
        return tag.features.pos === Pos.noun && tag.features.gender === Gender.feminine
          && (tag.features.number === Numberr.singular || !tag.features.number);  // todo
      }));  // todo that new set()
    }

    if (!ret.size) {
      ret.add({
        lemma: token,
        tag: this.xTag,
      });
    }

    return ret;
  }

  private lookup(words: string[]) {
    let ret = new Set<IMorphInterp>();
    for (let word of words) {
      for (let paraIndex of this.words.get(word)) {
        ret.add(this.getTag(word, paraIndex));
      }
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

  static create(bytes: Uint8Array) {  // todo: reference constructor directly
    return new WordDawgPayload(bytes);
  }

  constructor(bytes: Uint8Array) {
    let view = new DataView(bytes.buffer);
    this.paradigmId = view.getUint16(0, false);
    this.indexInPradigm = view.getUint16(2, false);
  }
}
