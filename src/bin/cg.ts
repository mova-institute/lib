#!/usr/bin/env node

import * as fs from 'fs'
import * as glob from 'glob'
import minimist from 'minimist'
import * as mkdirp from 'mkdirp'
import * as path from 'path'
import * as rimraf from 'rimraf'

import { mixml2cg } from '../nlp/cg/utils'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { morphReinterpretGently } from '../nlp/utils'
import { parseXmlFileSync } from '../xml/utils.node'

interface Args {
  clean: boolean
  golden: string
}

function main() {
  const args = minimist<Args>(process.argv.slice(2), {
    boolean: ['clean'],
  }) as any

  const verbs = ['init']
  let verb = process.argv[2]
  if (!verbs.includes(verb)) {
    console.error(`Usage: ${path.basename(process.argv[1])} ${verbs.join('|')}`)
    process.exit(1)
  }

  if (verb === 'init') {
    let dest = path.join('.', 'data')
    let folders = ['golden', 'input', 'test']
    let analyzer = createMorphAnalyzerSync()
    if (args.clean) {
      folders.forEach((x) => rimraf.sync(path.join(dest, x)))
    }
    folders.forEach((x) => mkdirp.sync(path.join(dest, x)))
    let goldenXmls = glob.sync(path.join(args.golden, '*.xml'))
    for (let goldenXml of goldenXmls) {
      let basename = path.basename(goldenXml).slice(0, -'.xml'.length)
      let root = parseXmlFileSync(goldenXml)
      fs.writeFileSync(
        path.join(dest, 'golden', `${basename}.txt`),
        mixml2cg(root),
      )

      morphReinterpretGently(root, analyzer)
      fs.writeFileSync(
        path.join(dest, 'input', `${basename}.txt`),
        mixml2cg(root),
      )
    }
  }
}

if (require.main === module) {
  main()
}
