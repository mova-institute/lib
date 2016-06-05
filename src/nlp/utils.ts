import { NS, nameNs, traverseDepth, traverseDepthEl, sortChildElements } from '../xml/utils';
import { W, W_, PC, SE, P } from './common_elements';
import * as elements from './common_elements';
import { r, last } from '../lang';
import { AbstractNode, AbstractElement, AbstractDocument } from 'xmlapi';
import { MorphAnalyzer } from './morph_analyzer/morph_analyzer';
import { $t } from './text_token';
import { IMorphInterp } from './interfaces';
import { MorphTag, compareTags } from './morph_tag';
import { WCHAR_UK_RE, WCHAR, WCHAR_RE } from './static';

export const ELEMS_BREAKING_SENTENCE_NS = new Set([
  nameNs(NS.tei, 'p'),
  nameNs(NS.tei, 'body'),
  nameNs(NS.tei, 'text'),
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
  r`/`,
];
const ANY_PUNC = PUNC_REGS.join('|');
const ANY_PUNC_OR_DASH_RE = new RegExp(`^${ANY_PUNC}|-$`);

let PUNC_SPACING = {
  ',': [false, true],
  '.': [false, true],
  ':': [false, true],
  ';': [false, true],
  '-': [false, false],   // dash
  '–': [false, false],   // n-dash
  '—': [true, true],     // m-dash
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
export function haveSpaceBetween(tagA: string, textA: string, tagB: string, textB: string) {
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
export function haveSpaceBetweenEl(a: AbstractElement, b: AbstractElement): boolean {
  let tagA = a ? a.nameNs : null;
  let textA = a ? a.text : null;
  let tagB = b ? b.nameNs : null;
  let textB = b ? b.text : null;
  return haveSpaceBetween(tagA, textA, tagB, textB);
}

////////////////////////////////////////////////////////////////////////////////
const SPLIT_REGEX = new RegExp(`(${ANY_PUNC}|[^${WCHAR}])`);
export function tokenizeUk(val: string, analyzer: MorphAnalyzer) {
  let ret: Array<string> = [];
  for (let tok0 of val.trim().split(SPLIT_REGEX)) {
    for (let tok1 of tok0.split(/(\s+)/u)) {
      if (tok1.length) {
        if (tok1.includes('-')) {
          if (!(analyzer.dictHas(tok1))) {
            ret.push(...tok1.split(/(-)/).filter(x => !!x));
            continue;
          }
        }
        else if (ret.length && /\s+/.test(last(ret)) && /\s+/.test(tok1)) {
          continue;
        }
        ret.push(tok1);
      }
    }
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
const TOSKIP = new Set(['w', 'mi:w_', 'pc', 'abbr', 'mi:se']);

export function tokenizeTei(root: AbstractElement, tagger: MorphAnalyzer) {
  traverseDepth(root, (node: AbstractNode) => {
    if (node.isElement() && TOSKIP.has(node.asElement().nameLocal)) {
      return 'skip';
    }
    if (node.isText()) {
      let cursor = node.replace(node.document.createElement('cursor'));
      // let lang = node.lang();
      // if (lang === 'uk' || lang === '') {
      for (let tok of tokenizeUk(node.text, tagger)) {
        cursor.insertBefore(elementFromToken(tok, root.document));
      }
      cursor.remove();
    }
  });

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function elementFromToken(token: string, document: AbstractDocument) {
  let ret: AbstractNode;
  if (/\s/u.test(token)) {
    // console.error('poo');

    ret = document.createTextNode(' ');
  }
  else if (ANY_PUNC_OR_DASH_RE.test(token)) {
    ret = document.createElement('pc');
    ret.text = token;
  }
  else if (/^\d+$/.test(token) || WCHAR_RE.test(token)) {
    ret = document.createElement('w');
    ret.text = token;
  }
  else {
    //console.error(`Unknown token: "${token}"`); // todo
    ret = document.createElement('w');
    ret.text = token;
    //throw 'kuku' + token.length;
  }

  return ret;
}

//------------------------------------------------------------------------------
function tagWord(el: AbstractElement, morphTags: Set<IMorphInterp>) {
  //let w_ = el.ownerDocument.createElementNS(NS.mi, 'w_');
  let miw = el.document.createElement('mi:w_'); // todo

  for (let morphTag of morphTags) {
    let w = el.document.createElement('w');
    w.text = el.text;
    let { lemma, tag } = morphTag;
    w.setAttribute('lemma', lemma);
    w.setAttribute('ana', tag);
    miw.appendChild(w);
  }
  el.replace(miw);

  return miw;
}

////////////////////////////////////////////////////////////////////////////////
export function regularizedFlowElement(el: AbstractElement) {
  let ret = !(el.nameNs === elements.teiOrig && el.parent && el.parent.nameNs === elements.teiChoice);

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function tagTokenizedDom(root: AbstractElement, analyzer: MorphAnalyzer) {
  let subroots = [...root.evaluateElements('//tei:title', NS), ...root.evaluateElements('//tei:text', NS)];
  if (!subroots.length) {
    subroots = [root];
  }

  for (let subroot of subroots) {
    traverseDepthEl(subroot, el => {
      let name = el.nameNs;
      if (name === W_ || !regularizedFlowElement(el)) {
        return 'skip';
      }

      if (name === W) {
        let lang = el.lang();
        if (lang && lang !== 'uk') {
          tagWord(el, new Set([{ lemma: el.text, tag: 'foreign' }])).setAttribute('disamb', 0);
        }
        else {
          tagWord(el, analyzer.tag(el.text));
        }
      }
    });
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function enumerateWords(root: AbstractElement, attributeName = 'n') {
  let idGen = 0;
  traverseDepthEl(root, el => {
    if (el.nameNs === W_) {
      el.setAttribute(attributeName, (idGen++).toString());
    }
  });

  return idGen;
}

//------------------------------------------------------------------------------
function normalizeForm(str: string) {
  return cantBeLowerCase(str) ? str : str.toLowerCase();
}
////////////////////////////////////////////////////////////////////////////////
export function getStats(root: AbstractElement) {
  let wordCount = 0;
  let dictUnknownCount = 0;
  let dictUnknowns = new Set<string>();
  traverseDepthEl(root, elem => {
    let name = elem.nameNs;
    if (name === W_) {
      ++wordCount;
      // todo: use TextToken
      //...
    }
    else if (name === W && elem.getAttribute('ana') === 'X') {
      dictUnknowns.add(normalizeForm(elem.text));
      ++dictUnknownCount;
    }
  });

  return {
    wordCount,
    dictUnknownCount,
    dictUnknowns: [...dictUnknowns],
  };
}

////////////////////////////////////////////////////////////////////////////////
export function cantBeLowerCase(word: string) {
  if (word.length < 2) {
    return false;
  }
  let subsr = word.substr(1);
  return subsr !== subsr.toLowerCase();
}

////////////////////////////////////////////////////////////////////////////////
export function isSaneLemma(value: string) {
  return WCHAR_UK_RE.test(value) || /^\d+$/.test(value);
}

////////////////////////////////////////////////////////////////////////////////
export function isSaneMte5Tag(value: string) {
  return /^[A-Z][a-z0-9\-]*$/.test(value);
}

////////////////////////////////////////////////////////////////////////////////
export function* dictFormLemmaTag(lines: Array<string>) {
  let lemma;
  for (let line of lines) {
    let isLemma = !line.startsWith(' ');
    line = line.trim();
    if (line) {
      let [form, tag] = line.split(' ');
      if (isLemma) {
        lemma = form;
      }
      yield { form, lemma, tag };
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function markWordwiseDiff(mine: AbstractElement, theirs: AbstractElement) {
  let mineWords = [...mine.evaluateElements('//mi:w_', NS)];
  let theirWords = [...theirs.evaluateElements('//mi:w_', NS)];

  if (mineWords.length !== theirWords.length) {
    // console.error(wordsMine.length);
    // console.error(wordsTheirs.length);
    // console.error(mine.ownerDocument.serialize());
    // console.error(theirs.ownerDocument.serialize());
    throw new Error('Diff for docs with uneven word count not implemented');
  }

  let numDiffs = 0;
  for (let [i] of mineWords.entries()) {
    if ($t(mine).morphTag() !== $t(theirWords[i]).morphTag()) {
      ++numDiffs;
      mine.setAttribute('mark', 'to-review');
    }
  }

  return numDiffs;
}

////////////////////////////////////////////////////////////////////////////////
export function firstNWords(n: number, from: AbstractElement) {
  let words = from.evaluateElements(`(//mi:w_)[position() <= ${n}]`, NS);
  return words.map(x => x.firstElementChild().text);
}

////////////////////////////////////////////////////////////////////////////////
export function oldZhyto2newerFormat(root: AbstractElement) {  // todo: rename xmlns
  let miwords = root.evaluateElements('//mi:w_', NS);
  for (let miw of miwords) {
    // rename attributes
    miw.renameAttributeIfExists('ana', 'disamb');
    miw.renameAttributeIfExists('word-id', 'n');




    // select unambig dict interps
    if ([...miw.childElements()].length === 1 && !miw.getAttribute('disamb')) {
      miw.setAttribute('disamb', 0);
    }

    for (let w of miw.childElements()) {
      let mte = w.getAttribute('ana');
      // console.log(`mte: ${mte}`);
      let vesum = MorphTag.fromMte(mte, w.text).toVesumStr();
      // console.log(`vesum: ${vesum}`);

      w.setAttribute('ana', vesum);
    }

    // miw.removeAttribute('n');  // temp
    // miw.removeAttribute('disamb');  // temp
  }

  sortInterps(root);

  return root;

  // todo: sort attributes
}

////////////////////////////////////////////////////////////////////////////////
export function sortInterps(root: AbstractElement) {
  for (let miw of root.evaluateElements('//mi:w_', NS)) {

    let disambIndex = Number.parseInt(miw.getAttribute('disamb'));
    let disambElem;
    if (!Number.isNaN(disambIndex)) {
      disambElem = miw.childElement(disambIndex);
    }

    sortChildElements(miw, (a, b) => {
      let ret = a.text.localeCompare(b.text);
      if (ret) {
        return ret;
      }

      return compareTags(MorphTag.fromVesumStr(a.getAttribute('ana')), MorphTag.fromVesumStr(b.getAttribute('ana')));
      // return a.getAttribute('ana').localeCompare(b.getAttribute('ana'));
    });

    if (disambElem) {
      miw.setAttribute('disamb', [...miw.childElements()].indexOf(disambElem));
    }
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function untag(root: AbstractElement) {
  let doc = root.document;
  for (let miw of root.evaluateElements('//mi:w_', NS)) {
    let replacer = doc.createElement('w');
    replacer.text = miw.firstElementChild().text;
    miw.replace(replacer);
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function getTeiDocName(doc: AbstractDocument) {  // todo
  let title = doc.root.evaluateElement('//tei:title[1]', NS);
  if (title) {
    title = untag(title.clone());
    return title.text.trim().replace(/\s+/g, ' ') || null;
  }

  return null;
}

////////////////////////////////////////////////////////////////////////////////
const unboxElems = new Set(['nobr', 'img']);
export function normalizeCorpusText(root: AbstractElement) {
  traverseDepthEl(root, el => {
    if (unboxElems.has(el.nameLocal)) {
      el.unwrap();
    }
    if (el.nameLocal === 'em') {
      let box = el.document.createElement('emph').setAttribute('rend', 'italic');
      el.rewrap(box);
    }
  });

  for (let textNode of root.evaluateNodes('//text()', NS)) {
    let res = textNode.text
      .replace(new RegExp(r`([${WCHAR}])\.{3}([^\.])?`, 'g'), '$1…$2')
      .replace(/ [-–] /g, ' — ');

    textNode.text = res;
  }

  let ret = root.document.serialize();

  // todo:
  // if orig has >2 words
  // invisible spaces, libxmljs set entities
  return ret;
}
