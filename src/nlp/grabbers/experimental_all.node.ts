import * as path from 'path'
import * as fs from 'fs'
import * as nlpUtils from '../utils';
import { createMorphAnalyzerSync } from '../morph_analyzer/factories.node';
import { filename2lxmlRootSync } from '../../utils.node';

import { LibxmljsDocument } from 'xmlapi-libxmljs';


const libxmljs = require('libxmljs');
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

  console.log(`Verticalizing texts from parallel corpora`);
  let parallelFilesTagged = globSync(destDirParallel + '/**/*.xml');
  parallelFilesTagged.forEach((filePath, i) => {
    let basename = path.basename(filePath);
    console.log(`  ${basename} ${countOf(i, parallelFiles.length)}`);

    let root = filename2lxmlRootSync(filePath);
    for (let line of nlpUtils.tei2nosketch(root, { id: basename })) {
      fs.appendFileSync(verticalFile as any, line + '\n', 'utf8');
    }
  });

  // =======

}


//------------------------------------------------------------------------------
function main() {
  const args = require('minimist')(process.argv.slice(2), {
    // boolean: ['tee'],
  });
  compileCorpus(args.in, args.out);
  // updateMetadataInVertical(args.in, args.out);
}

////////////////////////////////////////////////////////////////////////////////
export function updateMetadataInVertical(inputFilePath: string, outFilePath) {
  let lineReader = require('readline').createInterface({
    input: fs.createReadStream(inputFilePath),
  });
  let outFile = fs.openSync(outFilePath, 'w');

  lineReader.on('line', (line: string) => {
    if (line.startsWith('<doc')) {
      fs.writeSync(outFile, line + '\n')
    } else {
      fs.writeSync(outFile, line + '\n')
    }
  });
}

//------------------------------------------------------------------------------
function countOf(i: number, len: number) {
  return `(${i + 1} of ${len})`;
}
