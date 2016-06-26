import { Dictionary } from '../dictionary/dictionary';
import { IMorphInterp } from '../interfaces';
import { MorphTag } from '../morph_tag';
import { FOREIGN_CHAR_RE } from '../static';

import { HashSet } from '../../data_structures';

const wu: Wu.WuStatic = require('wu');



//------------------------------------------------------------------------------
const superpref = [
  {
    prefixes: ['екс-', 'віце-', 'телерадіо', 'теле', 'радіо'],
    test: (x: MorphTag) => x.isNoun() || x.isAdjective(),
  },
  {
    prefixes: ['пре'],
    test: (x: MorphTag) => x.isAdjective() && x.isComparable(),
  },
  {
    prefixes: ['обі', 'об', 'по', 'роз'],
    pretest: (x: string) => x.length > 4,
    test: (x: MorphTag) => x.isVerb() && x.isImperfect(),
    postprocess: (x: MorphTag) => x.setIsPerfect(),
  },
];

////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  constructor(
    private dictionary: Dictionary,
    private numberTag: string,
    private foreignTag: string,
    private xTag: string) {
  }

  hasAnyCase(token: string) {
    return this.dictionary.hasAnyCase(token);
  }

  canBeToken(token: string) {
    if (this.isCompoundAdjective(token)) {
      return false;
    }
    return !this.tag(token)[Symbol.iterator]().next().done;
  }

  /** @token is atomic */
  tag(token: string): Iterable<IMorphInterp> {
    token = token.replace(/́/g, '');  // kill emphasis

    if (/^\d+$/.test(token)) {
      return [{ lemma: token, flags: this.numberTag }];
    }

    if (FOREIGN_CHAR_RE.test(token)) {
      return [{ lemma: token, flags: this.foreignTag }];
    }

    let lookupee = originalAndLowercase(token);
    let lowercase = lookupee[0];

    let ret = new HashSet(MorphTag.hash,
      wu(lookupee).map(x => this.lookupParsed(x)).flatten() as Iterable<MorphTag>);

    // if (!ret.size) {
    //   ret.addMany(this.dictionary.lookupVariants(lookupee.map(x => x.replace(/ґ/g, 'г'))));
    // }

    ret.addAll(this.fromPrefixes(lowercase, ret));

    // try одробив is the same as відробив
    if (!ret.size && lowercase.startsWith('од') && lowercase.length > 4) {
      ret.addAll(this.lookupParsed('від' + lowercase.substr(2))
        .filter(x => x.isVerb())
        .map(x => {
          x.lemma = 'од' + x.lemma.substr(3);
          x.setIsAuto().setIsOdd();
          return x;
        }));
    }

    let oIndex = lowercase.indexOf('о');
    if (oIndex > 2) {
      let left = lowercase.substring(0, oIndex + 1);
      if (this.lookupParsed(left).some(x => x.isBeforeadj())) {
        let right = lowercase.substr(oIndex + 1);
        ret.addAll(this.lookupParsed(right).filter(x => x.isAdjective()).map(x => {
          x.lemma = left + x.lemma;
          x.setIsAuto();
          return x;
        }));
      }
    }

    return wu(ret).map(x => x.toVesumStrMorphInterp());
  }

  tagOrX(token: string) {
    let ret = [...this.tag(token)];
    return ret.length ? ret : [{ lemma: token, flags: this.xTag }];
  }

  private lookupRaw(token: string) {
    return this.dictionary.lookup(token).map(x => expandInterp(x)).flatten();
  }

  private lookupParsed(token: string) {
    return this.lookupRaw(token).map(
      x => MorphTag.fromVesumStr(x.flags, undefined, token, x.lemma));
  }

  private isCompoundAdjective(token: string) {
    if (token.includes('-')) {
      for (let tok of originalAndLowercase(token)) {
        let [last, ...prevs] = tok.split('-').reverse();
        return this.lookupParsed(last).some(x => x.isAdjective())
          && prevs.every(x => this.lookupParsed(x).some(xx => xx.isBeforeadj()));
      }
    }
    return false;
  }

  private *fromPrefixes(lowercase: string, fromDict: HashSet<any>) {
    for (let { prefixes, pretest, test, postprocess } of superpref as any) {
      for (let prefix of prefixes) {
        if (lowercase.startsWith(prefix) && (!pretest || pretest(lowercase))) {
          yield* this.lookupParsed(lowercase.substr(prefix.length))
            .filter(x => (!test || test(x)) && !fromDict.has(x))
            .map(x => {
              x.lemma = prefix + x.lemma;
              if (postprocess) {
                postprocess(x);
              }
              x.setIsAuto();
              return x;
            });
        }
      }
    }
  }
}



//------------------------------------------------------------------------------
function originalAndLowercase(value: string) {
  let lowercase = value.toLowerCase();
  let ret = [lowercase];
  if (lowercase !== value) {
    ret.push(value);
  }

  return ret;
}

//------------------------------------------------------------------------------
const ignoreLemmas = new Set(['ввесь', 'весь', 'увесь', 'той', 'цей']);
function* expandInterp(interp: IMorphInterp) {
  yield interp;
  if (interp.flags.includes('adj:')
      && !ignoreLemmas.has(interp.lemma)
      && !interp.flags.includes('beforeadj')) {
    let suffixes = interp.flags.includes(':p:')
      ? ['anim:m', 'anim:f', 'anim:n', 'inanim:m', 'inanim:f', 'inanim:n']
      : ['anim', 'inanim'];
    yield* suffixes.map(x => ({
      lemma: interp.lemma,
      flags: interp.flags + ':&noun:' + x,
    }));
  }
}
