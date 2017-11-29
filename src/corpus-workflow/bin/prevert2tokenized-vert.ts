#!/usr/bin/env node

import { linesCb, joinToStream } from '../../utils.node'
import { Dict } from '../../types';
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client';
import { AsyncTaskRunner } from '../../lib/async_task_runner';
import { conlluStrAndMeta2vertical } from '../tovert';
import { parseTagStr } from '../../xml/utils';



async function main() {
  process.stdin.setEncoding('utf8')

  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner<void>()

  // state
  let docMeta: Dict<string> = {}
  let paragraphs = new Array<string>()
  let paragrapMetas = new Array<Dict<string>>()

  await linesCb(process.stdin, async (nodes, ready) => {
    for (let nodeStr of nodes) {
      if (!nodeStr) {
        continue
      }

      let tag = parseTagStr(nodeStr)
      if (tag) {
        if (tag.closing) {
          if (tag.name === 'doc') {
            await runner.startRunning(async () => {
              let conllu = await udpipe.tokenize(paragraphs.join('\n\n'))
              // let vertStream = conlluStrAndMeta2vertical(conllu, meta, true)
              // joinToStream(vertStream, process.stdout, '\n', true)
            })
            docMeta = {}
            paragraphs = []
            paragrapMetas = []
          }
        } else if (tag.name === 'doc') {

        } else if (tag.name === 'p') {

        }
      }
    }
    ready()
  }, /(<[^>]+>)/)
}

if (require.main === module) {
  main().catch(e => console.error(e))
}
