#!/usr/bin/env node --max-old-space-size=6000

import { basename, join, dirname } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { existsSync, openSync, closeSync, writeSync } from 'fs'

import { sync as globSync } from 'glob'
import { sync as mkdirpSync } from 'mkdirp'
import { parseHtmlString } from 'libxmljs'
import { LibxmljsDocument } from 'xmlapi-libxmljs'
import * as minimist from 'minimist'

import { CorpusDoc } from './doc_meta'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { keyvalue2attributesNormalized } from '../nlp/noske_utils'
import { writeFileSyncMkdirp, parseJsonFileSync, write2jsonFile } from '../utils.node'
import { parseXmlFileSync } from '../xml/utils.node'
// import { conlluToken2vertical } from './extractors/conllu'
import { buildMiteiVertical } from './mitei_build_utils'
import { trimExtension, zerofill, toFloorPercent } from '../string_utils'
import { StanfordTaggerClient } from '../nlp/stanford_tagger_client'
import * as nlpUtils from '../nlp/utils'
import * as nlpStatic from '../nlp/static'
import {
  tokenizeMixml, mixml2tokenStream, token2sketchVertical, morphInterpret,
  autofixDirtyText, polishXml2verticalStream, normalizeWebParaSafe,
} from '../nlp/utils'
import { mu, Mu } from '../mu'
import { uniq } from '../algo'
import { AsyncTaskRunner } from '../lib/async_task_runner'
import { UdpipeApiClient } from '../nlp/ud/udpipe_api_client'
import { conlluStrAndMeta2vertical } from './tovert'


interface Args {
  stage: 'extract' | 'udpipe' | '4vec' | 'vertical'
  workspace: string
  part: string
  mitei?: string

  out?: string
  inputGlob: string
  inputRoot: string
  udpipeUrl: string

  checkUkr?: boolean
  checkDate?: boolean
}



const partName2function = {
  kontrakty,
  parallel: buildUkParallelSide,
  en: buildEnglish,
  pl: buildPolish,
}

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      workspace: ['ws'],
    },
    default: {
      workspace: '.',
    },
    boolean: [
      'checkDate',
      'checkUkr'
    ]
  }) as any

  main(args)
}

interface SpecificModule {
  streamDocs?(inputStr: string): Iterable<CorpusDoc>
  extract?(inputStr: string): CorpusDoc
}

//------------------------------------------------------------------------------
function getOutDir(args: Args) {
  return join(args.workspace, 'build', args.out || args.part)
}

//------------------------------------------------------------------------------
function globInforming(inputRoot: string, inputGlob = '**/*') {
  let globStr = join(inputRoot, inputGlob)
  console.log(`globbing input files: ${globStr}`)
  let ret = globSync(globStr, { nodir: true })
  console.log(`globbed ${ret.length} files`)
  return ret
}

//------------------------------------------------------------------------------
function main(args: Args) {
  let outDir = getOutDir(args)

  if (args.stage === 'extract') {
    let analyzer = createMorphAnalyzerSync().setExpandAdjectivesAsNouns(false).setKeepN2adj(true)

    let inputFiles = globInforming(args.inputRoot, args.inputGlob)
    if (args.part === 'chtyvo') {  // todo
      inputFiles = mu(inputFiles)
        .map(x => trimExtension(x))
        .filter(x => !x.endsWith('.meta'))
        .unique()
        .toArray()
    }

    let specificModule = require(`./extractors/${args.part}`) as SpecificModule
    let docCounter = 0

    for (let [fileI, filePath] of inputFiles.entries()) {
      let tolog = `extracted ${fileI} files (${toFloorPercent(fileI, inputFiles.length)}%), ${docCounter} docs, doing ${filePath}`

      let relPath = path.relative(args.inputRoot, filePath)
      if (specificModule.extract) {
        if (getMetaParaPaths(outDir, relPath).some(x => !fs.existsSync(x))) {
          console.log(tolog)
          let fileStr = fs.readFileSync(filePath, 'utf8')
          processDoc(args, specificModule.extract(fileStr), outDir, relPath, analyzer)
        }
        ++docCounter
      } else if (specificModule.streamDocs) {
        if (fs.existsSync(join(outDir, 'meta', args.part === 'chtyvo' ? relPath : dirname(relPath)))) {
          continue
        }
        console.log(tolog)
        let inputStr = args.part === 'chtyvo' ? filePath : fs.readFileSync(filePath, 'utf8')
        let i = 0;
        for (let doc of specificModule.streamDocs(inputStr)) {
          let docId = join(relPath, zerofill(i++, 4))
          processDoc(args, doc, outDir, docId, analyzer)
        }
        docCounter += i
      } else {
        throw new Error(`No extractor for ${args.part}`)
      }
    }
  } else if (args.stage === 'udpipe') {
    doUdpipeStage(args)
  } else if (args.stage === 'vertical') {
    doVerticalStage(args)
  } else {
    throw new Error('Unknown stage')
  }
}

//------------------------------------------------------------------------------
function getMetaParaPaths(outDir: string, relpath: string) {
  return [join(outDir, 'meta', `${relpath}.json`), join(outDir, 'para', `${relpath}.json`)]
}

//------------------------------------------------------------------------------
function processDoc(args: Args, doc: CorpusDoc, outDir: string, relpath: string, analyzer?: MorphAnalyzer) {
  let [metaPath, paraPath] = getMetaParaPaths(outDir, relpath)

  if (!doc) {
    console.error('no doc ✖️')
    return
  }

  normalizeCorpusDoc(doc)

  if (!doc.paragraphs || !doc.paragraphs.length) {
    console.error('missing paragraphs ✖️')
    return
  }
  if (args.checkDate && !doc.date) {
    console.error(`no date ✖️`)
    return
  }
  if (args.checkUkr && !isConsideredUkrainan(doc.paragraphs, analyzer)) {
    console.error(`considered foreign ✖️  ${doc.paragraphs[0].substr(0, 20)} ${doc.url}`)
    return
  }


  writeFileSyncMkdirp(paraPath, JSON.stringify(doc.paragraphs, undefined, 2))

  let meta = { ...doc }
  delete meta.paragraphs
  writeFileSyncMkdirp(metaPath, JSON.stringify(meta, undefined, 2))
}

//------------------------------------------------------------------------------
async function doUdpipeStage(args: Args) {
  let outDir = getOutDir(args)
  let inputRoot = join(outDir, 'para')

  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner()

  let paraFiles = globInforming(inputRoot)
  for (let [i, paraPath] of paraFiles.entries()) {
    let basePath = trimExtension(path.relative(inputRoot, paraPath))
    let conlluPath = join(outDir, 'conllu', `${basePath}.conllu`)

    if (!fs.existsSync(conlluPath)) {
      await runner.startRunning(async () => {
        console.log(`udpiped ${i} docs (${toFloorPercent(i, paraFiles.length)}%), doing ${paraPath}`)

        let paragraphs = parseJsonFileSync(paraPath)
        let conllu = await udpipe.tag(paragraphs2UdpipeInput(paragraphs))
        writeFileSyncMkdirp(conlluPath, conllu)
      })
    }
  }
}

//------------------------------------------------------------------------------
function doVerticalStage(args: Args) {
  let outDir = getOutDir(args)
  let inputRoot = join(outDir, 'conllu')

  let conlluFiles = globInforming(inputRoot)
  for (let [i, conlluPath] of conlluFiles.entries()) {

    let relativePath = path.relative(inputRoot, conlluPath)
    relativePath = trimExtension(relativePath)
    let outPath = join(outDir, 'vertial', `${relativePath}.vrt`)
    if (fs.existsSync(outPath)) {
      continue
    }
    console.log(`verted ${i} docs (${toFloorPercent(i, conlluFiles.length)}%), doing ${conlluPath}`)

    let metaPath = join(outDir, 'meta', `${relativePath}.json`)
    let meta = parseJsonFileSync(metaPath)
    let conlluStr = fs.readFileSync(conlluPath, 'utf8')
    let vrtLines = conlluStrAndMeta2vertical(conlluStr, meta)
    writeFileSyncMkdirp(outPath, mu(vrtLines).join('\n', true))
  }
}

//------------------------------------------------------------------------------
// function do4vecStage(args: Args) {
//   let outDir = getOutDir(args)
//   let inputRoot = join(outDir, 'conllu')
//   let conlluFiles = globInforming(inputRoot)

//   for (let [i, conlluPath] of conlluFiles.entries()) {
//     let basePath = trimExtension(path.relative(inputRoot, conlluPath))
//     let forvecFormsPath = join(outDir, 'forms4vec', `${basePath}.4vec`)
//     let forvecLemmasPath = join(outDir, 'lemmas4vec', `${basePath}.4vec`)

//     if (!fs.existsSync(forvecFormsPath) || !fs.existsSync(forvecLemmasPath)) {
//       console.log(`4vecced ${i} docs (${toFloorPercent(i, conlluFiles.length)}%), doing ${conlluPath}`)

//       let conllu = fs.readFileSync(conlluPath, 'utf8')
//       let { forms, lemmas } = conllu2forvec(conllu)
//       writeFileSyncMkdirp(forvecFormsPath, forms)
//       writeFileSyncMkdirp(forvecLemmasPath, lemmas)
//     }
//   }
// }

//------------------------------------------------------------------------------
function normalizeCorpusDoc(doc: CorpusDoc) {
  doc.paragraphs = doc.paragraphs.map(x => normalizeWebParaSafe(x)).filter(x => x)
  doc.title = doc.title && normalizeWebParaSafe(doc.title)
  doc.author = doc.author && normalizeWebParaSafe(doc.author)
  doc.authors = doc.authors && doc.authors.map(x => normalizeWebParaSafe(x))
  doc.date = doc.date && doc.date.trim()
}

//------------------------------------------------------------------------------
function paragraphs2UdpipeInput(paragraphs: string[]) {
  return paragraphs.map(x => x.replace(/\u0301/g, '')).join('\n\n')
}

//------------------------------------------------------------------------------
function isConsideredUkrainan(paragraphs: string[], analyzer: MorphAnalyzer) {
  const THRESHOLD = 0.2

  let tokensChecked = 0
  let numX = 0
  for (let i = paragraphs.length - 1; i >= 0; --i) {
    let tokens = nlpUtils.tokenizeUk(paragraphs[i], analyzer)
    numX += tokens.filter(({ token }) => !analyzer.tag(token).filter(x => !x.isX()).length)
      .length
    tokensChecked += tokens.length
    if (tokensChecked >= 30) {
      return numX / tokensChecked < THRESHOLD
    }
  }

  if (tokensChecked) {
    if (tokensChecked < 6) {
      if (paragraphs.some(p => /їєґі/.test(p))) {
        return true
      }
      if (paragraphs.some(p => /ыэёъ/.test(p))) {
        return false
      }
    }
    return numX / tokensChecked < THRESHOLD
  }
}

//------------------------------------------------------------------------------
function mainOld(args: Args) {
  // console.log(args.part)
  // process.exit(0)
  let analyzer = createMorphAnalyzerSync().setExpandAdjectivesAsNouns(false).setKeepN2adj(true)
  // let verticalFile = createVerticalFile(args.workspace, args.part)
  let func = partName2function[args.part]
  func(args.workspace, analyzer, args)
}

//------------------------------------------------------------------------------
async function buildUkParallelSide(workspacePath: string, analyzer: MorphAnalyzer) {
  console.log(`Now bulding Ukrainian side of parallel corpora`)

  let srcFiles = globSync(join(workspacePath, 'data', 'parallel/**/*'))
  // let plFiles = globSync(join(workspacePath, 'data', 'parallel/pl_tagged_renamed/*'))

  // .filter(x => x.endsWith('.uk.xml'))
  let enFiles = srcFiles.filter(
    x => x.endsWith('.uk.xml') && srcFiles.find(xx => xx === x.slice(0, -7) + '.en.xml'))
  let plFiles = srcFiles.filter(
    x => x.endsWith('.uk.xml') && srcFiles.find(xx => xx.includes('.pl.') && xx.startsWith(x.slice(0, -7))))
  // console.error(plFiles)
  // return
  // srcFiles = selectFilesForLang(srcFiles, 'uk')
  srcFiles = uniq([...enFiles, ...plFiles])
  let buildDir = join(workspacePath, 'build', 'parallel')
  mkdirpSync(buildDir)
  let verticalFilePath = join(buildDir, 'vrt.txt')
  let verticalFile = rotateAndOpen(verticalFilePath)

  for (let path of srcFiles) {
    console.log(`processing ${path}`)
    let root = parseXmlFileSync(path)
    root.evaluateNodes('//text()')
      .forEach(x => x.text(autofixDirtyText(x.text(), analyzer)))
    root.evaluateNodes('//s')
      .filter(x => !x.text().trim())
      .forEach(x => x.remove() && console.log('rm'))
    tokenizeMixml(root, analyzer)
    morphInterpret(root, analyzer)
    writeSync(verticalFile, `<doc reference_title="${basename(path).slice(0, -'.uk.xml'.length)}">\n`)
    mu(mixml2tokenStream(root))
      .map(x => token2sketchVertical(x))
      .chunk(3000)
      .forEach(x => writeSync(verticalFile, x.join('\n') + '\n'))
    writeSync(verticalFile, `</doc>\n`)
  }
}

//------------------------------------------------------------------------------
function selectFilesForLang(files: string[], lang: string) {
  return files.filter(x => x.endsWith('.alignment.xml') && x.includes(`.${lang}.`))
    .sort()
    .map(x => x.slice(0, -'xx.alignment.xml'.length) + 'xml')
}

//------------------------------------------------------------------------------
function buildPolish(workspacePath: string) {
  console.log(`Now bulding Polish`)
  let srcFiles = globSync(join(workspacePath, 'data', 'parallel/pl_tagged_renamed/**/*.xml'))
    .filter(x => x.endsWith('.pl.xml'))
    .sort()
  // srcFiles = selectFilesForLang(srcFiles, 'pl')
  let buildDir = join(workspacePath, 'build', 'pl')
  let verticalFilePath = join(buildDir, 'vrt.txt')
  let verticalFile = rotateAndOpen(verticalFilePath)
  let lines = new Array<string>()
  for (let path of srcFiles) {
    console.log(`processing ${basename(path)}`)
    let doc = parseXmlFileSync(path)
    lines.push(`<doc reference_title="${basename(path).slice(0, -'.xml'.length).trim()}">`)
    mu(polishXml2verticalStream(doc)).forEach(x => lines.push(x))
    lines.push(`</doc>`)
    let toWrite = lines.join('\n') + '\n'
    toWrite = toWrite.replace(/<s[^>]*>[\s]*<\/s>/g, '')
    writeSync(verticalFile, toWrite)
    lines = []
  }
  closeSync(verticalFile)
}

//------------------------------------------------------------------------------
async function buildEnglish(workspacePath: string) {
  /*
  java -mx900m -cp 'stanford-postagger.jar:lib/*' \
  edu.stanford.nlp.tagger.maxent.MaxentTaggerServer \
  -port 8088 -model models/english-left3words-distsim.tagger \
  -outputFormat xml -sentenceDelimiter newline -outputFormatOptions lemmatize
  */
  console.log(`Now bulding English`)

  let srcFiles = globSync(join(workspacePath, 'data', 'parallel/**/*'))
  srcFiles = selectFilesForLang(srcFiles, 'en')
  // .filter(x => x.endsWith('.en.xml'))
  let buildDir = join(workspacePath, 'build', 'en')
  let verticalFilePath = join(buildDir, 'vrt.txt')
  let verticalFile = rotateAndOpen(verticalFilePath)
  let tagger = new StanfordTaggerClient(8088)
  for (let path of srcFiles) {
    console.log(`processing ${basename(path)}`)
    let lines = new Array<string>()
    lines.push(`<doc reference_title="${basename(path).slice(0, -'.en.xml'.length)}">`)
    for (let p of parseXmlFileSync(path).evaluateElements('//p')) {
      lines.push(`<p id="${p.attribute('id')}">`)
      for (let s of p.evaluateElements('./s')) {
        let text = s.text().trim()
        if (!text) {
          continue
        }
        lines.push(`<s id="${s.attribute('id')}">`)
        let tagged = await tagger.tag(text)
        // console.log(tagged)
        lines.push(...tagged.map(x => x.join('\t')))
        lines.push(`</s>`)
      }
      lines.push(`</p>`)
    }
    lines.push(`</doc>`)
    writeSync(verticalFile, lines.join('\n') + '\n')
  }
  closeSync(verticalFile)

  // console.log(`Now bulding id2i for English`)
  // let wstream = createWriteStream(join(buildDir, 'id2i.txt'))
  // await id2i(createReadStream(verticalFilePath), wstream)
  // wstream.close()
}

//------------------------------------------------------------------------------
function kontrakty(workspacePath: string, analyzer: MorphAnalyzer) {
  let verticalFile = rotateAndOpen(join(workspacePath, 'build', 'kontrakty.vrt.txt'))
  let files = globSync(join(workspacePath, 'data/kontrakty') + '/*.txt')
  for (let file of files) {
    console.log(`processsing ${basename(file)}…`)
    let year = Number.parseInt(basename(file).replace(/\.txt$/, ''))
    let contents = fs.readFileSync(file, 'utf8')
    contents = nlpUtils.autofixDirtyText(contents)

    let stream = nlpUtils.string2tokenStream(contents, analyzer)
      .map(x => nlpUtils.token2sketchVertical(x))
      .chunk(10000)

    let meta = {
      // publisher: 'Галицькі контракти',
      title: `Контракти ${year}`,
      reference_title: `Контракти ${year}`,
      date: year,
      type: 'публіцистика',
    }
    fs.writeSync(verticalFile, `<doc ${keyvalue2attributesNormalized(meta)}>\n`)
    stream.forEach(x => fs.writeSync(verticalFile, x.join('\n') + '\n'))
    fs.writeSync(verticalFile, `</doc>\n`)
  }
}

//------------------------------------------------------------------------------
function writeDocMetaAndParagraphs(meta: any, paragraphs: string[], analyzer: MorphAnalyzer, verticalFile: number) {
  fs.writeSync(verticalFile, `<doc ${keyvalue2attributesNormalized(meta)}>\n`)
  for (let p of paragraphs) {
    fs.writeSync(verticalFile, '<p>\n')
    let stream = nlpUtils.string2tokenStream(p, analyzer)
      .map(x => nlpUtils.token2sketchVertical(x))
      .chunk(10000)
    stream.forEach(x => fs.writeSync(verticalFile, x.join('\n') + '\n'))
    fs.writeSync(verticalFile, '</p>\n')
  }
  fs.writeSync(verticalFile, `</doc>\n`)
}

//------------------------------------------------------------------------------
function umolodaFilenameComparator(a: string, b: string) {
  return Number(trimExtension(basename(a)).split('_')[2]) -
    Number(trimExtension(basename(b)).split('_')[2])
}

//------------------------------------------------------------------------------
function htmlDocCreator(html: string) {
  return new LibxmljsDocument(parseHtmlString(html))
}

//------------------------------------------------------------------------------
function rotateAndOpen(filePath: string) {
  let dir = dirname(filePath)
  let base = basename(filePath)
  mkdirpSync(dir)
  if (existsSync(filePath)) {
    for (let i = 0; ; ++i) {
      let newPath = join(dir, `${i}.${base}`)
      if (!existsSync(newPath)) {
        fs.renameSync(filePath, newPath)
        return openSync(filePath, 'w')
      }
    }
  } else {
    return openSync(filePath, 'w')  // todo: why both?
  }
}

//------------------------------------------------------------------------------
function mitei(workspacePath: string, analyzer: MorphAnalyzer, args: Args) {
  let verticalFile = rotateAndOpen(join(workspacePath, 'build', 'mitei.vrt.txt'))
  buildMiteiVertical(args.mitei, analyzer, verticalFile)
}
