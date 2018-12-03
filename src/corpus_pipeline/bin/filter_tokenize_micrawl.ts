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
import { mu } from '../../mu'
import { writePromiseDrain } from '../../stream.node'
import { AsyncTaskRunner } from '../../async_task_runner'
import { prepareZvidusilMeta } from '../utils'
import { CorpusDoc } from '../doc_meta'

import * as minimist from 'minimist'
import * as path from 'path'



//------------------------------------------------------------------------------
interface Args {
  basePath: string
  udpipeUrl: string
  udpipeModel: string
  udpipeConcurrency?: number
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2))

  let filter = new MicrawlFilter()
  let udpipe = new UdpipeApiClient(args.udpipeUrl, args.udpipeModel)
  let runner = new AsyncTaskRunner()

  await superLinesStd(async paraPath => {
    try {
      var doc = await parseJsonFile(paraPath) as CorpusDoc
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.error(e.message)
      } else {
        throw e
      }
    }

    prepareZvidusilMeta(doc)

    let { docValid,
      filteredParagraphs,
      gapFollowerIndexes,
    } = filter.filter(doc)

    if (!docValid || !filteredParagraphs.length) {
      return
    }

    await runner.post(async () => {
      try {
        var conllu = await udpipe.tokenizeParagraphs(filteredParagraphs)
      } catch {
        console.error(`Udpipe error for`, filteredParagraphs)
        return
      }
      let { paragraphs, authors, ...meta } = doc
      let vertStream = conlluStrAndMeta2vertical(conllu, {
        meta: meta as any,  // todo
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

  filter(doc: CorpusDoc) {
    mapInplace(doc.paragraphs, normalizeZvidusilParaNondestructive)
    mapInplace(doc.paragraphs, x => normalizeZvidusilParaAggressive(x, this.analyzer))

    if (!doc.paragraphs || !doc.paragraphs.length) {
      console.error(`Paragraphs are empty or invalid`, doc.paragraphs)
      return
    }

    return this.zvidusilFilter.filter(doc)
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
