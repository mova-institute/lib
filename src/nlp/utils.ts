import {NS, nameNs, nameNsEl, traverseDepth, traverseDocumentOrder, lang2, replace, isElement, isRoot, isText,
  remove, insertBefore, insertAfter} from '../xml/utils'
import {W, W_, PC, SE, P} from './common_elements' 
import {r} from '../lang';
import {Tagger} from '../tagger'


export const WCHAR = r`\-\w’АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя`;
export const WCHAR_RE = new RegExp(`^[${WCHAR}]+$`);

//export const NOSPACE_ABLE_ELEMS
export const ELEMS_BREAKING_SENTENCE_NS = new Set([
  nameNs(NS.tei, 'p'),
  nameNs(NS.tei, 'body'),
  nameNs(NS.tei, 'text')
]);
const ELEMS_BREAKING_SENTENCE = new Set([
  'p', 'text'
]);

const PUNC_REGS = [
  r`„`,
  r`“`,
  r`”`,
  r`«`,
  r`»`,
  r`\(`,
  r`\)`,
  r`\[`,
  r`\]`,
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
];
const ANY_PUNC = PUNC_REGS.join('|');
const ANY_PUNC_OR_DASH_RE = new RegExp(`^${ANY_PUNC}|-$`);

let PUNC_SPACING = {
  ',': [false, true],
  '.': [false, true],
  ':': [false, true],
  ';': [false, true],
  '-': [false, false],    // dash
  '–': [false, false],    // n-dash
  '—': [true, true],  // m-dash
  '(': [true, false],
  ')': [false, true],
  '[': [true, false],
  ']': [false, true],
  '„': [true, false],
  '“': [true, false],    // what about ukr/eng?
  '”': [false, true],
  '«': [true, false],
  '»': [false, true],
  '!': [false, true],
  '?': [false, true],
  '…': [false, true],
};

const WORD_TAGS = new Set([W, W_]);


////////////////////////////////////////////////////////////////////////////////
export function haveSpaceBetween(tagA: string, textA: string,
                                 tagB: string, textB: string) {
  if (!tagA || !tagB) {
    return null;
  }
  let spaceA = !!PUNC_SPACING[textA] && PUNC_SPACING[textA][1];
  let spaceB = !!PUNC_SPACING[textB] && PUNC_SPACING[textB][0];
  let isWordA = WORD_TAGS.has(tagA);
  let isWordB = WORD_TAGS.has(tagB);

  if (isWordA && isWordB) {
    return true;
  }

  if (isWordA && tagB === PC) {
    return spaceB;
  }
  if (isWordB && tagA === PC) {
    return spaceA;
  }

  if (tagA === tagB && tagB === PC) {
    return spaceA && spaceB;
  }

  if (tagB === PC) {
    return spaceB;
  }
  
  if (tagB === P) {
    return false;
  }

  if (tagA === SE) {
    return true;
  }

  return null;
}

////////////////////////////////////////////////////////////////////////////////
export function haveSpaceBetweenEl(a: HTMLElement, b: HTMLElement): boolean {
  let tagA = a ? nameNsEl(a) : null;
  let textA = a ? a.textContent : null;
  let tagB = b ? nameNsEl(b) : null;
  let textB = b ? b.textContent : null; 
  return haveSpaceBetween(tagA, textA, tagB, textB);
}

////////////////////////////////////////////////////////////////////////////////
export function tokenizeUk(val: string, tagger: Tagger) {
  let toret: Array<string> = [];
  let splitRegex = new RegExp(`(${ANY_PUNC}|[^${WCHAR}])`);

  for (let tok0 of val.trim().split(splitRegex)) {
    for (let tok1 of tok0.split(/\s+/)) {
      if (tok1) {
        if (tok1.includes('-')) {
          if (!(tagger.knows(tok1))) {
            toret.push(...tok1.split(/(-)/).filter(x => !!x));
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
  if (ANY_PUNC_OR_DASH_RE.test(token)) {
    toret = document.createElement('pc');
    toret.textContent = token;
  }
  else if (/^\d+$/.test(token) || WCHAR_RE.test(token)) {
    toret = document.createElement('w');
    toret.textContent = token;
  }
  else {
    console.error(`Unknown token: "${token}"`); // todo
    toret = document.createElement('w');
    toret.textContent = token;
    //throw 'kuku' + token.length;
  }
  
  return toret;
}

//------------------------------------------------------------------------------
function tagWord(el: Element, tags) {
  //let w_ = el.ownerDocument.createElementNS(NS.mi, 'w_');
  let w_ = el.ownerDocument.createElement('mi:w_'); // todo
  
  if (!tags.length) {
    tags.push([el.textContent, 'X']);
  }
  for (let tag of tags) {
    let w = el.ownerDocument.createElement('w');
    w.textContent = el.textContent;
    let [lemma, ana] = tag;
    w.setAttribute('lemma', lemma);
    w.setAttribute('ana', ana);
    w_.appendChild(w);
  }
  replace(el, w_);
}
////////////////////////////////////////////////////////////////////////////////
export function tagTokenizedDom(root: Node, tagger: Tagger) {
  traverseDepth(root, (node: Node) => {
    if (isElement(node)) {
      let el = <Element>node;
      if (nameNsEl(el) === W_) {
        return 'skip';
      }// todo: wait https://github.com/tmpvar/jsdom/issues/1276#issuecomment-154660180
      if (el.tagName==='w'/*nameNsEl(el) === W*/) {
        tagWord(el, tagger.tag(el.textContent));
      }
    }
  });
  
  return root;
}