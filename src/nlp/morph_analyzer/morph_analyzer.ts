import { Dictionary } from '../dictionary/dictionary';
import { IMorphInterp } from '../interfaces';
import { MorphTag } from '../morph_tag';
import { FOREIGN_CHAR_RE } from '../static';

import { HashSet } from '../../data_structures';

const wu: Wu.WuStatic = require('wu');



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

    let ret = new HashSet(IMorphInterp.hash, wu(lookupee).map(x => this.lookup(x)).flatten());

    // if (!ret.size) {
    //   ret.addMany(this.dictionary.lookupVariants(lookupee.map(x => x.replace(/ґ/g, 'г'))));
    // }

    // // try Kharkiv-style
    // if (!ret.size && lowercase.endsWith('сти')) {
    //   let kharkivLowercase = lowercase.slice(0, -1) + 'і';
    //   ret.addMany(this.lookupParsed(kharkivLowercase)
    //     .filter(x => x.canBeKharkivSty())
    //     .map(x => x.toVesumStrMorphInterp()));
    // }

    // try префікс-щось is the same as щось
    for (let prefix of ['екс-', 'віце-']) {  // todo: віце not with adj (but with nounish adj)
      if (!ret.size && lowercase.startsWith(prefix)) {
        ret.addMany(this.lookupParsed(lowercase.substr(prefix.length))
          .filter(x => x.isNoun() || x.isAdjective()).map(x => {
            x.lemma = prefix + x.lemma;
            return x.toVesumStrMorphInterp();
          }));
      }
    }

    // try одробив is the same as відробив
    if (!ret.size && lowercase.startsWith('од') && lowercase.length > 4) {
      ret.addMany(this.lookup('від' + lowercase.substr(2))
        .filter(x => x.flags.includes('verb'))
        .map(x => {
          x.lemma = 'од' + x.lemma.substr(3);
          if (!x.flags.includes(':odd')) {
            x.flags += ':odd';
          }
          x.flags += ':auto';
          return x;
        }));
    }

    // try обробити is :perf for робити
    if (!ret.size && lowercase.length > 4) {
      for (let prefix of ['обі', 'об', 'по', 'роз']) {
        if (lowercase.startsWith(prefix)) {
          ret.addMany(this.lookupParsed(lowercase.substr(prefix.length))
            .filter(x => x.isVerb() && x.isImperfect()).map(x => {
              x.setIsPerfect().setIsAuto();
              x.lemma = prefix + x.lemma;
              return x.toVesumStrMorphInterp();
            }));
        }
      }
    }

    let oIndex = lowercase.indexOf('о');
    if (oIndex > 2) {
      let left = lowercase.substring(0, oIndex + 1);
      if (this.lookupParsed(left).some(x => x.isBeforedash())) {
        let right = lowercase.substr(oIndex + 1);
        ret.addMany(this.lookupParsed(right).filter(x => x.isAdjective()).map(x => {
          x.lemma = left + x.lemma;
          x.setIsAuto();
          return x.toVesumStrMorphInterp();
        }));
      }
    }

    return ret;
  }

  tagOrX(token: string) {
    let ret = [...this.tag(token)];
    return ret.length ? ret : [{ lemma: token, flags: this.xTag }];
  }

  private lookup(token: string) {
    return this.dictionary.lookup(token).map(x => expandInterp(x)).flatten();
  }

  private lookupParsed(token: string) {
    return this.lookup(token).map(
      x => MorphTag.fromVesumStr(x.flags, undefined, token, x.lemma));
  }

  private isCompoundAdjective(token: string) {
    if (token.includes('-')) {
      for (let tok of originalAndLowercase(token)) {
        let [last, ...prevs] = tok.split('-').reverse();
        return this.lookupParsed(last).some(x => x.isAdjective())
          && prevs.every(x => this.lookupParsed(x).some(xx => xx.isBeforedash()));
      }
    }
    return false;
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
function* expandInterp(interp: IMorphInterp) {
  yield interp;
  if (interp.flags.includes('adj:')) {
    let suffixes = interp.flags.includes(':p:')
      ? ['anim:m', 'anim:f', 'anim:n', 'inanim:m', 'inanim:f', 'inanim:n']
      : ['anim', 'inanim'];
    yield* suffixes.map(x => ({
      lemma: interp.lemma,
      flags: interp.flags + ':&noun:' + x,
    }));
  }
}
