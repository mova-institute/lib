#!/usr/bin/env node

import { linesAsync, ignorePipeErrors, joinAndWrite } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client';
import { AsyncTaskRunner } from '../../lib/async_task_runner';
import { conlluStrAndMeta2vertical } from '../tovert';
import { makeObject } from '../../lang';
import { CorpusDoc } from '../doc_meta';
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'

import * as minimist from 'minimist'
import { PrevertDocBuilder } from '../prevert_doc_builder';
import { compact } from 'lodash';
import { MorphAnalyzer } from '../../nlp/morph_analyzer/morph_analyzer';
import { LETTER_UK_UPPERCASE, LETTER_UK_LOWERCASE } from '../../nlp/static';



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
  // let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner().setConcurrency(args.concurrency)

  await linesAsync(process.stdin, async nodes => {
    for await (let nodeStr of nodes) {
      let doc = builder.feedNode(nodeStr)
      if (doc) {
        let { meta, paragraphs } = doc
        let metaObj = makeObject(meta)
        if (filterPretok(paragraphs, analyzer)) {
          console.error(`FILTERED: doc:${metaObj.id}`)
          continue
        }

        for (let i = 0; i < paragraphs.length; ++i) {
          if (paragraphs[i] === undefined) {
            console.error(`FILTERED: doc:${metaObj.id} p:${i}`)
          }
        }

        paragraphs = compact(paragraphs)
        if (!paragraphs.length) {
          console.error(`SKIPPING: doc:${metaObj.id} — no paragraphs`)
          continue
        }

        // await runner.startRunning(async () => {
        //   let conllu = await udpipe.tokenize(paragraphs.join('\n\n'))
        //   let vertStream = conlluStrAndMeta2vertical(conllu, metaObj as any, true)
        //   await joinAndWrite(vertStream, process.stdout, '\n', true)
        // })
      }
    }
  }, /(<[^>]+>)/)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
const ukSpecLettersRe = /[ґїєі]/
const ruSpecLettersRe = /[эёъы]/
const previewAbruptRe = /…|\.{3,} $ /
const caseCollision = new RegExp(`[${LETTER_UK_UPPERCASE}A-Z]{2}[${LETTER_UK_LOWERCASE}a-z]{2}`)

function filterPretok(pp: string[], analyzer: MorphAnalyzer) {
  let i = 0
  while (i < pp.length) {
    let p = pp[i]

    if (i + 3 < pp.length) {
      let arePreviews = [p, pp[i + 1], pp[i + 2]]
        .every(x => previewAbruptRe.test(x))
      pp[i] = pp[i + 1] = pp[i + 2] = undefined
      i += 2
      while (i < pp.length && previewAbruptRe.test(pp[i])) {
        pp[i++] = undefined
      }
      continue
    }

    if (ruSpecLettersRe.test(p) && !ukSpecLettersRe.test(p)) {
      pp[i] = undefined
      continue
    }

    if (caseCollision.test(p)) {
      pp[i] = undefined
      continue
    }

    if (/([^\.?!)] ){4}/.test(p)) {
      pp[i] = undefined
      continue
    }
  }

  for (let i = 0; i < pp.length; ++i) {
    pp[i] = pp[i].trim()
  }

  ++i
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
