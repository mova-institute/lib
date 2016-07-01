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
    return wu(this.words.getArray(word)).map(x => this.buildInterp(word, x));
  }

  lookupVariants(words: Iterable<string>) {
    return new HashSet(IMorphInterp.hash, wu.chain(...wu(words).map(x => this.lookup(x))));
  }

  lookupLexemesByLemma(lemma: string) {
    return wu(this.words.getArray(lemma))
      .filter(x => x.indexInPradigm === 0)
      .map(x => this.buildLexeme(x.paradigmId, lemma));
  }

  private nthInParadigm(paradigm: Uint16Array, n: number) {
    let suffix = this.suffixes[paradigm[n]];
    let flags = this.flags[paradigm[paradigm.length / 3 + n]];
    let prefix = this.flags[paradigm[paradigm.length / 3 * 2 + n]];

    return { suffix, flags, prefix };
  }

  private buildInterp(word: string, paraIndex: WordDawgPayload): IMorphInterp {
    let paradigm = this.paradigms[paraIndex.paradigmId];
    let { suffix, flags, prefix } = this.nthInParadigm(paradigm, paraIndex.indexInPradigm);

    let lemmaSuffix = this.suffixes[paradigm[0]];
    let lemma = word.slice(0, -suffix.length || word.length) + lemmaSuffix;
    // todo: prefixed

    return { lemma, flags };
  }

  private *buildLexeme(paradigmIndex: number, lemma: string) {
    let paradigm = this.paradigms[paradigmIndex];
    let lemmaInterp = this.nthInParadigm(paradigm, 0);
    let stem = lemma.substr(0, lemma.length - lemmaInterp.suffix.length);
    for (let i = 0; i < paradigm.length / 3; ++i) {
      let { suffix, flags } = this.nthInParadigm(paradigm, i);
      yield {
        form: stem + suffix,
        flags,
        lemma,
        lemmaFlags: lemmaInterp.flags,
      };
    }
  }
}
