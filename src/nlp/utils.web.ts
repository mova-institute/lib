import {xmlNsResolver, removeXmlns, encloseInRoot} from '../xml/utils';
import {xpath} from '../xml/utils.web';
import {serializeXml} from '../utils.web';
import {W, W_, PC, SE, P} from './common_elements'


////////////////////////////////////////////////////////////////////////////////
export function fragmentCorpusText(doc: Document) {
  const NUM_WORDS = 150;
  let ret = new Array<DocumentFragment>();
  
  let paragraphs = doc.evaluate('/tei:TEI/tei:text//tei:p', doc, <any>xmlNsResolver, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  let curNumWords = 0;
  let range = doc.createRange();
  let p = paragraphs.snapshotItem(0);
  p && range.setStartBefore(p);
  for (let i = 0; i < paragraphs.snapshotLength; ++i) {
    p = paragraphs.snapshotItem(i);
    
    let numWords = doc.evaluate('count(.//mi:w_)', p, <any>xmlNsResolver, XPathResult.NUMBER_TYPE, null).numberValue;
    curNumWords += numWords;
    
    if (curNumWords >= NUM_WORDS || i === paragraphs.snapshotLength - 1) {
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
  // debugger;
  // console.log(fragmentCorpusText(doc).map(x => firstNWords(4, x)));
  return fragmentCorpusText(doc).map(x => ({
    xmlstr: removeXmlns(serializeXml(x)),
    firstWords: firstNWords(4, x.firstElementChild)
  }));
}

////////////////////////////////////////////////////////////////////////////////
export function getTeiName(doc: Document) {
  let ret = doc.evaluate('//tei:teiHeader//tei:titleStmt/tei:title', doc, <any>xmlNsResolver,
    XPathResult.STRING_TYPE, null).stringValue;
  return ret.trim() || null;
}