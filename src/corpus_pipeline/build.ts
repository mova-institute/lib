#!/usr/bin/env node --max-old-space-size=6000

import { CorpusDoc } from './doc_meta'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { zerofill, toFloorPercent } from '../string'

import { sync as globSync } from 'glob'
import minimist from 'minimist'

import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { processDoc } from './utils'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'



interface SpecificExtractor {
  streamDocs?(inputStr: string, opts: {
    filename?: string
    analyzer: MorphAnalyzer
  }): Iterable<CorpusDoc>
  extract?(inputStr: string): CorpusDoc
}

function main(args: Args) {
  let outDir = join(args.workspace, args.part)

  let analyzer = createMorphAnalyzerSync()
    .setExpandAdjectivesAsNouns(false)
    .setKeepN2adj(true)

  let inputFiles = globInforming(args.inputRoot, args.inputGlob)
  let specificExtractor = require(`./extractors/${args.part}`) as SpecificExtractor
  let docCounter = 0

  for (let [fileI, filePath] of inputFiles.entries()) {
    let tolog = `extracted ${fileI} files (${toFloorPercent(fileI, inputFiles.length)}%), ${docCounter} docs, doing ${filePath}`

    let relPath = path.relative(args.inputRoot, filePath)
    if (specificExtractor.extract) {
      let outPath = join(outDir, `${relPath}.json`)
      if (fs.existsSync(outPath)) {
        continue
      }
      console.log(tolog)
      let fileStr = fs.readFileSync(filePath, 'utf8')
      processDoc(specificExtractor.extract(fileStr), outPath, analyzer)
      ++docCounter
    } else if (specificExtractor.streamDocs) {
      if (fs.existsSync(join(outDir, relPath))) {  // if _dir_ exists
        continue
      }
      console.log(tolog)
      let inputStr = args.part === 'chtyvo' ? filePath : fs.readFileSync(filePath, 'utf8')
      let i = 0
      for (let doc of specificExtractor.streamDocs(inputStr, { analyzer })) {
        let outPath = join(outDir, relPath, `${zerofill(i++, 4)}.json`)
        processDoc(doc, outPath, analyzer)
      }
      docCounter += i
    } else {
      throw new Error(`No extractor for ${args.part}`)
    }
  }
}

function globInforming(inputRoot: string, inputGlob = '**/*') {
  let globStr = join(inputRoot, inputGlob)
  console.log(`globbing input files: ${globStr}`)
  let ret = globSync(globStr)
  console.log(`globbed ${ret.length} files`)
  return ret
}

interface Args {
  workspace: string
  part: string
  inputGlob: string
  inputRoot: string
}

if (require.main === module) {
  const args = minimist<Args>(process.argv.slice(2), {
    alias: {
      workspace: ['ws'],
    },
    default: {
      workspace: '.',
      inputGlob: '**/*',
    },
    boolean: [
    ],
  }) as any

  main(args)
}
