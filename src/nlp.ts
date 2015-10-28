/// <reference path="../typings/tsd.d.ts" />
import {traverseDepth} from './xml_utils';
import {r} from './lang';


export const WCHAR = r`\-\w’АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщьЮюЯя`;
export const WCHAR_RE = new RegExp(`^[${WCHAR}]+$`);

const PUNC_REG = [
  r`\.`,
  r`\.{4,}`,
  r`…`,
  r`:`,
  r`;`,
  r`,`,
  r`[!?]+`,
  r`!\.{2,}`,
  r`\?\.{2,}`,
  r`—`,
  r`\(`,
  r`\)`,
  r`„`,
  r`“`,
  r`«`,
  r`»`,
];
const PUNC_REG_JOIN = new RegExp(`^(${PUNC_REG.join('|')})$`);

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
export function nodeFromToken(token: string, document: Document) {
  let toret;
  if (PUNC_REG_JOIN.test(token)) {
    toret = document.createElement('pc');
    toret.textContent = token;
  }
  else if (WCHAR_RE.test(token)) {
    toret = document.createElement('w');
    toret.textContent = token;
  }
  else {
    console.log('DIE: ', token);
    throw 'kuku';
  }
  
  return toret;
}