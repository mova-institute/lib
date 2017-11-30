#!/usr/bin/env node

import { linesAsync, joinToStream, ignorePipeErrors } from '../../utils.node'
import { Dict } from '../../types';
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client';
import { AsyncTaskRunner } from '../../lib/async_task_runner';
import { conlluStrAndMeta2vertical } from '../tovert';
import { parseTagStr } from '../../xml/utils';
import { last, makeObject } from '../../lang';
import { normalizeWebParaSafe, fixLatinGlyphMisspell } from '../../nlp/utils';
import { CorpusDoc } from '../doc_meta';

import * as minimist from 'minimist'
import { mu } from '../../mu';



interface Args {
  udpipeUrl: string
  concurrency?: number
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any

  ignorePipeErrors()
  process.stdin.setEncoding('utf8')

  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner<void>().setConcurrency(args.concurrency)

  // state
  let docMeta: Array<[string, string]>
  let paragraphs = new Array<string>()
  let paragrapMetas = new Array<Dict<string>>()
  let curPar = ''

  await linesAsync(process.stdin, async nodes => {
    for (let nodeStr of nodes) {
      if (!nodeStr) {
        continue
      }
      let tag = parseTagStr(nodeStr)
      if (tag) {
        if (tag.isClosing) {
          if (tag.name === 'doc') {
            await runner.startRunning(async () => {
              let conllu = await udpipe.tokenize(paragraphs.join('\n\n'))
              let meta = makeObject(docMeta) as any as CorpusDoc  // temp!
              let vertStream = conlluStrAndMeta2vertical(conllu, meta, true)
              joinToStream(vertStream, process.stdout, '\n', true)
            })
            paragraphs = []
            paragrapMetas = []
          } else if (tag.name === 'p') {
            paragraphs.push(normalizeParagraph(curPar))
            curPar = ''
          }
        } else if (tag.name === 'doc') {
          docMeta = tag.attributes
        }
      } else {
        curPar += nodeStr
      }
    }
  }, /(<[^>]+>)/)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function normalizeParagraph(p: string) {
  let ret = normalizeWebParaSafe(p)
  ret = fixLatinGlyphMisspell(ret)

  return ret
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
