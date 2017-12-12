#!/usr/bin/env node

import { linesBackpressedStd, exitOnStdoutPipeError, linesAsyncStd } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { AsyncTaskRunner } from '../../lib/async_task_runner'
import { Vert2ConlluBuilder } from '../vert2conllu_builder'
import { mu, Mu } from '../../mu'
import { tokenObj2verticalLine } from '../ud'
import { parseConlluTokenLine, parseConlluTokenCells } from '../../nlp/ud/conllu'
import { BackpressingWriter } from '../../lib/node/backpressing_writer'
import { writePromiseDrain } from '../../stream_utils.node';

import * as minimist from 'minimist'

import * as fs from 'fs'
import { Buffer } from 'buffer';
import { AwaitingWriter } from '../../lib/node/awaiting_writer';
import { ApiClient } from '../../nlp/api_client';



interface Args {
  udpipeUrl: string
  tdozatUrl: string
  concurrency?: number
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any
  exitOnStdoutPipeError()

  let builder = new Vert2ConlluBuilder()
  let api = new ApiClient(args.udpipeUrl, args.tdozatUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.concurrency)
  let outputWriter = new AwaitingWriter(process.stdout)

  let lines = new Array<string>()
  let docCount = 0
  await linesAsyncStd(async line => {
    if (!line) {
      console.error(`ERROR: Unexpected empty line at doc ${docCount}`)
      return
    }
    lines.push(line)
    let inputAsConllu = builder.feedLine(line)
    if (inputAsConllu) {
      let myLines = lines
      lines = []
      await runner.startRunning(async () => {
        try {
          var conllu = await api.tagParseConnluLines(inputAsConllu)
          var taggedVert = mergeConlluIntoVert(myLines, conllu)
          var bytes = Buffer.from(taggedVert)
          await outputWriter.write(bytes)
        } catch (e) {
          console.error(`ERROR at doc ${docCount}`)
          console.error(e)
          return
        }
      })
      ++docCount
    }
  })
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function mergeConlluIntoVert(vertLines: string[], conlluCells: Mu<string[]>) {
  let ret = ''
  let conlluTokenLines = mu(conlluCells)
  for (let l of vertLines) {
    if (l.startsWith('<')) {
      ret += l
    } else {
      let conlluTokenLine = conlluTokenLines.first()
      if (!conlluTokenLine) {
        throw new Error(`Unmergable`)
      }
      ret += tokenObj2verticalLine(parseConlluTokenCells(conlluTokenLine))
    }
    ret += '\n'
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
