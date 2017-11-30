#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { parseJsonFileSync, joinToStream, linesAsync } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'

import * as minimist from 'minimist'

import * as path from 'path'
import { AsyncTaskRunner } from '../../lib/async_task_runner';



interface Args {
  basePath: string
  udpipeUrl: string
  concurrency?: number
}


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any

  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner<void>()
  if (args.concurrency) {
    runner.setConcurrency(args.concurrency)
  }

  linesAsync(process.stdin, async paraPaths => {
    for await (let paraPath of paraPaths) {
      let paragraphs = parseJsonFileSync(paraPath) as string[]
      let meta = parseJsonFileSync(paraPath2metaPath(paraPath, args.basePath))

      if (!paragraphs || !paragraphs.length) {
        console.error(`Paragraphs are empty or invalid`, paragraphs)
        return
      }

      if (!meta) {
        console.error(`Meta is empty or invalid`)
      }

      await runner.startRunning(async () => {
        let conllu = await udpipe.tokenize(paragraphs.join('\n\n'))
        let vertStream = conlluStrAndMeta2vertical(conllu, meta, true)
        joinToStream(vertStream, process.stdout, '\n', true)
      })
    }
  })
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function paraPath2metaPath(paraPath: string, base: string) {
  return path.join(base, paraPath.substr(base.length).replace(/(^|\/)para\//, '$1meta/'))
}

///////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
