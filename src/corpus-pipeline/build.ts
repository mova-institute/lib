#!/usr/bin/env node --max-old-space-size=6000

import { CorpusDoc } from './doc_meta'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { writeFileSyncMkdirp, parseJsonFileSync } from '../utils.node'
import { trimExtension, zerofill, toFloorPercent } from '../string_utils'
import { mu } from '../mu'
import { AsyncTaskRunner } from '../lib/async_task_runner'
import { UdpipeApiClient } from '../nlp/ud/udpipe_api_client'
import { conlluStrAndMeta2vertical } from './tovert'

import { sync as globSync } from 'glob'
import * as minimist from 'minimist'

import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { processDoc, getMetaParaPaths } from './utils';



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
interface SpecificExtractor {
  streamDocs?(inputStr: string): Iterable<CorpusDoc>
  extract?(inputStr: string): CorpusDoc
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
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

    let specificExtractor = require(`./extractors/${args.part}`) as SpecificExtractor
    let docCounter = 0

    for (let [fileI, filePath] of inputFiles.entries()) {
      let tolog = `extracted ${fileI} files (${toFloorPercent(fileI, inputFiles.length)}%), ${docCounter} docs, doing ${filePath}`

      let relPath = path.relative(args.inputRoot, filePath)
      if (specificExtractor.extract) {
        if (getMetaParaPaths(outDir, relPath).some(x => !fs.existsSync(x))) {
          console.log(tolog)
          let fileStr = fs.readFileSync(filePath, 'utf8')
          processDoc(specificExtractor.extract(fileStr), outDir, relPath, analyzer)
        }
        ++docCounter
      } else if (specificExtractor.streamDocs) {
        if (fs.existsSync(join(outDir, 'meta', relPath))) {
          continue
        }
        console.log(tolog)
        let inputStr = args.part === 'chtyvo' ? filePath : fs.readFileSync(filePath, 'utf8')
        let i = 0
        for (let doc of specificExtractor.streamDocs(inputStr)) {
          let docId = join(relPath, zerofill(i++, 4))
          processDoc(doc, outDir, docId, analyzer)
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

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function getOutDir(args: Args) {
  return join(args.workspace, args.out || args.part)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function globInforming(inputRoot: string, inputGlob = '**/*') {
  let globStr = join(inputRoot, inputGlob)
  console.log(`globbing input files: ${globStr}`)
  let ret = globSync(globStr, { nodir: true })
  console.log(`globbed ${ret.length} files`)
  return ret
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
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
        let conllu = await udpipe.tokTagPlaintext(paragraphs2UdpipeInput(paragraphs))
        writeFileSyncMkdirp(conlluPath, conllu)
      })
    }
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
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
    let vrtLines = conlluStrAndMeta2vertical(conlluStr, { meta })
    writeFileSyncMkdirp(outPath, mu(vrtLines).join('\n', true))
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function paragraphs2UdpipeInput(paragraphs: Array<string>) {
  return paragraphs.map(x => x.replace(/\u0301/g, '')).join('\n\n')
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
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

////////////////////////////////////////////////////////////////////////////////
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
      'checkUkr',
    ],
  }) as any

  main(args)
}
