import { join } from 'path'
import { openSync, writeSync } from 'fs'
import { sync as globSync } from 'glob'
import { execSync } from 'child_process'

import * as groupBy from 'lodash/groupBy'
import * as entries from 'lodash/toPairs'

import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { token2sketchVertical, interpretedTeiDoc2sketchVertical, tokenizeTei, morphInterpret, tei2tokenStream } from '../nlp/utils'
import { parseXmlFileSync } from '../xml/utils.node'
import { mu } from '../mu'


const prefix = 'aligned'

if (require.main === module) {
  buildAlligned('.', createMorphAnalyzerSync())
}

////////////////////////////////////////////////////////////////////////////////
export function buildAlligned(workspacePath: string, analyzer: MorphAnalyzer) {
  let workspace = join(workspacePath, prefix)
  let srcFiles = globSync(join(workspace, 'source/**/*'))
  let textFiles = srcFiles.filter(x => !x.endsWith('.alignment.xml'))
  let languages = groupBy(textFiles, path => path.match(/\.([a-z]{2})\.xml$/)[1])
  for (let [lang, files] of entries(languages).filter(x => x[0] !== 'uk')) {
    console.log(`creating vertical for ${lang}`)
    let verticalFilePath = join(workspace, `${lang}.vertical.txt`)
    let verticalFile = openSync(verticalFilePath, 'w')
    for (let file of files) {  // todo: lang-specif taggers
      let root = parseXmlFileSync(file)
      tokenizeTei(root, analyzer)
      mu(tei2tokenStream(root))
        .map(x => token2sketchVertical(x))
        .chunk(3000)
        .forEach(x => writeSync(verticalFile, x.join('\n') + '\n'))
    }
    execSync(`mi-id2i < "${verticalFilePath}" > ${join(workspace, `${lang}.id2i.txt`)}`)
  }
}
