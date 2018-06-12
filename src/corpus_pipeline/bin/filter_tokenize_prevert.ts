#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { ZvidusilDocFilter } from '../filter'
import { writeLines, writeTojsonColored, logErrAndExit, linesAsync } from '../../utils.node'
import { renprop, mapInplace } from '../../lang'
import { PrevertDocBuilder } from '../prevert_doc_builder'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { normalizeZvidusilParaNondestructive, normalizeZvidusilParaAggressive } from '../../nlp/utils'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'

import * as minimist from 'minimist'
import { prepareZvidusilMeta } from '../utils'
import { BufferedBackpressWriter } from '../../backpressing_writer'
import { StreamPauser } from '../../stream_pauser'

import * as fs from 'fs'
import { AsyncTaskRunner } from '../../async_task_runner'



//------------------------------------------------------------------------------
interface Args {
  udpipeUrl: string
  udpipeModel: string
  udpipeConcurrency?: number
  filterLog: string
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2))

  let runner = new AsyncTaskRunner().setConcurrency(args.udpipeConcurrency || 10)
  let docBuilder = new PrevertDocBuilder()
  let analyzer = createMorphAnalyzerSync()
  let filter = new ZvidusilDocFilter(analyzer)
  let udpipe = new UdpipeApiClient(args.udpipeUrl, args.udpipeModel)
  let logStream = fs.createWriteStream(args.filterLog)
  let stdinPauser = new StreamPauser(process.stdin)
  let stdoutWriter = new BufferedBackpressWriter(process.stdout, stdinPauser)
  let filterLogWriter = new BufferedBackpressWriter(logStream, stdinPauser)

  await linesAsync(process.stdin, stdinPauser, async (line) => {
    let doc = docBuilder.feedLine(line)
    if (!doc) {
      return
    }

    let { meta, paragraphs } = doc

    mapInplace(paragraphs, normalizeZvidusilParaNondestructive)

    let filterResult = filter.filter(paragraphs, meta)
    let { docValid, filteredParagraphs, gapFollowerIndexes } = filterResult

    if (!docValid || !filteredParagraphs.length || !meta) {
      writeTojsonColored(filterLogWriter, filterResult)
      filterLogWriter.write('\n')
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

      writeLines(vertStream, stdoutWriter)
    })
  })

  filterLogWriter.flush()  // todo
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
