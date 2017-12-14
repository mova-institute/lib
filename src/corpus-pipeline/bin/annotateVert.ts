#!/usr/bin/env node

import { exitOnStdoutPipeError, linesAsyncStd } from '../../utils.node'
import { AsyncTaskRunner } from '../../lib/async_task_runner'
import { Vert2ConlluBuilder } from '../vert2conllu_builder'
import { mu, Mu } from '../../mu'
import { tokenObj2verticalLine } from '../ud'
import { parseConlluTokenCells } from '../../nlp/ud/conllu'
import { AwaitingWriter } from '../../lib/node/awaiting_writer'
import { ApiClient } from '../../nlp/api_client'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import { MorphAnalyzer } from '../../nlp/morph_analyzer/morph_analyzer';
import { toConlluishString } from '../../nlp/ud/tagset';

import * as minimist from 'minimist'

import * as os from 'os'
import { Buffer } from 'buffer'



interface Args {
  udpipeUrl: string
  tdozatUrl: string
  udpipeConcurrency?: number
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any
  exitOnStdoutPipeError()

  args.udpipeConcurrency = args.udpipeConcurrency || Math.max(1, os.cpus().length - 1)

  let builder = new Vert2ConlluBuilder()
  let api = new ApiClient(args.udpipeUrl, args.tdozatUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.udpipeConcurrency)
  let analyzer = createMorphAnalyzerSync()
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
          var taggedVert = mergeConlluIntoVert(myLines, conllu, analyzer)
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
function mergeConlluIntoVert(
  vertLines: string[],
  conlluCells: Mu<string[]>,
  analyzer: MorphAnalyzer,
) {
  let ret = ''
  let conlluTokens = mu(conlluCells).map(x => parseConlluTokenCells(x)).window(2)
  for (let l of vertLines) {
    if (l.startsWith('<')) {
      ret += l
    } else {
      let [tok, nextTok] = conlluTokens.first()
      if (!tok) {
        throw new Error(`Unmergable`)
      }
      ret += tokenObj2verticalLine(tok)

      let dictInterps = analyzer.tag(tok.form, nextTok && nextTok.form)
      ret += '\t'
      ret += dictInterps
        .map(x => `${x.lemma}/${toConlluishString(x)}`)
        .join(';')
    }
    ret += '\n'
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
