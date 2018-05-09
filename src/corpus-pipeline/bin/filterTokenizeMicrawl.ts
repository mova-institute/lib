#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { parseJsonFile, linesAsyncStd, writeJoin, logErrAndExit } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { AsyncTaskRunner } from '../../lib/async_task_runner'
import { filterParagraphedDocExtra } from '../filter'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import { normalizeWebParaSafe, fixLatinGlyphMisspell } from '../../nlp/utils'
import { mapInplace } from '../../lang'

import * as minimist from 'minimist'
import * as path from 'path'



interface Args {
  basePath: string
  udpipeUrl: string
  udpipeConcurrency?: number
}


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any

  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.udpipeConcurrency)
  let analyzer = createMorphAnalyzerSync()

  await linesAsyncStd(async paraPath => {
    if (!paraPath) {
      return
    }
    try {
      var paragraphs = await parseJsonFile(paraPath) as Array<string>
      let metaPath = paraPath2metaPath(paraPath, args.basePath)
      var meta = await parseJsonFile(metaPath)
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.error(e.message)
      } else {
        throw e
      }
    }

    mapInplace(paragraphs, normalizeParagraph)

    if (!paragraphs || !paragraphs.length) {
      console.error(`Paragraphs are empty or invalid`, paragraphs)
      return
    }
    if (!meta) {
      console.error(`Meta is empty or invalid`)
      return
    }

    let { docValid, filteredParagraphs, gapFollowerIndexes } =
      filterParagraphedDocExtra(paragraphs, meta, analyzer, {
        filterPreviews: false,
      })

    if (!docValid) {
      return
    }

    await runner.startRunning(async () => {
      try {
        var conllu = await udpipe.tokenizeParagraphs(filteredParagraphs)
      } catch {
        console.error(`Udpipe error for`, filteredParagraphs)
        return
      }
      let vertStream = conlluStrAndMeta2vertical(conllu, {
        meta,
        formOnly: true,
        pGapIndexes: gapFollowerIndexes,
      })
      await writeJoin(vertStream, process.stdout, '\n', true)
    })
  })
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function paraPath2metaPath(paraPath: string, base: string) {
  return path.join(base, paraPath.substr(base.length).replace(/(^|\/)para\//, '$1meta/'))
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function normalizeParagraph(p: string) {
  let ret = normalizeWebParaSafe(p)
  ret = fixLatinGlyphMisspell(ret)

  return ret
}

///////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}
