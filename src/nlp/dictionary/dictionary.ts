import { WordDawgPayload } from './word_dawg_payload';
import { IMorphInterp } from '../interfaces';
import { HashSet } from '../../data_structures';

import { MapDawg } from 'dawgjs/map_dawg';
const wu: Wu.WuStatic = require('wu');



export class Dictionary {
  constructor(
    private words: MapDawg<string, WordDawgPayload>,
    private paradigms: Array<Uint16Array>,
    private suffixes: Array<string>,
    private flags: Array<string>) {
  }

  hasAnyCase(token: string) {
    return this.words.has(token) || this.words.has(token.toLowerCase());
  }

  lookup(word: string) {
    return wu(this.words.get(word)).map(x => this.getTag(word, x));
  }

  lookupVariants(words: Iterable<string>) {
    return new HashSet(IMorphInterp.hash, wu.chain(...wu(words).map(x => this.lookup(x))));
  }

  private getTag(word: string, paraIndex: WordDawgPayload): IMorphInterp {
    let paradigm = this.paradigms[paraIndex.paradigmId];

    let formSuffix = this.suffixes[paradigm[paraIndex.indexInPradigm]];
    let lemmaSuffix = this.suffixes[paradigm[0]];
    let lemma = word.slice(0, -formSuffix.length || word.length) + lemmaSuffix;
    // todo: prefixed

    let flags = this.flags[paradigm[paradigm.length / 3 + paraIndex.indexInPradigm]];

    return { lemma, flags };
  }
}
