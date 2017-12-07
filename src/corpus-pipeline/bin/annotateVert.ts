#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError, linesAsyncStd } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { AsyncTaskRunner } from '../../lib/async_task_runner'
import { Vert2ConlluBuilder } from '../vert2conllu_builder'
import { mu } from '../../mu'
import { tokenObj2verticalLine } from '../ud'
import { parseConlluTokenLine } from '../../nlp/ud/conllu'
import { BackpressingWriter } from '../../lib/node/backpressing_writer'
import { writePromiseDrain } from '../../stream_utils.node';

import * as minimist from 'minimist'

import * as fs from 'fs'
import { Buffer } from 'buffer';



interface Args {
  udpipeUrl: string
  offsetFile: string
  concurrency?: number
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  exitOnStdoutPipeError()
  const args: Args = minimist(process.argv.slice(2)) as any

  let builder = new Vert2ConlluBuilder()
  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.concurrency)
  let offsetWriter = new BackpressingWriter(fs.createWriteStream(args.offsetFile), process.stdin)

  let lines = new Array<string>()
  let offset = 0
  await linesAsyncStd(async line => {
    lines.push(line)
    let inputAsConllu = builder.feedLine(line)
    if (inputAsConllu) {
      let myLines = lines
      lines = []
      await runner.startRunning(async () => {
        let conllu = await udpipe.tagParseConnluLines(inputAsConllu)
        let conlluTokens = mu(conllu.split('\n')).filter(x => /^\d/.test(x))
        let docByteLen = 0
        for (let l of myLines) {
          let toWrite: string
          if (l.startsWith('<')) {
            toWrite = l
          } else {
            let conlluTokenLine = conlluTokens.first()
            if (!conlluTokenLine) {
              console.error(`ERROR: conlluTokens.first() === "${conlluTokenLine}", lines:`)
              console.error(inputAsConllu)
              return
            }
            toWrite = tokenObj2verticalLine(parseConlluTokenLine(conlluTokenLine))
          }
          toWrite += '\n'
          let bytes = Buffer.from(toWrite)
          await writePromiseDrain(process.stdout, bytes)
          docByteLen += bytes.length
        }
        offsetWriter.write(`${offset}\t${docByteLen}\n`)
        offset += docByteLen
      })
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
