import {NS, nameNs, traverseDepth, traverseDepthEl, sortChildElements, normalizeEntities} from '../xml/utils';
import {W, W_, PC, SE, P} from './common_elements';
import * as elements from './common_elements';
import {r} from '../lang';
import {INode, IElement, IDocument} from '../xml/api/interface';
import {MorphAnalyzer} from './morph_analyzer/morph_analyzer';
import {$t} from './text_token';
import {IMorphInterp} from './interfaces';
import {MorphTag, compareTags} from './morph_tag';
import {WCHAR_UK_RE, WCHAR, WCHAR_RE} from './static';

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
export function haveSpaceBetweenEl(a: IElement, b: IElement): boolean {
  let tagA = a ? a.nameNs() : null;
  let textA = a ? a.textContent : null;
  let tagB = b ? b.nameNs() : null;
  let textB = b ? b.textContent : null;
  return haveSpaceBetween(tagA, textA, tagB, textB);
}

////////////////////////////////////////////////////////////////////////////////
const SPLIT_REGEX = new RegExp(`(${ANY_PUNC}|[^${WCHAR}])`);
export function tokenizeUk(val: string, analyzer: MorphAnalyzer) {
  let ret: Array<string> = [];
  for (let tok0 of val.trim().split(SPLIT_REGEX)) {
    for (let tok1 of tok0.split(/\s+/)) {
      if (tok1) {
        if (tok1.includes('-')) {
          if (!(analyzer.dictHas(tok1))) {
            ret.push(...tok1.split(/(-)/).filter(x => !!x));
            continue;
          }
        }
        ret.push(tok1);
      }
    }
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
const TOSKIP = new Set(['w', 'mi:w_', 'pc', 'abbr', 'mi:se']);
////////////////////////////////////////////////////////////////////////////////
export function tokenizeTeiDom(root: IElement, tagger: MorphAnalyzer) {
  traverseDepth(root, (node: INode) => {
    if (TOSKIP.has(node.nodeName)) {
      return 'skip';
    }
    if (node.isText()) {
      // let lang = node.lang();
      // if (lang === 'uk' || lang === '') {
      for (let tok of tokenizeUk(node.textContent, tagger)) {
        node.insertBefore(elementFromToken(tok, root.ownerDocument));
      }
      node.remove();
      // }
    }
  });

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function elementFromToken(token: string, document: IDocument): IElement {
  let ret;
  if (ANY_PUNC_OR_DASH_RE.test(token)) {
    ret = document.createElement('pc');
    ret.textContent = token;
  }
  else if (/^\d+$/.test(token) || WCHAR_RE.test(token)) {
    ret = document.createElement('w');
    ret.textContent = token;
  }
  else {
    //console.error(`Unknown token: "${token}"`); // todo
    ret = document.createElement('w');
    ret.textContent = token;
    //throw 'kuku' + token.length;
  }

  return ret;
}

//------------------------------------------------------------------------------
function tagWord(el: IElement, morphTags: Set<IMorphInterp>) {
  //let w_ = el.ownerDocument.createElementNS(NS.mi, 'w_');
  let miw = el.ownerDocument.createElement('mi:w_'); // todo

  for (let morphTag of morphTags) {
    let w = el.ownerDocument.createElement('w');
    w.textContent = el.textContent;
    let {lemma, tag} = morphTag;
    w.setAttribute('lemma', lemma);
    w.setAttribute('ana', tag);
    miw.appendChild(w);
  }
  el.replace(miw);

  return miw;
}

////////////////////////////////////////////////////////////////////////////////
export function regularizedFlowElement(el: IElement) {
  let ret = !(el.nameNs() === elements.teiOrig && el.parent() && el.parent().nameNs() === elements.teiChoice);

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function tagTokenizedDom(root: IElement, analyzer: MorphAnalyzer) {
  let subroots = [...root.xpath('//tei:title', NS), ...root.xpath('//tei:text', NS)];
  if (!subroots.length) {
    subroots = [root];
  }

  for (let subroot of subroots) {
    traverseDepthEl(subroot, el => {
      let name = el.nameNs();
      if (name === W_ || !regularizedFlowElement(el)) {
        return 'skip';
      }

      if (name === W) {
        let lang = el.lang();
        if (lang && lang !== 'uk') {
          tagWord(el, new Set([{ lemma: el.textContent, tag: 'foreign' }])).setAttribute('disamb', 0);
        }
        else {
          tagWord(el, analyzer.tag(el.textContent));
        }
      }
    });
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function enumerateWords(root: IElement, attributeName = 'n') {
  let idGen = 0;
  traverseDepthEl(root, el => {
    if (el.nameNs() === W_) {
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
export function getStats(root: IElement) {
  let wordCount = 0;
  let dictUnknownCount = 0;
  let dictUnknowns = new Set<string>();
  traverseDepthEl(root, elem => {
    let name = elem.nameNs();
    if (name === W_) {
      ++wordCount;
      // todo: use TextToken
      //...
    }
    else if (name === W && elem.getAttribute('ana') === 'X') {
      dictUnknowns.add(normalizeForm(elem.textContent));
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
export function markWordwiseDiff(mine: IElement, theirs: IElement) {
  let mineWords = <IElement[]>mine.xpath('//mi:w_', NS);
  let theirWords = <IElement[]>theirs.xpath('//mi:w_', NS);

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
export function firstNWords(n: number, from: IElement) {
  let words = from.xpath(`(//mi:w_)[position() <= ${n}]`, NS);
  return (<IElement[]>words).map(x => x.childElement(0).textContent);
}

////////////////////////////////////////////////////////////////////////////////
export function oldZhyto2newerFormat(root: IElement) {  // todo: rename xmlns
  let miwords = <IElement[]>root.xpath('//mi:w_', NS);
  for (let miw of miwords) {
    // rename attributes
    miw.renameAttributeIfExists('ana', 'disamb');
    miw.renameAttributeIfExists('word-id', 'n');




    // select unambig dict interps
    if (miw.childElementCount === 1 && !miw.getAttribute('disamb')) {
      miw.setAttribute('disamb', 0);
    }

    for (let w of miw.childElements()) {
      let mte = w.getAttribute('ana');
      // console.log(`mte: ${mte}`);
      let vesum = MorphTag.fromMte(mte, w.textContent).toVesumStr();
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
export function sortInterps(root: IElement) {
  for (let miw of <IElement[]>root.xpath('//mi:w_', NS)) {

    let disambIndex = Number.parseInt(miw.getAttribute('disamb'));
    let disambElem;
    if (!Number.isNaN(disambIndex)) {
      disambElem = miw.childElement(disambIndex);
    }

    sortChildElements(miw, (a, b) => {
      let ret = a.textContent.localeCompare(b.textContent);
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
export function untag(root: IElement) {
  let doc = root.ownerDocument;
  for (let miw of <IElement[]>root.xpath('//mi:w_', NS)) {
    let replacer = doc.createElement('w');
    replacer.textContent = miw.childElement(0).textContent;
    miw.replace(replacer);
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function getTeiDocName(doc: IDocument) {  // todo
  let title = <IElement>doc.documentElement.xpath('//tei:title', NS)[0];
  if (title) {
    title = untag(title.clone());
    return title.textContent.trim().replace(/\s+/g, ' ') || null;
  }

  return null;
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeCorpusText(root: IElement) {
  for (let textNode of root.xpathIt('//text()', NS)) {
    let res = /*normalizeEntities*/(textNode.textContent);
    res = res
      .replace(new RegExp(r`([${WCHAR}])\.{3}([^\.])?`, 'g'), '$1…$2')
      .replace(/ [-–] /g, ' — ');


    textNode.textContent = res;
  }

  let ret = root.ownerDocument.serialize();

  // todo:
  // if orig has >2 words
  // invisible spaces, libxmljs set entities
  return ret;
}
