#!/usr/bin/env node

import { conlluStreamAndMeta2vertical } from '../tovert'
import { parseJsonFile, logErrAndExit, stdio } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { ZvidusilDocFilter } from '../filter'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import {
  normalizeZvidusilParaNondestructive,
  normalizeZvidusilParaAggressive,
} from '../../nlp/utils'
import { mapInplace } from '../../lang'
import { mu } from '../../mu'
import { AsyncTaskRunner } from '../../async_task_runner'
import { prepareZvidusilMeta } from '../utils'
import { CorpusDoc } from '../doc_meta'

import minimist from 'minimist'
import { streamparseConllu } from '../../nlp/ud/conllu'
import { fixUdpipeTokenization } from '../fix_udpipe_tokenization'



interface Args {
  udpipeUrl: string
  udpipeModel: string
  fasttextHandle?: string
  udpipeConcurrency?: number
  mode: 'filenames' | 'json'
}

async function main() {
  const args: Args = minimist<Args>(process.argv.slice(2))

  let udpipe = new UdpipeApiClient(args.udpipeUrl, args.udpipeModel)
  let runner = new AsyncTaskRunner()
  let analyzer = createMorphAnalyzerSync()
  let filter = new ZvidusilDocFilter(analyzer, {
    filterPreviews: false
  }).setFasttextHandle(args.fasttextHandle)

  let { out, io } = stdio()
  let docStream = args.mode === 'json'
    ? io.linesMu().map(x => JSON.parse(x) as CorpusDoc)
    : io.linesMu().mapAwait(x => parseJsonFile(x) as Promise<CorpusDoc>)


  for await (let doc of docStream) {
    prepareZvidusilMeta(doc)

    mapInplace(doc.paragraphs, normalizeZvidusilParaNondestructive)
    mapInplace(doc.paragraphs, x => normalizeZvidusilParaAggressive(x, analyzer))

    if (!doc.paragraphs || !doc.paragraphs.length) {
      console.error(`Paragraphs are empty or invalid`, doc.paragraphs)
      continue
    }

    let { docValid,
      filteredParagraphs,
      gapFollowerIndexes,
    } = await filter.filter2(doc)

    if (!docValid || !filteredParagraphs.length) {
      continue
    }

    await runner.post(async () => {
      try {
        var conllu = await udpipe.tokenizeParagraphs(filteredParagraphs)
      } catch {
        console.error(`Udpipe error for`, filteredParagraphs)
        return
      }
      let { paragraphs, authors, ...meta } = doc
      let tokStream = streamparseConllu(conllu.split('\n'))
      tokStream = fixUdpipeTokenization(tokStream, analyzer)
      let vertStream = conlluStreamAndMeta2vertical(tokStream, {
        meta,  // todo
        formOnly: true,
        pGapIndexes: gapFollowerIndexes,
      })
      if (vertStream) {
        out.write(mu(vertStream).join('\n', true))
      }
    })
  }
}


if (require.main === module) {
  main().catch(logErrAndExit)
}
