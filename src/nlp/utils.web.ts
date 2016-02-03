import {xmlNsResolver} from '../xml/utils';
import {xpath} from '../xml/utils.web';
import {serializeXmlNoNs} from '../utils.web';
import {W, W_, PC, SE, P} from './common_elements'


////////////////////////////////////////////////////////////////////////////////
export function fragmentCorpusText(doc: Document) {
  const NUM_WORDS = 150;
  let ret = new Array<DocumentFragment>();
  
  let paragraphs: any[] = xpath(doc, '/tei:TEI/tei:text//tei:p', XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  let curNumWords = 0;
  let range = doc.createRange();
  paragraphs[0] && range.setStartBefore(paragraphs[0]);
  for (let [i, p] of paragraphs.entries()) {console.log(i);
    let numWords = doc.evaluate('count(.//mi:w_)', p, <any>xmlNsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
    curNumWords += numWords;
    
    if (true|| curNumWords >= NUM_WORDS || i === paragraphs.length - 1) {
      range.setEndAfter(p);
      ret.push(range.cloneContents());
      range.collapse(false);
      
      curNumWords = 0;
    }
  }
  
  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function firstNWords(n: number, from: Node) {
  let words = xpath(from, `//mi:w_[position() < ${n}]`, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE);
  return (<Element[]>words).map(x => x.firstElementChild.textContent);
}

////////////////////////////////////////////////////////////////////////////////
export function textFragmentCorpusText(doc: Document) {
  return fragmentCorpusText(doc).map(x => ({
    xmlstr: serializeXmlNoNs(x),
    firstWords: firstNWords(4, x.firstElementChild)
  }));
}

////////////////////////////////////////////////////////////////////////////////
export function getTeiName(doc: Document) {
  let ret = doc.evaluate('//tei:teiHeader//tei:titleStmt/tei:title', doc, <any>xmlNsResolver,
    XPathResult.STRING_TYPE, null).stringValue;
  return ret.trim() || null;
}