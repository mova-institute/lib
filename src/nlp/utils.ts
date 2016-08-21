import { NS, nameNs, traverseDepth, traverseDepthEl, sortChildElements
  , traverseDepthGen } from '../xml/utils';
import * as xmlutils from '../xml/utils';
import { W, W_, PC, SE, P } from './common_elements';
import * as elementNames from './common_elements';
import { r, createObject } from '../lang';
import { unique } from '../algo';
import { AbstractNode, AbstractElement, AbstractDocument } from 'xmlapi';
import { MorphAnalyzer } from './morph_analyzer/morph_analyzer';
import { $t } from './text_token';
import { IMorphInterp } from './interfaces';
import { MorphTag, compareTags } from './morph_tag';
import { WORDCHAR_UK_RE, WORDCHAR, LETTER_UK } from './static';
import { $d, MiTeiDocument } from './mi_tei_document';

const wu: Wu.WuStatic = require('wu');


export type DocCreator = (xmlstr: string) => AbstractDocument;


export const ELEMS_BREAKING_SENTENCE_NS = new Set([
  nameNs(NS.tei, 'p'),
  nameNs(NS.tei, 'body'),
  nameNs(NS.tei, 'text'),
]);

const PUNC_REGS = [
  r`\.{4,}`,
  r`!\.{2,}`,
  r`\?\.{2,}`,
  r`[!?]+`,
  r`,`,
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
  r`…`,
  r`:`,
  r`;`,
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

const LEFT_GLUE_PUNC = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][0]).map(x => '\\' + x).join('');
const RIGHT_GLUE_PUNC = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][1]).map(x => '\\' + x).join('');
const NO_GLUE_PUNC = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][0] && PUNC_SPACING[x][1]).map(x => '\\' + x).join('');
// console.log(NO_GLUE_PUNC);

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
  let tagA = a ? a.name() : null;
  let textA = a ? a.text() : null;
  let tagB = b ? b.name() : null;
  let textB = b ? b.text() : null;
  return haveSpaceBetween(tagA, textA, tagB, textB);
}

////////////////////////////////////////////////////////////////////////////////
const SPLIT_REGEX = new RegExp(`(${ANY_PUNC}|[^${WORDCHAR}])`);
export function* tokenizeUk(val: string, analyzer: MorphAnalyzer) {
  let toks = val.trim().split(SPLIT_REGEX);
  let glue = false;
  for (let i = 0; i < toks.length; ++i) {
    let token = toks[i];
    if (!/^\s*$/.test(token)) {
      if (token.includes('-') && !analyzer.canBeToken(token)) {
        yield* token.split(/(-)/).filter(x => !!x).map(token => ({ token, glue }));
      }
      else {
        yield { token, glue };
      }
      glue = true;
    }
    else if (/^\s+$/.test(token)) {
      glue = false;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
const TOSKIP = new Set(['w', 'mi:w_', 'pc', 'abbr', 'mi:se']);

export function tokenizeTei(root: AbstractElement, tagger: MorphAnalyzer) {
  let subroots = [...root.evaluateNodes('//tei:title|//tei:text', NS)];
  if (!subroots.length) {
    subroots = [root];
  }
  let doc = root.document();
  for (let subroot of subroots) {
    traverseDepth(subroot, node => {
      if (node.isElement() && TOSKIP.has(node.asElement().localName())) {
        return 'skip';
      }
      if (node.isText()) {
        let text = node.text();
        let cursor = node.document().createElement('cursor');
        node.replace(cursor);

        for (let tok of tokenizeUk(text, tagger)) {
          if (tok.glue) {
            cursor.insertBefore(doc.createElement('g', NS.mi));
          }
          cursor.insertBefore(elementFromToken(tok.token, doc));
        }

        cursor.remove();
      }
    });
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function elementFromToken(token: string, document: AbstractDocument) {
  let ret: AbstractNode;
  if (ANY_PUNC_OR_DASH_RE.test(token)) {
    ret = document.createElement('pc'/*, NS.tei*/);
    ret.text(token);
  }
  // else if (/^\d+$/.test(token) || WORDCHAR_RE.test(token)) {
  //   ret = document.createElement('w'/*, NS.tei*/);
  //   ret.text(token);
  // }
  else {
    //console.error(`Unknown token: "${token}"`); // todo
    ret = document.createElement('w'/*, NS.tei*/);
    ret.text(token);
    //throw 'kuku' + token.length;
  }

  return ret;
}

//------------------------------------------------------------------------------
function fillInterpElement(miw: AbstractElement, form: string, morphTags: Iterable<IMorphInterp>) {
  let doc = miw.document();
  for (let morphTag of morphTags) {
    let w = doc.createElement('w');
    w.text(form);
    let { lemma, flags } = morphTag;
    w.setAttribute('lemma', lemma);
    w.setAttribute('ana', flags);
    miw.appendChild(w);
  }
  return miw;
}

//------------------------------------------------------------------------------
function tagWord(el: AbstractElement, morphTags: Iterable<IMorphInterp>) {
  let miw = fillInterpElement(el.document().createElement('w_', NS.mi), el.text(), morphTags);
  el.replace(miw);
  return miw;
}

//------------------------------------------------------------------------------
function tagOrXVesum(analyzer: MorphAnalyzer, token: string, nextToken?: string) {
  let ret = [...analyzer.tag(token, nextToken)].map(x => x.toVesumStrMorphInterp());
  return ret.length ? ret : [{ lemma: token, flags: 'x' }];
}

//------------------------------------------------------------------------------
function tagOrXMte(analyzer: MorphAnalyzer, token: string, nextToken?: string) {
  let ret = [...analyzer.tag(token, nextToken)].map(x => x.toMteMorphInterp());
  return ret.length ? ret : [{ lemma: token, flags: 'x' }];
}

////////////////////////////////////////////////////////////////////////////////
export function isRegularizedFlowElement(el: AbstractElement) {
  let ret = !(el.name() === elementNames.teiOrig && el.parent() && el.parent().name() === elementNames.teiChoice);

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function morphInterpret(root: AbstractElement, analyzer: MorphAnalyzer, mte = false) {
  let tagFunction = mte ? tagOrXMte : tagOrXVesum;

  let subroots = [...root.evaluateElements('//tei:title', NS), ...root.evaluateElements('//tei:text', NS)];
  if (!subroots.length) {
    subroots = [root];
  }

  for (let subroot of subroots) {
    traverseDepthEl(subroot, el => {

      let name = el.name();
      if (name === W_ || !isRegularizedFlowElement(el)) {
        return 'skip';
      }

      if (name === W || name === 'w') {  // hack, todo
        let lang = el.lang();
        if (lang && lang !== 'uk') {
          tagWord(el, [{ lemma: el.text(), flags: 'x:foreign' }]).setAttribute('disamb', 0);
        }
        else {
          let next = el.nextElementSiblings()
            .find(x => x.localName() === 'pc' || x.localName === 'w');
          tagWord(el, tagFunction(analyzer, el.text(), next && next.text()));
        }
      }
    });
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function morphReinterpret(words: AbstractElement[], analyzer: MorphAnalyzer) {
  for (let token of words.map(x => $t(x))) {
    let form = token.text();
    let interps = token.getDisambedInterps();
    let lang = token.elem.lang();
    if (lang && lang !== 'uk') {
      token.onlyInterpAs('x:foreign', form);
    } else {
      token.elem.clear();
      token.clearDisamb();
      fillInterpElement(token.elem, form, tagOrXVesum(analyzer, form));
      interps.forEach(x => {
        if (token.hasInterp(x.flags, x.lemma)) {
          token.alsoInterpAs(x.flags, x.lemma);
        }
      });
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function enumerateWords(root: AbstractElement, attributeName = 'n') {
  let idGen = 0;
  traverseDepthEl(root, el => {
    if (el.name() === W_) {
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
    let name = elem.name();
    if (name === W_) {
      ++wordCount;
      // todo: use TextToken
      //...
    }
    else if (name === W && elem.attribute('ana') === 'X') {
      dictUnknowns.add(normalizeForm(elem.text()));
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
  return WORDCHAR_UK_RE.test(value) || /^\d+$/.test(value);
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
  let wordPairs = wu.zip(mine.evaluateElements('//mi:w_', NS), theirs.evaluateElements('//mi:w_', NS));
  let numDiffs = 0;
  for (let [mineW, theirW] of wordPairs) {
    if (!$t(mineW).isEquallyInterpreted($t(theirW))) {
      ++numDiffs;
      $t(mineW).setMark('to-review');
    }
  }
  if (!wordPairs.next().done) {  // todo: check wat's up with wu's zipLongest
    throw new Error('Diff for docs with uneven word count not implemented');
  }

  return numDiffs;
}

////////////////////////////////////////////////////////////////////////////////
export function firstNWords(n: number, from: AbstractElement) {
  let words = [...from.evaluateElements(`(//mi:w_)[position() <= ${n}]`, NS)
    .map(x => x.firstElementChild().text())];  //todo
  return words;
}

////////////////////////////////////////////////////////////////////////////////
export function oldZhyto2newerFormat(root: AbstractElement) {  // todo: rename xmlns
  let miwords = root.evaluateElements('//mi:w_', NS);
  for (let miw of miwords) {
    // rename attributes
    miw.renameAttributeIfExists('ana', 'disamb');
    miw.renameAttributeIfExists('word-id', 'n');




    // select unambig dict interps
    if ([...miw.elementChildren()].length === 1 && !miw.attribute('disamb')) {
      miw.setAttribute('disamb', 0);
    }

    for (let w of miw.elementChildren()) {
      let mte = w.attribute('ana');
      // console.log(`mte: ${mte}`);
      let vesum = MorphTag.fromMte(mte, w.text()).toVesumStr();
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
  for (let miw of [...root.evaluateElements('//mi:w_', NS)]) {

    let disambIndex = Number.parseInt(miw.attribute('disamb'));
    let disambElem;
    if (!Number.isNaN(disambIndex)) {
      disambElem = miw.elementChild(disambIndex);
    }

    sortChildElements(miw, (a, b) => {
      let ret = a.text().localeCompare(b.text());
      if (ret) {
        return ret;
      }

      return compareTags(MorphTag.fromVesumStr(a.attribute('ana')), MorphTag.fromVesumStr(b.attribute('ana')));
      // return a.attribute('ana').localeCompare(b.attribute('ana'));
    });

    if (disambElem) {
      miw.setAttribute('disamb', [...miw.elementChildren()].indexOf(disambElem));
    }
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function untag(root: AbstractElement) {
  let doc = root.document();
  for (let miw of [...root.evaluateElements('//mi:w_', NS)]) {
    let replacer = doc.createElement('w');
    replacer.text(miw.firstElementChild().text());
    miw.replace(replacer);
  }

  return root;
}

////////////////////////////////////////////////////////////////////////////////
export function getTeiDocName(doc: AbstractDocument) {  // todo
  let title = doc.root().evaluateElement('//tei:title[1]', NS);
  if (title) {
    return title.evaluateElements('./mi:w_', NS).map(x => $t(x).text()).toArray().join(' ').trim();
  }
}

////////////////////////////////////////////////////////////////////////////////
export function adoptMorphDisambs(destRoot: AbstractElement, sourceRoot: AbstractElement) {
  // for (let miwSource of sourceRoot.evaluateElements('//mi:w_', NS)) {
  //   let miwDest = destRoot.evaluateElement(`//mi:w_[@n="${miwSource.attribute('n')}"]`, NS);
  //   let tokenSource = $t(miwSource);
  //   let { flags, lemma } = tokenSource.getDisambedInterps();
  //   let w = miwSource.document().createElement('w').setAttributes({
  //     ana: flags,
  //     lemma,
  //   });
  //   w.text(tokenSource.text());
  //   miwDest.replace(w);
  // }
  throw new Error('todo');
}

////////////////////////////////////////////////////////////////////////////////
const LATIN_CYR_GLYPH_MISSPELL = {
  'e': 'е',
  'y': 'у',
  'i': 'і',
  'o': 'о',
  'p': 'р',
  'a': 'а',
  'x': 'х',
  'c': 'с',
  'E': 'Е',
  'T': 'Т',
  'I': 'І',
  'O': 'О',
  'P': 'Р',
  'A': 'А',
  'H': 'Н',
  'K': 'К',
  'X': 'Х',
  'C': 'С',
  'B': 'В',
  'M': 'М',
}
const latinMisspells = Object.keys(LATIN_CYR_GLYPH_MISSPELL).join('');
const latinMisspellsRe1 = new RegExp(r`([${LETTER_UK}])([${latinMisspells}])`, 'g');
const latinMisspellsRe2 = new RegExp(r`([${latinMisspells}])([${LETTER_UK}])`, 'g');
export function fixLatinGlyphMisspell(value: string) {
  value = value.replace(latinMisspellsRe1, (match, cyr, latin) => cyr + LATIN_CYR_GLYPH_MISSPELL[latin])
  value = value.replace(latinMisspellsRe2, (match, latin, cyr) => LATIN_CYR_GLYPH_MISSPELL[latin] + cyr)
  return value;
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeCorpusTextString(value: string) {
  let ret = value
    .replace(/\r/g, '\n')
    .replace(/(\s*)\n\s*\n(\s*)/g, '$1\n$2')
    .replace(new RegExp(r`([${WORDCHAR}${RIGHT_GLUE_PUNC}])\.{3}([^\.])?`, 'g'), '$1…$2')
    .replace(/(^|\s)[\-–] /g, '$1— ')
    // .replace(new RegExp(r`((\s|${ANY_PUNC})[\-–]([${LETTER_UK}])`, 'g'), '$1 — $2')
    .replace(new RegExp(r`([${LETTER_UK}])'`, 'g'), '$1’')
    .replace(new RegExp(r`(?=[${WORDCHAR}])'(?=[${WORDCHAR}])'`, 'g'), '’')
    .replace(new RegExp(r`(^|\s)"([${RIGHT_GLUE_PUNC}${LETTER_UK}\w])`, 'g'), '$1“$2')
    .replace(new RegExp(r`([${LETTER_UK}${RIGHT_GLUE_PUNC}])"(\s|[-${RIGHT_GLUE_PUNC}${NO_GLUE_PUNC}]|$)`, 'g'), '$1”$2')
  ret = fixLatinGlyphMisspell(ret)

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
const unboxElems = new Set(['nobr', 'img']);
const removeElems = new Set(['br']);
export function normalizeCorpusText(root: AbstractElement) {
  let doc = root.document();
  traverseDepthEl(root, el => {
    if (unboxElems.has(el.localName())) {
      el.unwrap();
    }
    else if (removeElems.has(el.localName())) {
      el.remove();
    }
    else if (el.localName() === 'em') {
      let box = el.document().createElement('emph').setAttribute('rend', 'italic');
      el.rewrap(box);
    }
  });

  for (let textNode of root.evaluateNodes('//text()', NS)) {
    let res = normalizeCorpusTextString(textNode.text());
    textNode.replace(doc.createTextNode(res));
  }

  // todo:
  // if orig has >2 words
  // invisible spaces, libxmljs set entities
}

////////////////////////////////////////////////////////////////////////////////
const MULTISEP = '|';
const teiStructuresToCopy = createObject(['s', 'p', 'l', 'lg'].map(x => [nameNs(NS.tei, x), x]));

export function* tei2nosketch(root: AbstractElement, meta: any = {}) {
  yield `<doc ${xmlutils.keyvalue2attributes(meta)}>`;

  let elements = wu(traverseDepthGen(root)).filter(x => x.node.isElement());
  for (let { node, entering } of elements) {
    let e = node.asElement();
    let elName = e.name();
    if (entering) {
      if (meta.disambed && e.name() === elementNames.W) {
        let mte = e.attribute('ana');
        let lemma = e.attribute('lemma');
        yield nosketchLine(e.text().trim(), lemma, mte, 'xx');
        continue;
      }
      switch (elName) {
        case elementNames.W_: {
          let interps = $t(e).disambedOrDefiniteInterps();
          let mteTags = interps.map(x => MorphTag.fromVesumStr(x.flags, x.lemma).toMte());
          let vesumFlagss = interps.map(x => x.flags);
          let lemmas = interps.map(x => x.lemma);
          yield nosketchLine($t(e).text(), unique(lemmas).join(MULTISEP),
            unique(mteTags).join(MULTISEP), unique(vesumFlagss).join(MULTISEP));
          break;
        }
        case elementNames.PC:  // todo
          yield nosketchLine(e.text(), e.text(), 'U', 'punct');
          break;
        case elementNames.G:
          yield '<g/>';
          break;
        default: {
          if (elName in teiStructuresToCopy) {
            yield `<${teiStructuresToCopy[elName]}>`
          }
          break;
        }
      }
    } else {
      switch (elName) {
        default: {
          if (elName in teiStructuresToCopy) {
            yield `</${teiStructuresToCopy[elName]}>`
          }
          break;
        }
      }
    }
  }
  yield `</doc>`;
}

//------------------------------------------------------------------------------
function nosketchLine(token: string, lemma: string, mteTag: string, vesumTag: string) {
  return `${token}\t${lemma}\t${mteTag}\t${vesumTag}`;
}

function paragraphBySpaceBeforeNewLine(root: AbstractElement) {
  let doc = root.document();
  for (let textNode of root.evaluateNodes('./text()', NS)) {
    (textNode.text().match(/(.|\n)*?\S(\n|$)/g) || []).forEach(match => {
      let p = doc.createElement('p');
      p.text(match.replace(/\n/g, ''));
      root.appendChild(p);
      // console.log(match);
    });
    textNode.remove();
  }
}

////////////////////////////////////////////////////////////////////////////////
const TEI_DOC_TRANSFORMS = {
  normalize: normalizeCorpusText,
  paragraphBySpaceBeforeNewLine,
}
export function processMiTeiDocument(root: AbstractElement) {
  let doc = $d(root);

  doc.getTransforms().forEach(transformName => {
    TEI_DOC_TRANSFORMS[transformName](doc.getBody());
  });
}

////////////////////////////////////////////////////////////////////////////////
export function looksLikeMiTei(value: string) {
  return /^<[^>]*xmlns:mi="http:\/\/mova\.institute\/ns\/corpora\/0\.1"/.test(value);
}

////////////////////////////////////////////////////////////////////////////////
// todo: kill
export function tagText(value: string, analyzer: MorphAnalyzer, docCreator: DocCreator) {
  value = xmlutils.removeProcessingInstructions(value);
  if (!looksLikeMiTei(value)) {
    value = xmlutils.encloseInRootNs(value);
  }

  let doc = docCreator(value);
  tokenizeTei(doc.root(), analyzer);
  morphInterpret(doc.root(), analyzer);

  return doc.serialize(true);
}

////////////////////////////////////////////////////////////////////////////////
export function preprocessForTaggingGeneric(value: string, docCreator: DocCreator, isXml: boolean) {
  if (isXml) {
    value = xmlutils.removeProcessingInstructions(value)
    if (looksLikeMiTei(value)) {
      let ret = docCreator(value).root()
      processMiTeiDocument(ret)
      return ret
    }
  }
  value = normalizeCorpusTextString(value)
  if (!isXml) {
    value = xmlutils.escape(value)
  }
  value = xmlutils.encloseInRootNs(value)

  return docCreator(value).root()
}
