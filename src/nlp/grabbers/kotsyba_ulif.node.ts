import * as xmlUtils from '../../xml/utils';
import { string2lxmlRoot } from '../../utils.node';
import { tokenizeTei, morphInterpret } from '../utils';
import { createMorphAnalyserSync } from '../morph_analyzer/factories.node';

// import { AllHtmlEntities } from 'html-entities';
import * as fs from 'fs';
import * as path from 'path';

const mkdirp = require('mkdirp');
const charsetDetector = require('node-icu-charset-detector');
const globSync = require('glob').sync;


// const entities = new AllHtmlEntities();
const args = require('minimist')(process.argv.slice(2));
const morphAnalyzer = createMorphAnalyserSync();

main();

//------------------------------------------------------------------------------
function kotsybaUltif2DirtyTei(filename: string, destDir: string) {
  let buffer = fs.readFileSync(filename);
  let charset = charsetDetector.detectCharset(buffer);
  let basename = path.basename(filename);

  console.log(`processing "${basename}" charset ${charset} confidence ${charset.confidence}`);

  let fileString;
  try {
     fileString = buffer.toString(charset);
  }
  catch (e) {
    console.log(`ERROR: ${e.message}. Ignoring file ${basename}`);
    return;
  }
  fileString = fileString.replace(/[\r\0]/g, '');
  let bibliographyTry = fileString.match(/<bibliography>(.*)<\/bibliography>/);
  let title;
  if (bibliographyTry && bibliographyTry.length > 1) {
    title = xmlUtils.removeTags(bibliographyTry[1]).trim().replace(/\s+/g, ' ');
  } else {
    title = basename;
  }
  fileString = xmlUtils.removeTags(fileString);
  // fileString = entities.encode(fileString);
  fileString = xmlUtils.escape(fileString);
  fileString = `<p>${fileString}</p>`;
  // fileString = '<p>' + fileString
  //   // .replace(/<\/p>/g, '\n')
  //   .replace(/<[^>]+>/g, '')
  //   .trim()
  //   // .replace(/(\n+\s*)+/g, '</p>\n<p>')
  //   + '</p>';
  fileString = teiString({
    title,
    body: fileString,
  });
  // fs.writeFileSync('problem.xml', fileString, 'utf8')
  let root = string2lxmlRoot(fileString);
  tokenizeTei(root, morphAnalyzer);
  // console.profile('morphInterpret');
  morphInterpret(root, morphAnalyzer);
  // console.profileEnd('morphInterpret');
  fileString = root.serialize();

  // todo: treat duplicate filenmes
  mkdirp.sync(destDir);
  fs.writeFileSync(`${destDir}/${basename}`, fileString, 'utf8');
}

//------------------------------------------------------------------------------
function main() {
  let filenames = new Map<string, string>();
  for (let filePath of globSync(args.in) as string[]) {
    let basename = path.basename(filePath);
    if (basename.startsWith('_') && basename.endsWith('.txt')) {
      continue;
    }
    if (!filenames.has(basename) || filePath.includes('_ulif_allbooks')) {
      filenames.set(basename, filePath);
    }
  }
  console.log(`processing ${filenames.size} files...`);
  for (let filename of filenames.values()) {
    kotsybaUltif2DirtyTei(filename, args.out);
  }
}

//------------------------------------------------------------------------------
function teiString(params) {
  return `<TEI xmlns="http://www.tei-c.org/ns/1.0" xmlns:mi="http://mova.institute/ns/corpora/0.1"
  xml:lang="uk">
  <teiHeader>
    <fileDesc>
      <titleStmt>
        <title>${params.title || ''}</title>
        <author>${params.author || ''}</author>
      </titleStmt>
      <publicationStmt>
        <p></p>
      </publicationStmt>
      <sourceDesc>
        <p></p>
      </sourceDesc>
    </fileDesc>
  </teiHeader>
  <text>
    <body>
      ${params.body || ''}
    </body>
  </text>
</TEI>
`;
}
