import { findAllIndexes } from '../../algo';
import { Dictionary } from '../dictionary/dictionary';
import { IMorphInterp } from '../interfaces';
import { MorphTag } from '../morph_tag';
import { FOREIGN_CHAR_RE, LETTER_UK } from '../static';

import { HashSet } from '../../data_structures';

const wu: Wu.WuStatic = require('wu');



//------------------------------------------------------------------------------
const PREFIX_SPECS = [
  {
    prefixes: ['екс-', 'віце-', 'телерадіо', 'теле', 'радіо'],
    test: (x: MorphTag) => x.isNoun() || x.isAdjective(),
  },
  {
    prefixes: ['пре'],
    test: (x: MorphTag) => x.isAdjective() && x.isComparable(),
  },
  {
    prefixes: ['не'],
    test: (x: MorphTag) => x.isAdjective(),
  },
  {
    prefixes: ['обі', 'об', 'по', 'роз', 'за', 'у'],
    pretest: (x: string) => x.length > 4,
    test: (x: MorphTag) => x.isVerb() && x.isImperfect(),
    postprocess: (x: MorphTag) => x.setIsPerfect(),
  },
  {
    prefixes: ['за'],
    pretest: (x: string) => x.length > 4,
    test: (x: MorphTag) => x.isVerb(),
    postprocess: (x: MorphTag) => x.setIsPerfect(),
  },
];

////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  numeralMap: Array<{ form: string, flags: string, lemma: string }>;

  constructor(
    private dictionary: Dictionary,
    private numberTag: string,
    private foreignTag: string,
    private xTag: string) {

    this.buildNumeralMap();
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
  tag(token: string, nextToken?: string): Iterable<IMorphInterp> {
    token = token.replace(/́/g, '');  // kill emphasis

    if (/^\d+[½]?$/.test(token)) {
      return [{ lemma: token, flags: this.numberTag }];
    }

    if (/^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(token)) {
      return [{ lemma: token, flags: 'numr:roman' }];
    }

    if (/^[@#$%*]$/.test(token)) {
      return [{ lemma: token, flags: 'sym' }];
    }

    if (FOREIGN_CHAR_RE.test(token)) {
      return [{ lemma: token, flags: this.foreignTag }];
    }

    let lookupees = originalAndLowercase(token);
    let lowercase = lookupees[0];
    if (nextToken === '.') {
      lookupees.push(...lookupees.map(x => x + '.'));
    }

    let ret = new HashSet(MorphTag.hash,
      wu(lookupees).map(x => this.lookup(x)).flatten() as Iterable<MorphTag>);

    // ret.addAll(this.fromMisspelledG(lookupees));
    ret.addAll(this.fromPrefixes(lowercase, ret));

    // try одробив is the same as відробив
    if (!ret.size && lowercase.startsWith('од') && lowercase.length > 4) {
      ret.addAll(this.lookup('від' + lowercase.substr(2))
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
      if (this.lookup(left).some(x => x.isBeforeadj())) {
        let right = lowercase.substr(oIndex + 1);
        ret.addAll(this.lookup(right).filter(x => x.isAdjective()).map(x => {
          x.lemma = left + x.lemma;
          x.setIsAuto();
          return x;
        }));
      }
    }

    let match = lowercase.match(new RegExp(String.raw`^(\d+)-?([${LETTER_UK}]+)$`));
    if (match) {
      let suffix = match[2];
      ret.addAll(wu(this.numeralMap)
        .filter(x => x.form.endsWith(suffix))
        .map(x => wu(expandInterp(x.flags, x.lemma)))
        .flatten()
        .map(x => MorphTag.fromVesumStr(x, 'todo'))  // todo
      );

      // let n = Number.parseInt(match[1]);
      // if (!(n % 10) && suffix === 'ті') {
      //   ret.addAll(this.lookup('десяті')
      //     .filter(x => x.isNoSingular() && x.isInanimate())
      //     .map(x => (x.lemma = lowercase) && x)
      //   );
      // }
    }

    return wu(ret)
      .filter(x => nextToken === '-' || !x.isBeforeadj())
      .map(x => x.toVesumStrMorphInterp());
  }

  tagOrX(token: string, nextToken?: string) {
    let ret = [...this.tag(token, nextToken)];
    return ret.length ? ret : [{ lemma: token, flags: this.xTag }];
  }

  private lookupRaw(token: string) {
    return this.dictionary.lookup(token)
      .map(x => wu(expandInterp(x.flags, x.lemma))
        .map(flags => ({ flags, lemma: x.lemma })))
      .flatten() as Wu.WuIterable<IMorphInterp>;
  }

  private lookup(token: string) {
    return this.lookupRaw(token).map(
      x => MorphTag.fromVesumStr(x.flags, x.lemma));
  }

  private isCompoundAdjective(token: string) {
    if (token.includes('-')) {
      for (let tok of originalAndLowercase(token)) {
        let [last, ...prevs] = tok.split('-').reverse();
        return this.lookup(last).some(x => x.isAdjective())
          && prevs.every(x => this.lookup(x).some(xx => xx.isBeforeadj()));
      }
    }
    return false;
  }

  // private *fromMisspelledG(lookupees: string[]) {
  //   for (let lookupee of lookupees) {
  //     let indexes = [...findAllIndexes(lookupee, x => x.toLocaleLowerCase() === 'ґ')];
  //     if (indexes.length) {
  //       for (let interp of this.lookup(replaceG(lookupee))) {
  //         let lemmaConvertable = wu.zip(indexes, findAllIndexes(interp.lemma, x => x.toLocaleLowerCase() === 'ґ'))
  //           .every(([a, b]) => a === b);
  //         if (lemmaConvertable) {
  //           interp.lemma = replaceG(interp.lemma);
  //           yield interp;
  //         }
  //       }
  //     }
  //   }
  // }

  private *fromPrefixes(lowercase: string, fromDict: HashSet<any>) {
    for (let { prefixes, pretest, test, postprocess } of PREFIX_SPECS as any) {
      for (let prefix of prefixes) {
        if (lowercase.startsWith(prefix) && (!pretest || pretest(lowercase))) {
          for (let interp of this.lookup(lowercase.substr(prefix.length))) {
            if (!test || test(interp)) {
              interp.lemma = prefix + interp.lemma;
              if (postprocess) {
                postprocess(interp);
              }
              if (!fromDict.has(interp)) {
                interp.setIsAuto();
                yield interp;
              }
            }
          }
        }
      }
    }
  }

  private buildNumeralMap() {
    this.numeralMap = wu(['один', 'два', 'три', 'другий', 'третій'])
      .map(x => this.dictionary.lookupLexemesByLemma(x))
      // .map(x => x.)
      .flatten()
      .filter(x => x.flags.includes('numr'))
      // .map(x => ({ form: x.form, flags: x.flags }))
      .toArray();
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
const ignoreLemmas = new Set(['ввесь', 'весь', 'увесь', 'той', 'цей', 'його', 'її']);
function* expandInterp(flags: string, lemma?: string) {
  yield flags;
  if (flags.includes('adj:')
    && !ignoreLemmas.has(lemma)
    && !flags.includes('beforeadj')) {
    let suffixes = flags.includes(':p:')
      ? ['anim:m', 'anim:f', 'anim:n', 'anim:ns', 'inanim:m', 'inanim:f', 'inanim:n', 'inanim:ns']
      : ['anim', 'inanim'];
    yield* suffixes.map(x => flags + ':&noun:' + x);
  }
}

//------------------------------------------------------------------------------
// function replaceG(value: string) {
//   return value.replace(/ґ/g, 'г').replace(/Ґ/g, 'Г');
// }

/*

1,2,5

20-ті
20-х
20-их
20-тих
20-ми

5-та
5-й
5-ий
125-ій
1920-й
1920-му


*/
