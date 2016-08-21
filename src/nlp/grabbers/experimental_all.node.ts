import * as path from 'path'
import * as fs from 'fs'
import * as nlpUtils from '../utils';
import * as xmlUtils from '../../xml/utils';
import { createMorphAnalyzerSync } from '../morph_analyzer/factories.node';
import { filename2lxmlRootSync, linesSyncArray } from '../../utils.node';
import { indexTableByColumns } from '../../algo';
import { createObject2, isNumber } from '../../lang';

import { LibxmljsDocument } from 'xmlapi-libxmljs';


const globSync = require('glob').sync;
const mkdirp = require('mkdirp');


const textTypeTree = {
  'автореферат': ['наука'],
  'стаття': ['публіцистика'],
  // 'закон': ['проза'],
  // 'драма': ['проза'],
  // 'епос': ['вірш'],
  // 'поезія': ['рима'],
  'науково-популярний': ['наука'],
}



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

  console.log(`Verticalizing texts from parallel corpora`);
  verticalizeDir(destDirParallel, verticalFile);

  // console.log(`Verticalizing texts from kupa`);
  // let destDirKupa = path.join(outDir, 'tagged', 'kupa');
  // verticalizeDir(destDirKupa, verticalFile);

}

//------------------------------------------------------------------------------
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
    if (!basename) {
      throw new Error(`no basename`);
    }
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

const attributesToCopy = new Set([
  'id',
  'title',
  'author',
  'year_created',
  'comment',
  'text_type',
]);
////////////////////////////////////////////////////////////////////////////////
export function updateMetadataInVertical(metaFilePath: string, inputFilePath: string, outFilePath) {
  let rows = separatedValues2Array(metaFilePath, '\t').filter(x => !!x.filename);
  rows.forEach(x => x.filename = killExtension(x.filename.toLowerCase()));
  let metaTable: Map<string, any> = indexTableByColumns(rows, ['filename']);
  // console.log(metaTable);
  // return;

  let lineReader = require('readline').createInterface({
    input: fs.createReadStream(inputFilePath),
  });
  let outFile = fs.openSync(outFilePath, 'w');

  let idRegistry = new IdRegistry();
  lineReader.on('line', (line: string) => {
    if (line.startsWith('<doc')) {
      let newMeta: any = {};
      let filename = line.match(/\sfilename="([^"]+)"/)[1];
      filename = filename.toLowerCase();
      filename = killExtension(filename);
      let meta = metaTable.get(filename);
      if (meta) {
        console.log(`Setting meta for "${filename}"`);
        Object.keys(meta).filter(x => attributesToCopy.has(x) && meta[x]).forEach(key => {
          if (key === 'text_type') {
            newMeta[key] = createTextTypeAttribute(meta[key].trim());
          } else {
            newMeta[key] = meta[key].trim();
          }
        });
      } else {
        console.error(`!!! No meta for "${filename}"`);
      }

      if ('id' in newMeta) {
        if (isNumber(newMeta.id)) {
          idRegistry.register(newMeta.id)
          newMeta.id = formatTextId(newMeta.id)
        }
      } else {
        newMeta.id = formatTextId(idRegistry.get())
      }

      let newLine = `<doc ${xmlUtils.keyvalue2attributes(newMeta)}>`;
      fs.writeSync(outFile, newLine + '\n')
    } else {
      fs.writeSync(outFile, line + '\n')
    }
  });
}

//------------------------------------------------------------------------------
function formatTextId(id: number) {
  return id.toString(36).toUpperCase();
}

//------------------------------------------------------------------------------
class IdRegistry {
  private registry: Set<number>;
  private current = 0;

  get() {
    do {
      var ret = this.current++;
    }
    while (this.registry.has(ret));

    this.registry.add(ret);
    return ret;
  }

  register(value: number) {
    this.registry.add(value)
  }
}

//------------------------------------------------------------------------------
function createTextTypeAttribute(value: string) {
  let res = new Array<string>();
  value.split('|').forEach(type => {

    let leafAddress = textTypeTree[type];
    if (leafAddress) {
      for (let i of leafAddress.keys()) {
        let typePath = leafAddress.slice(0, i + 1).join('::');
        res.push(typePath)
      }
      res.push([...leafAddress, value].join('::'));
    } else {
      res.push(type);
    }
  });
  return res.join('|');
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
function separatedValues2Array(filename: string, separator: string): any[] {
  let [headerString, ...lines] = linesSyncArray(filename);
  let header = headerString.split(separator);
  let ret = lines.map(x => createObject2(header, x.split(separator)))
  return ret;
}


