#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { forEachLine2, parseJsonFileSync, joinToStream } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'

import * as glob from 'glob'
import * as minimist from 'minimist'
import * as lineReader from 'line-reader'  // todo: learn how it works

import { writeFileSync } from 'fs'
import * as path from 'path'
import { error } from 'util';
import { sleep } from '../../lang';



interface Args {
  basePath: string
  udpipeUrl: string
}


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  const args: Args = minimist(process.argv.slice(2)) as any

  let udpipe = new UdpipeApiClient(args.udpipeUrl)

  lineReader.eachLine(process.stdin, async (paraPath, last, cb) => {
    let paragraphs = parseJsonFileSync(paraPath) as string[]
    let meta = parseJsonFileSync(paraPath2metaPath(paraPath, args.basePath))
    console.error(meta)

    let conllu = await udpipe.tokenize(paragraphs.join('\n\n'))
    let vertStream = conlluStrAndMeta2vertical(conllu, meta, true)
    joinToStream(vertStream, process.stdout, '\n', true)
    cb()
  })
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function paraPath2metaPath(paraPath: string, base: string) {
  let relative = path.relative(base, paraPath)
  relative = relative.substr(relative.indexOf('para/') + 'para/'.length)
  return path.join(base, 'meta', relative)
}

///////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
