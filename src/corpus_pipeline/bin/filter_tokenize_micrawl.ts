#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { parseJsonFile, logErrAndExit, superLinesStd } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { ZvidusilDocFilter } from '../filter'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import {
  normalizeZvidusilParaNondestructive,
  normalizeZvidusilParaAggressive,
} from '../../nlp/utils'
import { mapInplace } from '../../lang'
import { mu, Mu } from '../../mu'
import { writePromiseDrain } from '../../stream.node'
import { AsyncTaskRunner } from '../../async_task_runner'

import * as minimist from 'minimist'
import * as path from 'path'
import { prepareZvidusilMeta } from '../utils';



//------------------------------------------------------------------------------
interface Args {
  basePath: string
  udpipeUrl: string
  udpipeConcurrency?: number
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2)) as any

  let filter = new MicrawlFilter()
  let udpipe = new UdpipeApiClient()
  let runner = new AsyncTaskRunner()

  await superLinesStd(async paraPath => {
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

    prepareZvidusilMeta(meta)

    let { docValid, filteredParagraphs, gapFollowerIndexes } =
      filter.filter(paragraphs, meta)

    if (!docValid) {
      return
    }

    await runner.post(async () => {
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
      if (vertStream) {
        await writePromiseDrain(process.stdout, mu(vertStream).join('\n', true))
      }
    })
  })
}

////////////////////////////////////////////////////////////////////////////////
export class MicrawlFilter {
  private analyzer = createMorphAnalyzerSync()
  private zvidusilFilter = new ZvidusilDocFilter(this.analyzer, {
    filterPreviews: false
  })

  filter(paragraphs: Array<string>, meta) {
    mapInplace(paragraphs, normalizeZvidusilParaNondestructive)
    mapInplace(paragraphs, x => normalizeZvidusilParaAggressive(x, this.analyzer))

    if (!paragraphs || !paragraphs.length) {
      console.error(`Paragraphs are empty or invalid`, paragraphs)
      return
    }
    if (!meta) {
      console.error(`Meta is empty or invalid`)
      return
    }

    return this.zvidusilFilter.filter(paragraphs, meta)
  }
}

//------------------------------------------------------------------------------
function paraPath2metaPath(paraPath: string, base: string) {
  return path.join(base, paraPath.substr(base.length).replace(/(^|\/)para\//, '$1meta/'))
}

///////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}
