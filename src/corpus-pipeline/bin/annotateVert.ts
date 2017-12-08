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
  let bytesOut = 0
  let docCount = 0
  await linesAsyncStd(async line => {
    lines.push(line)
    let inputAsConllu = builder.feedLine(line)
    if (inputAsConllu) {
      let myLines = lines
      lines = []
      await runner.startRunning(async () => {
        try {
          var conllu = await udpipe.tagParseConnluLines(inputAsConllu)
          var taggedVert = mergeConlluIntoVert(myLines, conllu.split('\n'))
          var bytes = Buffer.from(taggedVert)
          await writePromiseDrain(process.stdout, bytes)
          offsetWriter.write(`${bytesOut}\t${bytes.length}\n`)
          bytesOut += bytes.length
        } catch (e) {
          console.error(`ERROR at doc ${docCount}`)
          console.error(e)
          console.error(`**** lines: ${lines.join('\n')}\n\n`)
          console.error(`**** conllu: ${conllu}\n\n`)
          console.error(`**** taggedVert: ${taggedVert}\n\n`)
          return
        }
      })
      ++docCount
    }
  })
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function mergeConlluIntoVert(vertLines: string[], conlluLines: string[]) {
  let ret = ''
  let conlluTokens = mu(conlluLines).filter(x => /^\d/.test(x))
  for (let l of vertLines) {
    if (l.startsWith('<')) {
      ret += l
    } else {
      let conlluTokenLine = conlluTokens.first()
      if (!conlluTokenLine) {
        throw new Error(`Unmergable`)
      }
      ret += tokenObj2verticalLine(parseConlluTokenLine(conlluTokenLine))
    }
    ret += '\n'
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
