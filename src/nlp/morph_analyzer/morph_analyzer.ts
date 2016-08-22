import { findAllIndexes } from '../../algo';
import { Dictionary } from '../dictionary/dictionary';
import { IMorphInterp } from '../interfaces';
import { MorphTag, Case } from '../morph_tag';
import { FOREIGN_CHAR_RE, LETTER_UK } from '../static';

import { HashSet } from '../../data_structures';

const wu: Wu.WuStatic = require('wu');

const foreignPrefixes = [
  'екс-',
  'віце-',
  'телерадіо',
  'теле',
  'радіо',
  'аеро',
  'гео',
  'ізо',
  'мета',
  'етно',
  'квазі',
  'вібро',
  'бензо',
];

//------------------------------------------------------------------------------
const PREFIX_SPECS = [
  {
    prefixes: foreignPrefixes,
    test: (x: MorphTag) => x.isNoun() || x.isAdjective(),
  },
  {
    prefixes: ['пре'],
    test: (x: MorphTag) => x.isAdjective() && x.isComparable(),
  },
  {
    prefixes: ['не', 'між'],
    test: (x: MorphTag) => x.isAdjective(),
  },
  {
    prefixes: ['обі', 'об', 'по', 'роз', 'за', 'у'],
    pretest: (x: string) => x.length > 4,
    test: (x: MorphTag) => x.isVerb() && x.isImperfect(),
    postprocess: (x: MorphTag) => {
      x.setIsPerfect();
      if (x.isPresent()) {
        x.setIsFuture();
      }
    },
  },
  // {
  //   prefixes: ['за'],
  //   pretest: (x: string) => x.length > 4,
  //   test: (x: MorphTag) => x.isVerb(),
  //   postprocess: (x: MorphTag) => x.setIsPerfect(),
  // },
];

////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  expandAdjectivesAsNouns = true;
  numeralMap: Array<{ form: string, flags: string, lemma: string }>;

  constructor(private dictionary: Dictionary) {
    this.buildNumeralMap();
  }

  setExpandAdjectivesAsNouns(value: boolean) {
    this.expandAdjectivesAsNouns = value;
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
  tag(token: string, nextToken?: string) {
    token = token.replace(/́/g, '');  // kill emphasis

    // Arabic numerals
    if (/^\d+[½]?$/.test(token)) {
      return [MorphTag.fromVesumStr('numr', token)];
    }

    // Roman numerals
    if (/^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/.test(token)) {
      return [MorphTag.fromVesumStr('numr:roman', token)];
    }

    // symbols
    if (/^[@#$%*]$/.test(token)) {
      return [MorphTag.fromVesumStr('sym', token)];
    }

    // foreign
    if (FOREIGN_CHAR_RE.test(token)) {
      return [MorphTag.fromVesumStr('x:foreign', token)];
    }

    let lookupees = originalAndLowercase(token);
    let lowercase = lookupees[0];
    if (nextToken === '.') {
      lookupees.push(...lookupees.map(x => x + '.'));
    }

    let res = new HashSet(MorphTag.hash,
      wu(lookupees).map(x => this.lookup(x)).flatten() as Iterable<MorphTag>);

    // try одробив is the same as відробив
    if (!res.size && lowercase.startsWith('од') && lowercase.length > 4) {
      res.addAll(this.lookup('від' + lowercase.substr(2))
        .filter(x => x.isVerb())
        .map(x => {
          x.lemma = 'од' + x.lemma.substr(3);
          x.setIsAuto().setIsOdd();
          return x;
        }));
    }

    // try prefixes
    if (!res.size) {
      res.addAll(this.fromPrefixes(lowercase, res));
    }

    // guess невідомосиній from невідо- and синій
    let oIndex = lowercase.indexOf('о');
    if (oIndex > 2) {
      let left = lowercase.substring(0, oIndex + 1);
      if (this.lookup(left).some(x => x.isBeforeadj())) {
        let right = lowercase.substr(oIndex + 1);
        res.addAll(this.lookup(right).filter(x => x.isAdjective()).map(x => {
          x.lemma = left + x.lemma;
          x.setIsAuto();
          return x;
        }));
      }
    }

    let match = lowercase.match(new RegExp(String.raw`^(\d+)-?([${LETTER_UK}]+)$`));
    if (match) {
      let suffix = match[2];
      res.addAll(wu(this.numeralMap)
        .filter(x => x.form.endsWith(suffix))
        .map(x => wu(expandInterp(this.expandAdjectivesAsNouns, x.flags, x.lemma)))
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

    // postprocess
    for (let interp of res) {
      // add old accusative, e.g. додати в друзі
      if (interp.isNoun() && interp.isPlural() && interp.isNominative()) {
        res.add(interp.clone().setIsAuto().setCase(Case.accusativeOld));
      }
    }

    return [...res].filter(x => nextToken === '-' || !x.isBeforeadj());
  }

  private lookupRaw(token: string) {
    return this.dictionary.lookup(token)
      .map(x => wu(expandInterp(this.expandAdjectivesAsNouns, x.flags, x.lemma))
        .map(flags => ({ flags, lemma: x.lemma })))
      .flatten() as Wu.WuIterable<{
        lemma: string;
        flags: string;
        lemmaFlags: string;
      }>;
  }

  private lookup(token: string) {
    return this.lookupRaw(token)
      .map(x => MorphTag.fromVesumStr(x.flags, x.lemma, x.lemmaFlags))
    // .map(x => expandParsedInterp(x))
    // .flatten() as Wu.WuIterable<MorphTag>
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
const ignoreLemmas = new Set(['ввесь', 'весь', 'увесь', 'той', 'цей', 'cей', 'його', 'її']);
function* expandInterp(expandAdjectivesAsNouns: boolean, flags: string, lemma: string) {
  yield flags;
  if (expandAdjectivesAsNouns
    && flags.includes('adj:')
    && !ignoreLemmas.has(lemma)
    && !flags.includes('beforeadj')) {
    let suffixes = flags.includes(':p:')
      ? ['anim:m', 'anim:f', 'anim:n', 'anim:ns', 'inanim:m', 'inanim:f', 'inanim:n', 'inanim:ns']
      : ['anim', 'inanim'];
    yield* suffixes.map(x => flags + ':&noun:' + x);
  }
}

//------------------------------------------------------------------------------
function expandParsedInterp(interp: MorphTag) {
  // if (interp.isNoun() && interp.isPlural() && interp.isNominative) {
  return [interp, interp.clone().setIsAuto().setIsOdd()];
  // }
  // return [interp];
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
