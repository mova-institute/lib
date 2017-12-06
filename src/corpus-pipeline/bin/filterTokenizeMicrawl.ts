#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { parseJsonFile, linesAsyncStd, writeJoin } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { AsyncTaskRunner } from '../../lib/async_task_runner'
import { filterPlainParagraphsExtra } from '../filter'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import { normalizeWebParaSafe, fixLatinGlyphMisspell } from '../../nlp/utils'
import { mapInplace } from '../../lang'

import * as minimist from 'minimist'
import * as path from 'path'



interface Args {
  basePath: string
  udpipeUrl: string
  concurrency?: number
}


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any

  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.concurrency)
  let analyzer = createMorphAnalyzerSync()

  await linesAsyncStd(async paraPath => {
    if (!paraPath) {
      return
    }
    try {
      var paragraphs = await parseJsonFile(paraPath) as string[]
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
    }

    let { docValid, filteredParagraphs, gapFollowerIndexes } =
      filterPlainParagraphsExtra(paragraphs, analyzer, {
        filterPreviews: false,
      })

    if (!docValid) {
      return
    }

    await runner.startRunning(async () => {
      let toUdpipe = filteredParagraphs.join('\n\n')
      try {
        var conllu = await udpipe.tokenize(toUdpipe)
      } catch {
        console.error(`Udpipe error for ${toUdpipe}`)
        return
      }
      let vertStream = conlluStrAndMeta2vertical(conllu, meta, true, gapFollowerIndexes)
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
  main().catch(e => console.error(e))
}
