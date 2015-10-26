/// <reference path="../typings/tsd.d.ts" />

import {Tagger} from './tagger'

let WCHAR_UK = 'АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщьЮюЯя’';

let PUNC_SPACING = {
  ',': ['', ' '],
  '.': ['', ' '],
  ':': ['', ' '],
  ';': ['', ' '],
  '-': ['', ''],    // dash
  '–': ['', ''],    // n-dash
  '—': [' ', ' '],  // m-dash
  '(': [' ', ''],
  ')': ['', ' '],
  '„': [' ', ''],
  '“': ['', ''],    // what about eng?
  '«': [' ', ''],
  '»': ['', ' '],
  '!': ['', ' '],
  '?': ['', ' '],
  '…': ['', ' '],
};

const WORD_TAGS = new Set(['w', 'mi:w_']);

////////////////////////////////////////////////////////////////////////////////
export function haveSpaceBetween(a: HTMLElement, b: HTMLElement): boolean {
  if (!a || !b) {
    return false;
  }

  if (WORD_TAGS.has(a.tagName) && WORD_TAGS.has(b.tagName)) {
    return true;
  }

  if (WORD_TAGS.has(a.tagName) && b.tagName === 'pc' && (b.innerHTML in PUNC_SPACING)) {
    return PUNC_SPACING[b.innerHTML][0].length > 0;
  }
  if (WORD_TAGS.has(b.tagName) && a.tagName === 'pc' && (a.innerHTML in PUNC_SPACING)) {
    return PUNC_SPACING[a.innerHTML][1].length > 0;
  }

  if (a.tagName === b.tagName && b.tagName === 'pc') {
    if (a.innerHTML === b.innerHTML) {
      return false;
    }
  }

  if (b.tagName === 'pc' && (b.innerHTML in PUNC_SPACING)) {
    return PUNC_SPACING[b.innerHTML][0].length > 0;
  }

  if (a.tagName === 'mi:se') {
    return true;
  }

  return false;
}

////////////////////////////////////////////////////////////////////////////////
export async function tokenizeUk(val: string): Promise<Array<string>> {
  let toret: Array<string> = [];

  let tagger = new Tagger();
  let splitRegex = new RegExp(`([^${WCHAR_UK}\\w\\-]+)`);

  for (let tok0 of val.split(splitRegex)) {
    for (let tok1 of tok0.split(/\s+/)) {
      if (tok1) {
        if (tok1.includes('-')) {
          if (!(await tagger.knows(tok1))) {
            toret.push(...tok1.split(/(-)/));
            continue;
          }
        }
        toret.push(tok1);
      }
    }
  }    
  tagger.close();

  return toret;
}

// export class WordMorph {
//   constructor(public lemma: string, public tags: string) {

//   }
// }
// ////////////////////////////////////////////////////////////////////////////////
// export function rysinDict2Json(input, output) {
//   let result = new Map();
//   let curLemma;
//   createInterface({ input, output: undefined }).on('line', (l: string) => {

//     let arr = l.trim().split(' ');
//     let word = arr[0];
//     if (!l.startsWith(' ')) {
//       curLemma = word;
//     }
//     let morph = new WordMorph(curLemma, arr[1]);
//     (result[word] = result[word] || []).push(morph);

//   }).on('close', () => {
//     //let stream = new Readable({objectMode: true});
//     //stringifyObject().push(result);
//     //stream.pipe(stringifyObject());//.pipe(output);
//     //let stream = stringifyObject();
//     //stream.push(4);
//     //stream.pipe(output)
//     output.write(JSON.stringify(result));
//   });
// }

export async function waheverasy(s) {
  return await tokenizeUk(s);
}