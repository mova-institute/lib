#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { parseJsonFile, logErrAndExit, linesNoSpillStdPipeable } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { AsyncTaskRunner } from '../../async_task_runner'
import { filterParagraphedDocExtra } from '../filter'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import { normalizeWebParaSafe, fixLatinGlyphMisspell } from '../../nlp/utils'
import { mapInplace } from '../../lang'
import { mu, Mu } from '../../mu'
import { writePromiseDrain } from '../../stream.node'

import * as minimist from 'minimist'
import * as path from 'path'
import { numThreads } from '../../os'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
interface Args {
  basePath: string
  udpipeUrl: string
  udpipeConcurrency?: number
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args = minimist<Args>(process.argv.slice(2)) as any

  let filterTokenizer = new MicrawlFilterTokenizer(args.udpipeUrl, args.udpipeConcurrency)

  await linesNoSpillStdPipeable(async paraPath => {
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

    let vertStream = await filterTokenizer.filterTokenize(paragraphs, meta)
    if (vertStream) {
      await writePromiseDrain(process.stdout, mu(vertStream).join('\n', true))
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
export class MicrawlFilterTokenizer {
  private udpipe = new UdpipeApiClient()
  private runner = new AsyncTaskRunner<Mu<string>>()
  private analyzer = createMorphAnalyzerSync()

  constructor(
    udpipeUrl: string,
    udpipeConcurrency?: number,
  ) {
    this.udpipe.setEndpoint(udpipeUrl)
    this.runner.setConcurrency(udpipeConcurrency || numThreads())
  }

  async filterTokenize(paragraphs: Array<string>, meta) {
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
      filterParagraphedDocExtra(paragraphs, meta, this.analyzer, {
        filterPreviews: false,
      })

    if (!docValid) {
      return
    }

    let [posted, finished] = this.runner.post(async () => {
      try {
        var conllu = await this.udpipe.tokenizeParagraphs(filteredParagraphs)
      } catch {
        console.error(`Udpipe error for`, filteredParagraphs)
        return
      }
      let vertStream = conlluStrAndMeta2vertical(conllu, {
        meta,
        formOnly: true,
        pGapIndexes: gapFollowerIndexes,
      })
      return mu(vertStream)
    })
    await posted

    return finished
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function paraPath2metaPath(paraPath: string, base: string) {
  return path.join(base, paraPath.substr(base.length).replace(/(^|\/)para\//, '$1meta/'))
}

//------------------------------------------------------------------------------
function normalizeParagraph(p: string) {
  let ret = normalizeWebParaSafe(p)
  ret = fixLatinGlyphMisspell(ret)

  return ret
}

///////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}
