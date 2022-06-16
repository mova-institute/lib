#!/usr/bin/env node

import { parseXmlFileSync } from '../xml/utils.node'
import { serializeMiDocument } from '../nlp/utils'
import { writeFileSync } from 'fs'
import { AbstractElement } from '../xml/xmlapi/abstract_element'
import { NS } from '../xml/utils'

function main() {
  let [destPath, sourcePath] = process.argv.slice(2)
  let [destRoot, sourceRoot] = [destPath, sourcePath].map((x) =>
    parseXmlFileSync(x),
  )
  adoptMorphDisambs(destRoot, sourceRoot)
  writeFileSync(destPath, serializeMiDocument(destRoot, true))
}

function adoptMorphDisambs(
  destRoot: AbstractElement,
  sourceRoot: AbstractElement,
) {
  let attr = sourceRoot.evaluateElement(`//mi:w_[@n]`, NS) ? 'n' : 'nn'
  for (let miwSource of sourceRoot.evaluateElements(`//mi:w_`, NS)) {
    let n = miwSource.attribute(attr)
    let miwDest = destRoot.evaluateElement(`//w_[@${attr}="${n}"]`, NS)
    if (!miwDest) {
      console.error(`No word with @${attr}="${n}"`)
      continue
    }
    let sourceW = miwSource.firstElementChild()
    if (sourceW) {
      miwDest.clear()
      let w = miwSource
        .document()
        .createElement('w')
        .setAttributes({
          ana: sourceW.attribute('ana'),
          lemma: sourceW.attribute('lemma'),
        })
      w.text(sourceW.text())
      miwDest.appendChild(w)
    }
  }
}

if (require.main === module) {
  main()
}
