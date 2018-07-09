#!/usr/bin/env node

import { exitOnStdoutPipeError, lines as linesIt } from '../../utils.node'
import { AsyncTaskRunner } from '../../async_task_runner'
import { Vert2conlluBuilder } from '../vert2conllu_builder'
import { mu, Mu } from '../../mu'
import { tokenObj2verticalLineUk } from '../ud'
import { parseConlluTokenCells } from '../../nlp/ud/conllu'
import { ApiClient } from '../../nlp/api_client'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'
import { MorphAnalyzer } from '../../nlp/morph_analyzer/morph_analyzer'
import { toConlluishString } from '../../nlp/ud/tagset'
import { BufferedBackpressWriter } from '../../backpressing_writer'

import * as minimist from 'minimist'

import * as os from 'os'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client';



interface Args {
  udpipeUrl: string
  tdozatUrl: string
  udpipeConcurrency?: number
  udpipeModel?: string
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2))
  exitOnStdoutPipeError()

  args.udpipeConcurrency = args.udpipeConcurrency || Math.max(1, os.cpus().length - 1)

  let builder = new Vert2conlluBuilder()
  let udpipe = new UdpipeApiClient(args.udpipeUrl, args.udpipeModel)
  let runner = new AsyncTaskRunner().setConcurrency(args.udpipeConcurrency)
  let analyzer = createMorphAnalyzerSync()
  let writer = BufferedBackpressWriter.fromStreams(process.stdin, process.stdout)

  let lines = new Array<string>()
  for await (let line of linesIt(process.stdin)) {
    // await linesAsyncStd(async (line/* , writer */) => {
    if (!line) {
      return
    }
    lines.push(line)
    let inputAsConllu = builder.feedLine(line)
    if (inputAsConllu) {
      let myLines = lines
      lines = []
      await runner.post(async () => {
        try {
          var conllu = mu((await udpipe.tagParseConnluLines(inputAsConllu)).split('\n'))
            .filter(x => /^\d/.test(x))
            .map(x => x.split('\t'))
          var taggedVert = mergeConlluIntoVert(myLines, conllu, analyzer)
          writer.write(taggedVert)
        } catch (e) {
          // console.error(`ERROR at doc ${docCount}`)
          console.error(e)
          return
        }
      })
    }
  }
  writer.flush()
}

//------------------------------------------------------------------------------
function mergeConlluIntoVert(
  vertLines: Array<string>,
  conlluCells: Mu<Array<string>>,
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
      ret += tokenObj2verticalLineUk(tok)

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
