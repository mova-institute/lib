import { writeSync } from 'fs'

import { sync as globSync } from 'glob'

import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { parseXmlFileSync } from '../xml/utils.node'
import { applyMiTeiDocTransforms, tokenizeMixml, morphInterpret, interpretedTeiDoc2sketchVertical2 } from '../nlp/utils'
import { mu } from '../mu'
import { $d } from '../nlp/mi_tei_document'


export function buildMiteiVertical(miteiPath: string, analyzer: MorphAnalyzer, verticalFile: number) {
  let files = globSync(`${miteiPath}/**/*.xml`)
  for (let file of files) {
    console.log(`processing ${file}`)

    let root = parseXmlFileSync(file)
    applyMiTeiDocTransforms(root)
    let doc = $d(root)
    let meta = doc.getMeta()

    if (!meta || !meta.disamb) {
      tokenizeMixml(root, analyzer)
      morphInterpret(root, analyzer)
    }

    mu(interpretedTeiDoc2sketchVertical2(root, meta))
      .chunk(10000)
      .forEach(x => writeSync(verticalFile, x.join('\n') + '\n'))
  }
}
