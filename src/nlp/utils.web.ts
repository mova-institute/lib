import {xmlNsResolver, encloseInRootNs} from '../xml/utils';
import {WebapiDocument, WebapiElement} from '../xml/api/webapi_adapters';
import {xpath} from '../xml/utils.web';
import {serializeXml, serializeXmlNoNs, parseXml} from '../utils.web';
import {W, W_, PC, SE, P} from './common_elements';
import {MorphAnalyzer} from '../nlp/morph_analyzer/morph_analyzer';
import {tokenizeTeiDom, tagTokenizedDom, enumerateWords, firstNWords} from './utils';


////////////////////////////////////////////////////////////////////////////////
export function fragmentCorpusText(doc: Document) {
  const NUM_WORDS = 150;
  let ret = new Array<DocumentFragment>();

  let paragraphs: any[] = xpath(doc, '/tei:TEI/tei:text//tei:p', XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  let curNumWords = 0;
  let range = doc.createRange();
  let rangeStart = paragraphs[0];
  for (let [i, p] of paragraphs.entries()) {
    let numWords = doc.evaluate('count(.//mi:w_)', p, <any>xmlNsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
    curNumWords += numWords;

    if (true||curNumWords >= NUM_WORDS || i === paragraphs.length - 1) {
      range.setStartBefore(rangeStart);
      range.setEndAfter(p);
      ret.push(range.cloneContents());
      rangeStart = paragraphs[i + 1];

      curNumWords = 0;
    }
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function textFragmentCorpusText(doc: Document) {
  return fragmentCorpusText(doc).map(x => ({
    xmlstr: serializeXmlNoNs(x),
    firstWords: firstNWords(4, new WebapiElement(x.firstElementChild))
  }));
}

////////////////////////////////////////////////////////////////////////////////
export function getTeiName(doc: Document) {
  let ret = doc.evaluate('//tei:teiHeader//tei:titleStmt/tei:title', doc, <any>xmlNsResolver,
    XPathResult.STRING_TYPE, null).stringValue;
  return ret.trim() || null;
}

////////////////////////////////////////////////////////////////////////////////
export function morphTagText(value: string, tagger: MorphAnalyzer, numerate: boolean) {
  let doc = parseXml(value);
  if (!doc || !doc.lookupNamespaceURI('mi')) {
    doc = parseXml(encloseInRootNs(value, 'text'));
  }
  let root = new WebapiDocument(doc).documentElement;
  tokenizeTeiDom(root, tagger);
  tagTokenizedDom(root, tagger);
  if (numerate) {
    enumerateWords(root);
  }
  let ret = serializeXml(root.underlying);

  return ret;
}