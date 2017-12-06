#!/usr/bin/env node

import { linesBackpressedStd, ignorePipeErrors } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { AsyncTaskRunner } from '../../lib/async_task_runner'
import { Vert2ConlluBuilder } from '../vert2conllu_builder'
import { mu } from '../../mu'
import { tokenObj2verticalLine } from '../ud'
import { parseConlluTokenLine } from '../../nlp/ud/conllu'

import * as minimist from 'minimist'



interface Args {
  udpipeUrl: string
  concurrency?: number
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  ignorePipeErrors()
  const args: Args = minimist(process.argv.slice(2)) as any

  let builder = new Vert2ConlluBuilder()
  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.concurrency)

  let lines = new Array<string>()
  await linesBackpressedStd(async (line, write) => {
    lines.push(line)
    let inputConlluLines = builder.feedLine(line)
    if (inputConlluLines) {
      await runner.startRunning(async () => {
        let myLines = lines
        lines = []

        let conllu = await udpipe.tagParseConnlu(inputConlluLines.join('\n') + '\n')
        let conlluTokens = mu(conllu.split('\n')).filter(x => /^\d/.test(x))
        for (let l of myLines) {
          if (l.startsWith('<')) {
            write(l)
          } else {
            write(tokenObj2verticalLine(parseConlluTokenLine(conlluTokens.first())))
          }
          write('\n')
        }
      })
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
