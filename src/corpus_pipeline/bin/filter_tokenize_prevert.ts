#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { ZvidusilDocFilter } from '../filter'
import {
  writeLines, writeTojsonColored,
  logErrAndExit, linesAsync,
  createWriteStreamMkdirpSync,
  lines,
} from '../../utils.node'
import { renprop, mapInplace } from '../../lang'
import { PrevertDocBuilder } from '../prevert_doc_builder'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { normalizeZvidusilParaNondestructive, normalizeZvidusilParaAggressive } from '../../nlp/utils'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'

import * as minimist from 'minimist'
import { prepareZvidusilMeta } from '../utils'
import { BufferedBackpressWriter } from '../../backpressing_writer'
import { StreamPauser } from '../../stream_pauser'

import { AsyncTaskRunner } from '../../async_task_runner'
// import { ObjApiClient } from '../../object_api_client'
// import { hashStringLatin1 } from '../../crypto';



//------------------------------------------------------------------------------
interface Args {
  udpipeUrl: string
  udpipeModel: string
  udpipeConcurrency?: number
  outFile?: string
  filterLog: string
  seenDocsSocket: string
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2))

  let runner = new AsyncTaskRunner().setConcurrency(args.udpipeConcurrency || 10)
  let docBuilder = new PrevertDocBuilder()
  let analyzer = createMorphAnalyzerSync()
  let filter = new ZvidusilDocFilter(analyzer)
  let udpipe = new UdpipeApiClient(args.udpipeUrl, args.udpipeModel)
  let logStream = createWriteStreamMkdirpSync(args.filterLog)
  let stdinPauser = new StreamPauser(process.stdin)
  let outStream = args.outFile ? createWriteStreamMkdirpSync(args.outFile) : process.stdout
  let outWriter = new BufferedBackpressWriter(outStream, stdinPauser)
  let filterLogWriter = new BufferedBackpressWriter(logStream, stdinPauser)
  // let seenUrls = new ObjApiClient(args.seenDocsSocket)

  for await (let line of lines(process.stdin)) {
  // await linesAsync(process.stdin, stdinPauser, async (line) => {
    let doc = docBuilder.feedLine(line)
    if (!doc) {
      return
    }
    let { meta, paragraphs } = doc
    // {
    //   let hash = hashStringLatin1(meta.url).substr(0, 6)
    //   let isDuplicateDoc = await seenUrls.call('addHas', [hash])
    //   if (!isDuplicateDoc) {
    //     writeTojsonColored(filterLogWriter, {
    //       docValid: false,
    //       message: `duplicate url: ${meta.url}`,
    //       meta,
    //     })
    //     return
    //   }
    // }

    mapInplace(paragraphs, normalizeZvidusilParaNondestructive)

    let filterResult = filter.filter(paragraphs, meta)
    let { docValid, filteredParagraphs, gapFollowerIndexes } = filterResult

    if (!docValid || !filteredParagraphs.length || !meta) {
      writeTojsonColored(filterLogWriter, filterResult)
      filterLogWriter.write('\n')
      filterLogWriter.flush()
      return
    }

    mapInplace(filteredParagraphs, x => normalizeZvidusilParaAggressive(x, analyzer))

    normalizeMeta(meta)
    prepareZvidusilMeta(meta)

    await runner.post(async () => {
      try {
        var conllu = await udpipe.tokenizeParagraphs(filteredParagraphs)
      } catch (e) {
        console.error(e)
        return
      }
      if (!conllu) {
        console.error(`conllu missing!`)
        return
      }

      let vertStream = conlluStrAndMeta2vertical(
        conllu, {
          meta: meta,
          formOnly: true,
          pGapIndexes: gapFollowerIndexes,
        })

      writeLines(vertStream, outWriter)
    })
  }
  filterLogWriter.flush()
  outWriter.flush()
}


//------------------------------------------------------------------------------
function normalizeMeta(meta) {
  renprop(meta, 'id', 'spider_id')
  meta.title = meta.title || '[без назви]'
  meta.source = 'загальний інтернет'
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}
