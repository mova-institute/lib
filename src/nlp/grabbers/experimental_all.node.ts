import * as path from 'path'
import * as fs from 'fs'
import * as nlpUtils from '../utils';
import * as xmlUtils from '../../xml/utils';
import { createMorphAnalyzerSync } from '../morph_analyzer/factories.node';
import { filename2lxmlRootSync, linesSyncArray } from '../../utils.node';
import { indexTableByColumns } from '../../algo';

import { LibxmljsDocument } from 'xmlapi-libxmljs';


const globSync = require('glob').sync;
const mkdirp = require('mkdirp');



if (require.main === module) {
  main();
}

function docCreator(xmlstr: string) {
  return LibxmljsDocument.parse(xmlstr);
}


////////////////////////////////////////////////////////////////////////////////
export function compileCorpus(inputDir: string, outDir: string) {
  const morphAnalyzer = createMorphAnalyzerSync();
  morphAnalyzer.setExpandAdjectivesAsNouns(false);



  // ======= from parallel ========
  let parallelInput = path.join(inputDir, 'parallel');

  console.log(`Tagging texts from parallel corpora`);
  let parallelFiles = globSync(parallelInput + '/**/*.xml');
  let destDirParallel = path.join(outDir, 'tagged', 'parallel');
  parallelFiles.forEach((filePath, i) => {
    let basename = path.basename(filePath);
    let dest = path.join(destDirParallel, basename);
    if (fs.existsSync(dest)) {
      console.log(`  skipped existing ${basename} ${countOf(i, parallelFiles.length)}`);
    } else {
      console.log(`  ${basename} ${countOf(i, parallelFiles.length)}…`);

      let body = fs.readFileSync(filePath, 'utf8');
      body = nlpUtils.normalizeCorpusTextString(body);
      body = nlpUtils.tagText(body, morphAnalyzer, docCreator);

      mkdirp.sync(path.dirname(dest));
      fs.writeFileSync(dest, body, 'utf8');
    }
  });

  let verticalFile = fs.openSync(path.join(outDir, 'corpus.vertical.txt'), 'a');

  // console.log(`Verticalizing texts from parallel corpora`);
  // verticalizeDir(destDirParallel, verticalFile);

  console.log(`Verticalizing texts from kupa`);
  let destDirKupa = path.join(outDir, 'tagged', 'kupa');
  verticalizeDir(destDirKupa, verticalFile);

}

function verticalizeDir(dir: string, verticalFile: number) {
  let taggedFiles = globSync(dir + '/**/*.xml');
  taggedFiles.forEach((filePath, i) => {
    let basename = path.basename(filePath);
    console.log(`  ${basename} ${countOf(i, taggedFiles.length)}`);

    let root = filename2lxmlRootSync(filePath);
    let textRoot = root.evaluateElement('//tei:text', xmlUtils.NS);  // temp skip header
    if (textRoot) {
      root = textRoot;
    }
    let buf = []
    for (let line of nlpUtils.tei2nosketch(root, { filename: basename })) {
      buf.push(line + '\n')
    }
    fs.appendFileSync(verticalFile as any, buf.join(''), 'utf8');

  });
}


//------------------------------------------------------------------------------
function main() {
  const args = require('minimist')(process.argv.slice(2), {
    // boolean: ['tee'],
  });
  // compileCorpus(args.in, args.out);
  updateMetadataInVertical(args.meta, args.in, args.out);
}

////////////////////////////////////////////////////////////////////////////////
const attributesToCopy = new Set([
  'id',
  'title',
  'author',
  'year_created',
]);
export function updateMetadataInVertical(metaFileName: string, inputFileName: string, outFilePath) {
  let rows = separatedValues2Array(metaFileName, '\t').filter(x => !!x.filename);
  rows.forEach(x => x.filename = killExtension(x.filename.toLowerCase()));
  let metaTable: Map<string, any> = indexTableByColumns(rows, ['filename']);
// console.log(metaTable);


  let lineReader = require('readline').createInterface({
    input: fs.createReadStream(inputFileName),
  });
  let outFile = fs.openSync(outFilePath, 'w');

  let idGenerator = 0;
  lineReader.on('line', (line: string) => {
    if (line.startsWith('<doc')) {
      let newMeta: any = {
        id: '' + ++idGenerator,
      };
      let filename = line.match(/\sfilename="([^"]+)"/)[1];
      filename = filename.toLowerCase();
      filename = killExtension(filename);
      let meta = metaTable.get(filename);
      if (meta) {
        console.log(`Setting meta for "${filename}"`);

        Object.keys(meta).filter(x => attributesToCopy.has(x) && meta[x]).forEach(key => {
          newMeta[key] = meta[key].trim();
        });
      } else {
        console.error(`!!! No meta for "${filename}"`);
      }

      let newLine = `<doc ${xmlUtils.keyvalue2attributes(newMeta)}>`;
      fs.writeSync(outFile, newLine + '\n')
    } else {
      fs.writeSync(outFile, line + '\n')
    }
  });
}

//------------------------------------------------------------------------------
function killExtension(value: string) {
  return value.replace(/\.(txt|xml)$/, '')
}

//------------------------------------------------------------------------------
function countOf(i: number, len: number) {
  return `(${i + 1} of ${len})`;
}

//------------------------------------------------------------------------------
function separatedValues2Array(filename: string, separator: string) {
  let [headerString, ...lines] = linesSyncArray(filename);
  let header = headerString.split(separator);

  let ret = [];
  lines.forEach((line, i) => {
    let row = {};
    line.split(separator).forEach((cell, ii) => {
      row[header[ii]] = cell;
    });
    ret.push(row);
  });

  return ret;
}
