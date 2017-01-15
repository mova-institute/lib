#!/usr/bin/env node

import * as glob from 'glob'
import * as fs from 'fs'
import { parseXmlFileSync } from '../xml/utils.node'
import { MorphInterp } from '../nlp/morph_interp'
import { numerateTokensGently } from '../nlp/utils'
import { NS } from '../xml/utils'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'



function main() {
  let analyzer = createMorphAnalyzerSync().setExpandAdjectivesAsNouns(true)
  let globStr = process.argv[2]
  let files = glob.sync(globStr)
  let wc = 0
  for (let file of files) {
    try {
      let root = parseXmlFileSync(file)
      let words = [...root.evaluateElements('//tei:w', NS)]
      wc += words.length
      for (let w of words) {
        let flags = w.attribute('ana')
        if (flags) {
          let interp = MorphInterp.fromVesumStr(w.attribute('ana'), w.attribute('lemma'))
          w.setAttribute('ana', interp.toVesumStr())
        }
        w.removeAttribute('disamb')
        w.removeAttribute('author')
        w.removeAttribute('nn')
      }
      numerateTokensGently(root)
      fs.writeFileSync(file, root.serialize())
    } catch (e) {
      console.error(`Error in file "${file}"`)
      throw e
    }
  }
  console.log(`${wc} words`)
}

if (require.main === module) {
  main()
}
