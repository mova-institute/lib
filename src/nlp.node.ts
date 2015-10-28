import {Tagger} from './tagger';
import {uniqValuedMap2array} from './algo'
import {traverseDepth, lang2, replace, isElement, isRoot, isText,
  remove, insertBefore} from './xml_utils'
import {WCHAR, nodeFromToken} from './nlp'

export * from './nlp'






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
export function tokenizeTeiXmlUk(root: Node) {
  let tagger = new Tagger();
  //let starttime = new Date().getTime();
  traverseDepth(root, async function(node: Node) {
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
  //console.log('small time: ', (new Date().getTime() - starttime) / 1000);
}

////////////////////////////////////////////////////////////////////////////////
export async function rysinDict2Json(readline, output) {
  return new Promise(resolve => {
    let lemmata = {};
    let lemmataIdGenerator = 0;
    let tags = {};
    let tagsIdGenerator = 0;
    let morphemes = new Map();
    let lemma;
    readline.on('line', (l: string) => {
      let arr = l.trim().split(' ');
      let [morpheme, tag] = arr;
      if (!l.startsWith(' ')) {
        lemma = morpheme;
      }
      (morphemes[morpheme] = morphemes[morpheme] || []).push([
        lemmata[lemma] = lemmata[lemma] || lemmataIdGenerator++,
        tags[tag] = tags[tag] || tagsIdGenerator++
      ]);

    }).on('close', () => {
      lemmata = uniqValuedMap2array(lemmata);
      tags = uniqValuedMap2array(tags);
      resolve([lemmata, tags, morphemes]);
    });
  });
}