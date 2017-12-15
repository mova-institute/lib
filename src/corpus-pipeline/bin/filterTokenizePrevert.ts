#!/usr/bin/env node

import { AsyncTaskRunner } from '../../lib/async_task_runner'
import { conlluStrAndMeta2vertical } from '../tovert'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import { filterParagraphedDocExtra } from '../filter'
import { linesAsyncStd, exitOnStdoutPipeError, writeJoin, } from '../../utils.node'
import { makeObject, renprop } from '../../lang'
import { PrevertDocBuilder } from '../prevert_doc_builder'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'

import * as minimist from 'minimist'



interface Args {
  udpipeUrl: string
  udpipeConcurrency?: number
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any

  exitOnStdoutPipeError()

  let builder = new PrevertDocBuilder()
  let analyzer = createMorphAnalyzerSync()
  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.udpipeConcurrency)

  await linesAsyncStd(async nodeStr => {
    let doc = builder.feedNode(nodeStr)
    if (doc) {
      let { meta, paragraphs } = doc
      let metaObj = meta && makeObject(meta)
      let { docValid, filteredParagraphs, gapFollowerIndexes } =
        filterParagraphedDocExtra(paragraphs, meta, analyzer)
      if (!docValid) {
        return
      }
      if (!metaObj) {
        console.error(`No meta!`)
        return
      }

      renprop(metaObj, 'id', 'spider_id')

      await runner.startRunning(async () => {
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
          conllu, metaObj as any, true, gapFollowerIndexes)
        await writeJoin(vertStream, process.stdout, '\n', true)
      })
    }
  }, /(<\/?[\w\-]+(?:(?:\s+[\w\-]+="[^"]*")*)*\s*\/?\s*>)/)
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
