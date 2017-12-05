#!/usr/bin/env node

import { linesBulkAsync, ignorePipeErrors, joinAndWrite, } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { AsyncTaskRunner } from '../../lib/async_task_runner'
import { conlluStrAndMeta2vertical } from '../tovert'
import { makeObject, renprop } from '../../lang'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'

import * as minimist from 'minimist'
import { PrevertDocBuilder } from '../prevert_doc_builder'
import { filterPlainParagraphsExtra } from '../filter'



interface Args {
  udpipeUrl: string
  concurrency?: number
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any

  ignorePipeErrors()
  process.stdin.setEncoding('utf8')

  let builder = new PrevertDocBuilder()
  let analyzer = createMorphAnalyzerSync()
  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.concurrency)

  await linesBulkAsync(process.stdin, async nodes => {
    for await (let nodeStr of nodes) {
      let doc = builder.feedNode(nodeStr)
      if (doc) {
        let { meta, paragraphs } = doc
        let metaObj = meta && makeObject(meta)
        let { docValid, filteredParagraphs, gapFollowerIndexes } =
          filterPlainParagraphsExtra(paragraphs, analyzer)
        if (!docValid) {
          continue
        }

        renprop(metaObj, 'id', 'spider-id')

        await runner.startRunning(async () => {
          let conllu = await udpipe.tokenize(filteredParagraphs.join('\n\n'))
          let vertStream = conlluStrAndMeta2vertical(
            conllu, metaObj as any, true, gapFollowerIndexes)
          await joinAndWrite(vertStream, process.stdout, '\n', true)
        })
      }
    }
  }, /(<\/?\w+(?:(?:\s+\w+="[^"]*")*)*\s*\/?\s*>)/)
}



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function filterPosttok(tokens: string[][]) {
  for (let p of tokens) {
    for (let t of p) {
      // будь-що не url довше за 24 не в словнику
      // mixed case не в словнику
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
