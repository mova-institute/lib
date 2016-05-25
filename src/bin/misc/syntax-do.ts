import * as fs from 'fs';
import { nonemptyLinesSyncArray, linesSyncArray, filename2lxmlRootSync } from '../../utils.node';
import * as glob from 'glob';
import { NS } from '../../xml/utils';
import { $t } from '../../nlp/text_token';

const args = require('minimist')(process.argv.slice(2));


const WCHAR = `’АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя`;
export const WCHAR_RE = new RegExp(`^[${WCHAR}]+$`);


main();


////////////////////////////////////////////////////////////////////////////////
function main() {
  if (args['concat-folder']) {
    concat();
  }
  else if (args.extract) {
    extract2();
  }
}

////////////////////////////////////////////////////////////////////////////////
function concat() {
  let retLines = new Array<string>();
  let filenames = glob.sync('*.out').sort(compare);
  for (let filename of filenames) {
    let lines = nonemptyLinesSyncArray(filename);
    retLines.push(...lines.slice(1));
  }
  fs.writeFileSync(args.o || 'compound.txt', retLines.join('\n'), 'utf8');
}

//------------------------------------------------------------------------------
function compare(a: string, b: string) {
  return Number.parseInt(a.match(/(\d+)\.out/)[1], 10) - Number.parseInt(b.match(/(\d+)\.out/)[1], 10);
}

////////////////////////////////////////////////////////////////////////////////
function extract2() {
  let lines = linesSyncArray(args.syntax);
  let docRoot = filename2lxmlRootSync(args.doc);
  // let elemsOfInterest = new Set<string>([W_]);
  // let first = nextElDocumentOrder(docRoot, elemsOfInterest);
  // let q = '//mi:w[0]';
  // console.log(q, docRoot.xpath(q, NS));

  let docCursor = $t(docRoot.xpath('//mi:w_', NS)[0]);

  const enum AmbigGroupPos { outside, first, inside }

  let ambigGroupPos = AmbigGroupPos.outside;
  for (let [lineN, line] of lines.entries()) {
    try {
      line = line.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      let flags = line.split(/\s/);

      let [n, form, lemma, synTag, mteTag] = flags;


      if (form === 'H1') {
        ambigGroupPos = AmbigGroupPos.first;
        continue;
      }
      else if (form === 'H2') {
        ambigGroupPos = AmbigGroupPos.outside;
        continue;
      }

      if (ambigGroupPos === AmbigGroupPos.first) {
        if (n.includes('-')) {
          let [nStart, nEnd] = n.split('-').map(x => Number.parseInt(x, 10));
          for (let j = 0; j < nEnd - nStart; ++j) {
            docCursor = docCursor.nextToken();
          }
        }
        docCursor = docCursor.nextToken();
        ambigGroupPos = AmbigGroupPos.inside;
        continue;
      }

      if (n.includes('-') || ambigGroupPos !== AmbigGroupPos.outside) {
        continue;
      }

      if (synTag !== 'PUNCT' && synTag !== '_' /*todo*/) {
        let disambOptions = docCursor.getDisambOptions();
        if (!disambOptions.length) {
          console.log('aaa');
          console.log(docCursor.elem.nameNs());
        }
        console.log([n, form, lemma, synTag, mteTag]);
        console.log(disambOptions);

        let disambOptionIndex = disambOptions.findIndex(x => x.tag === mteTag);
        if (disambOptionIndex < 0 && !docCursor.isUntagged()) {  // todo
          // console.error(disambOptions);
          // console.error([n, form, lemma, synTag, mteTag]);
          throw new Error('haha hahaha');
        }
        if (disambOptions.length > 1) {
          docCursor.disamb(disambOptionIndex);
        }
      }

      docCursor = docCursor.nextToken();
      // console.log('after next' + docCursor.elem.nameNs());
    }
    catch (e) {
      console.error('ERROR LINE ' + (lineN + 1));
      fs.writeFileSync('doc.syntdisambed.xml', docRoot.document.serialize(), 'utf-8');
      throw e;
    }
  }
}


/*////////////////////////////////////////////////////////////////////////////////
 function extract() {
 let lines = nonemptyLinesSyncArray(args.syntax).filter(x => !x.startsWith('#'));
 let docRoot = filename2lxmlRootSync(args.doc);

 let elemsOfInterest = new Set<string>([W_]);
 let first = nextElDocumentOrder(docRoot, elemsOfInterest);
 let docCursor = new TextToken(first);
 // console.log(docCursor.nextToken().nextToken().nextToken().nextToken().text());
 // process.exit(0);

 let ambigLoc = 0;
 for (let line of lines) {
 let lineFlags = line.split(' ');
 let [, lineType] = lineFlags;
 let morphCode = lineFlags[7];

 if (lineType === 'H1') {
 ambigLoc = 1;
 }
 else if (lineType === 'H2') {
 ambigLoc = 0;
 }



 if (!lineType.startsWith('H')
 && !lineType.startsWith('S')
 && ambigLoc !== 2) {
 let tokStr = line.substr(line.lastIndexOf('] ') + 2);
 tokStr = tokStr.substring(0, Math.max(tokStr.indexOf(' -'), tokStr.indexOf(' #')));

 let tokens = tokStr.split(' ');
 if (tokens.length % 2 !== 0) {
 continue;
 }

 let syncWith = tokens.find(x => WCHAR_RE.test(x));
 if (syncWith) {
 if (docCursor.text() === syncWith) {
 console.log(`=already synced with "${syncWith}"`);
 }
 else {
 console.log(`syncing with "${syncWith}"`);
 while (docCursor.text() !== syncWith) {
 console.log(`skipping "${docCursor.text()}"`);
 docCursor = docCursor.nextToken();
 }
 console.log(`------synced with "${syncWith}"`);
 }
 }


 let hashStuff = line.match(/#\w+\b/g);
 if (
 lineType === 'NG'
 && ambigLoc === 0
 && (!hashStuff || hashStuff.length === 1 && hashStuff[0] === '#zgodn')
 //&& morphCode.length === 3
 ) {
 console.log(`met "${tokStr}"`);
 // for (let i = 0; i < tokens.length / 2; ++i) {
 //   if (WCHAR_RE.test(tokens[i])){
 //     console.log(`nexting ${docCursor.text()}`);
 //     docCursor = docCursor.nextToken();
 //   }
 // }
 }

 for (let i = 0; i < tokens.length / 2; ++i) {
 if (WCHAR_RE.test(tokens[i])) {
 console.log(`nexting "${docCursor.text()}"`);
 docCursor = docCursor.nextToken();
 break;
 }
 }

 if (ambigLoc === 1) {
 ambigLoc = 2;
 }
 }
 }
 }*/
