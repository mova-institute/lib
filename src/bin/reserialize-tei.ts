#!/usr/bin/env node

import * as glob from 'glob'
import * as fs from 'fs'
import { parseXmlFileSync } from '../xml/utils.node'
import { MorphInterp } from '../nlp/morph_interp'
import { NS } from '../xml/utils'



function main() {
  let globStr = process.argv[2]
  let files = glob.sync(globStr)
  for (let file of files) {
    let root = parseXmlFileSync(file)
    let words = root.evaluateElements('//tei:w', NS)
    for (let w of words) {
      let interp = MorphInterp.fromVesumStr(w.attribute('ana'), w.attribute('lemma'))
      w.setAttribute('ana', interp.toVesumStr())
    }
    fs.writeFileSync(file, root.serialize())
  }
}

if (require.main === module) {
  main()
}
