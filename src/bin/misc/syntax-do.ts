import * as fs from 'fs';
import {nonemptyLinesSyncArray, filename2lxmlRootSync} from '../../utils.node';
import * as glob from 'glob';
import {collectForof} from '../../lang';
import * as assert from 'assert';
import {W, W_, PC, SE, P} from '../../nlp/common_elements';
import {nextElDocumentOrder} from '../../xml/utils';
import {TextToken} from '../../nlp/text_token';

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
    extract();
  }
}

////////////////////////////////////////////////////////////////////////////////
function concat() {
  let retLines = new Array<string>();
  let filenames = glob.sync('*.txt').sort(compare);
  for (let filename of filenames) {
    let lines = nonemptyLinesSyncArray(filename);
    retLines.push(...lines.slice(1));
  }
  fs.writeFileSync(args.o || 'compound.txt', retLines.join('\n'), 'utf8');
}

//------------------------------------------------------------------------------
function compare(a: string, b: string) {
  return parseInt(a.match(/(\d+)\.txt/)[1]) - parseInt(b.match(/(\d+)\.txt/)[1])
}

enum AmbigGroupLoc { outside, first, other };

////////////////////////////////////////////////////////////////////////////////
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
}