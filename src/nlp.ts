import {traverseDepth, lang2, replace, isElement, isRoot, isText,
  remove, insertBefore} from './xml_utils'
import {r} from './lang';
import {Tagger} from './tagger'


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
export function tokenizeUk(val: string, tagger: Tagger) {
  let toret: Array<string> = [];

  let splitRegex = new RegExp(`([^${WCHAR}]+)`);

  for (let tok0 of val.trim().split(splitRegex)) {
    for (let tok1 of tok0.split(/\s+/)) {
      if (tok1) {
        if (tok1.includes('-')) {
          if (!(tagger.knows(tok1))) {
            toret.push(...tok1.split(/(-)/));
            continue;
          }
        }
        toret.push(tok1);
      }
    }
  }

  return toret;
}

////////////////////////////////////////////////////////////////////////////////
const TOSKIP = new Set(['w', 'mi:w_', 'pc', 'abbr', 'mi:se']);
////////////////////////////////////////////////////////////////////////////////
export function tokenizeTeiDom(root: Node, tagger: Tagger) {
  traverseDepth(root, (node: Node) => {
    if (isElement(node) && TOSKIP.has((<Element>node).tagName)) {
      return 'skip';
    }
    if (isText(node) && lang2(node) === 'uk') {
      for (let tok of tokenizeUk(node.nodeValue, tagger)) {
        insertBefore(nodeFromToken(tok, root.ownerDocument), node);
      }
      remove(node);                                                                                                                                
    }
  });
  
  return root;
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