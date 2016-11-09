#!/usr/bin/env node

import * as path from 'path'
import * as glob from 'glob'
import { parseXmlFileSync } from '../xml/utils.node'
import { tei2tokenStream } from '../nlp/utils'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'



function main() {
  let analyzer = createMorphAnalyzerSync().setExpandAdjectivesAsNouns(true)
  let globStr = process.argv[2]
  let files = glob.sync(globStr)
  for (let file of files) {
    let basename = path.basename(file)
    let root = parseXmlFileSync(file)
    for (let token of tei2tokenStream(root)) {
      if (token.form) {
        let newInterps = analyzer.tagOrX(token.form)
        let attributes = token.getAttributes()
        let n = attributes && attributes.n
        for (let interp of token.interps) {
          if (!newInterps.find(x => x.equals(interp))) {
            let message = basename
            if (n) {
              message += `::${n}`
            }
            message += ` "${token.form}" ${interp.toVesumStr()}`
            console.log(message)
          }
        }
      }
    }
  }
}

if (require.main === module) {
  main()
}
