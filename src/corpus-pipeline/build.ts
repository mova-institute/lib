#!/usr/bin/env node --max-old-space-size=6000

import { CorpusDoc } from './doc_meta'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { trimExtension, zerofill, toFloorPercent } from '../string_utils'
import { mu } from '../mu'

import { sync as globSync } from 'glob'
import * as minimist from 'minimist'

import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { processDoc, getMetaParaPaths } from './utils'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
interface SpecificExtractor {
  streamDocs?(inputStr: string): Iterable<CorpusDoc>
  extract?(inputStr: string): CorpusDoc
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main(args: Args) {
  let outDir = join(args.workspace, args.part)

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
interface Args {
  workspace: string
  part: string
  inputGlob: string
  inputRoot: string
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
