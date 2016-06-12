import { Dictionary } from '../dictionary/dictionary';
import { IMorphInterp } from '../interfaces';
import { MorphTag, Pos, Gender, Numberr } from '../morph_tag';

const wu: Wu.WuStatic = require('wu');



////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  constructor(
    private dictionary: Dictionary,
    private numberTag: string,
    private xTag: string) {
  }

  hasAnyCase(token: string) {
    return this.dictionary.hasAnyCase(token);
  }

  canBeToken(token: string) {
    return !!this.tag(token).size;
  }

  tag(token: string) {
    if (/^\d+$/.test(token)) {
      return new Set([{ lemma: token, flags: this.numberTag }]);
    }

    let lookupee = [token];
    let lowercase = token.toLowerCase();
    if (lowercase !== token) {
      lookupee.push(lowercase);
    }

    let ret = this.dictionary.lookupVariants(lookupee);

    if (!ret.size) {
      ret = this.dictionary.lookupVariants(lookupee.map(x => x.replace(/ґ/g, 'г')));
    }

    if (!ret.size && lowercase.endsWith('сти')) {
      lowercase = lowercase.slice(0, -1) + 'і';
      ret = new Set(this.dictionary.lookup(lowercase).filter(x => {
        let tag = MorphTag.fromVesumStr(x.flags);  // todo: lemmaTag?
        return tag.features.pos === Pos.noun && tag.features.gender === Gender.feminine
          && (tag.features.number === Numberr.singular || !tag.features.number);  // todo
      }));  // todo that new set()
    }

    let prefix = 'екс-';
    if (!ret.size && lowercase.startsWith(prefix)) {
      let interpretations = this.dictionary.lookup(lowercase.substr(prefix.length)).filter(x => {
        let tag = MorphTag.fromVesumStr(x.flags);
        return tag.features.pos === Pos.noun || tag.features.pos === Pos.adjective;
      }).map(x => {
        x.lemma = prefix + x.lemma;
        return x;
      });
      ret = new Set(interpretations);
    }

    return ret;
  }

  tagOrX(token: string) {
    let ret = this.tag(token);
    if (!ret.size) {
      ret.add({
        lemma: token,
        flags: this.xTag,
      });
    }
    return ret;
  }
}
