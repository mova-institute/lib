#!/usr/bin/env node

import { linesAsync, ignorePipeErrors, joinAndWrite } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client';
import { AsyncTaskRunner } from '../../lib/async_task_runner';
import { conlluStrAndMeta2vertical } from '../tovert';
import { makeObject } from '../../lang';
import { CorpusDoc } from '../doc_meta';

import * as minimist from 'minimist'
import { PrevertDocBuilder } from '../prevert_doc_builder';



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
  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner<void>().setConcurrency(args.concurrency)

  await linesAsync(process.stdin, async nodes => {
    for await (let nodeStr of nodes) {
      let doc = builder.feedNode(nodeStr)
      if (doc) {
        let { meta, paragraphs } = doc

        await runner.startRunning(async () => {
          let metaObj = makeObject(meta) as any as CorpusDoc  // temp!
          let conllu = await udpipe.tokenize(paragraphs.join('\n\n'))
          let vertStream = conlluStrAndMeta2vertical(conllu, metaObj, true)
          await joinAndWrite(vertStream, process.stdout, '\n', true)
        })
      }
    }
  }, /(<[^>]+>)/)
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
