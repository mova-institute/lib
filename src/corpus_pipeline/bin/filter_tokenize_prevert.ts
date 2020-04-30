#!/usr/bin/env node

import { conlluStreamAndMeta2vertical } from '../tovert'
import { ZvidusilDocFilter } from '../filter'
import {
  writeLines,
  writeTojsonColored,
  logErrAndExit,
  createWriteStreamMkdirpSync,
  mbUsed,
} from '../../utils.node'
import { Io } from '../../io'
import { renprop, mapInplace } from '../../lang'
import { itPrevertDocs } from '../prevert_doc_builder'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { normalizeZvidusilParaNondestructive, normalizeZvidusilParaAggressive } from '../../nlp/utils'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import { prepareZvidusilMeta } from '../utils'
import { AsyncTaskRunner } from '../../async_task_runner'
import { streamparseConllu } from '../../nlp/ud/conllu'
import { fixUdpipeTokenization } from '../fix_udpipe_tokenization'
import { CorpusDoc } from '../doc_meta'
import { toSortableDatetime } from '../../date'
import { RedisClientPromisified } from '../../redis'

import * as minimist from 'minimist'


//------------------------------------------------------------------------------
interface Args {
  udpipeUrl: string
  udpipeModel: string
  udpipeConcurrency?: number
  outFile?: string
  filterLog: string
  // seenDocsSocket: string
  filterDuplicates: boolean
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2), {
    boolean: ['filterDuplicates'],
  })

  let runner = new AsyncTaskRunner().setConcurrency(args.udpipeConcurrency || 10)
  let analyzer = createMorphAnalyzerSync()
  let filter = new ZvidusilDocFilter(analyzer)
  let udpipe = new UdpipeApiClient(args.udpipeUrl, args.udpipeModel)
  let redisClient = RedisClientPromisified.create({ path: 'redis.sock' })
  let numUnique = 0
  let numDuplicates = 0

  let io = Io.std()
  let outStream = args.outFile ? createWriteStreamMkdirpSync(args.outFile) : process.stdout
  let outWriter = io.getWriter(outStream)
  let filterLogWriter = io.getFileWriter(args.filterLog)

  for await (let doc of itPrevertDocs(io.lines())) {
    let { meta, paragraphs } = doc

    if (args.filterDuplicates) {
      if (!await redisClient.sadd('seen-urls', meta.url)) {
        writeTojsonColored(filterLogWriter, {
          docValid: false,
          message: `duplicate url: ${meta.url}`,
          meta,
        })
        ++numDuplicates
        continue
      } else {
        ++numUnique
        if (numUnique >= 512 && Number.isInteger(Math.log2(numUnique))) {
          console.error(`[${toSortableDatetime(new Date())}] — ${mbUsed()} MB —`
            + ` unique ${numUnique} urls, ${numDuplicates} dupes`)
        }
      }
    }

    mapInplace(paragraphs, normalizeZvidusilParaNondestructive)

    let filterResult = filter.filter({ paragraphs, ...meta } as CorpusDoc)
    let { docValid, filteredParagraphs, gapFollowerIndexes } = filterResult

    if (!docValid || !filteredParagraphs.length || !meta) {
      writeTojsonColored(filterLogWriter, filterResult)
      filterLogWriter.write('\n')
      continue
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

      let tokStream = streamparseConllu(conllu.split('\n'))
      tokStream = fixUdpipeTokenization(tokStream, analyzer)
      let vertStream = conlluStreamAndMeta2vertical(tokStream, {
        meta: meta,
        formOnly: true,
        pGapIndexes: gapFollowerIndexes,
      })

      writeLines(vertStream, outWriter)
    })
  }
  await redisClient.quit()
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
