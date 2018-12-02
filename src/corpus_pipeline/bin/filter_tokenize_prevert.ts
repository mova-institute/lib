#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { ZvidusilDocFilter } from '../filter'
import {
  writeLines,
  writeTojsonColored,
  logErrAndExit,
  createWriteStreamMkdirpSync,
} from '../../utils.node'
import { Io } from '../../io'
import { renprop, mapInplace } from '../../lang'
import { itPrevertDocs } from '../prevert_doc_builder'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { normalizeZvidusilParaNondestructive, normalizeZvidusilParaAggressive } from '../../nlp/utils'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import { prepareZvidusilMeta } from '../utils'
import { AsyncTaskRunner } from '../../async_task_runner'

import * as minimist from 'minimist'
import { CoolSet } from '../../data_structures/cool_set'
import { hashStringLatin1 } from '../../crypto'



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
  let seenUrls = new CoolSet<string>()
  let numDuplicates = 0

  let io = new Io(process.stdin)
  let outStream = args.outFile ? createWriteStreamMkdirpSync(args.outFile) : process.stdout
  let outWriter = io.getWriter(outStream)
  let filterLogStream = createWriteStreamMkdirpSync(args.filterLog)
  let filterLogWriter = io.getWriter(filterLogStream)

  for await (let doc of itPrevertDocs(io.lines())) {
    let { meta, paragraphs } = doc

    if (args.filterDuplicates) {
      let key = meta.url.substr('http'.length)
      let hash = hashStringLatin1(key).substr(0, 6)
      if (!seenUrls.addNew(hash)) {
        writeTojsonColored(filterLogWriter, {
          docValid: false,
          message: `duplicate url: ${meta.url}`,
          meta,
        })
        ++numDuplicates
        continue
      } else {
        if (seenUrls.size >= 512 && Number.isInteger(Math.log2(seenUrls.size))) {
          console.error(`seen ${seenUrls.size} urls, ${numDuplicates} dupes`)
        }
      }
    }

    mapInplace(paragraphs, normalizeZvidusilParaNondestructive)

    let filterResult = filter.filter(paragraphs, meta)
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

      let vertStream = conlluStrAndMeta2vertical(
        conllu, {
          meta: meta,
          formOnly: true,
          pGapIndexes: gapFollowerIndexes,
        })

      writeLines(vertStream, outWriter)
    })
  }
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
