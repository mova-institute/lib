#!/usr/bin/env node

import * as glob from 'glob'
import * as fs from 'fs'
import { parseXmlFileSync } from '../xml/utils.node'
import { AbstractElement } from 'xmlapi'
import { MorphInterp } from '../nlp/morph_interp'
import { numerateTokensGently, serializeMiDocument } from '../nlp/utils'
import { removeNamespacing } from '../xml/utils'
import { mu } from '../mu'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'



function main() {
  let globStr = process.argv[2]
  let files = glob.sync(globStr)
  let wc = 0

  console.log(`removing legacy namespaces…`)
  for (let filePath of files) {
    fs.writeFileSync(filePath, removeNamespacing(fs.readFileSync(filePath, 'utf8')))
  }

  console.log(`calculating max sentence id…`)
  let maxSid = 0
  mu(files)
    .map(x => parseXmlFileSync(x).evaluateAttributes('//@sid').map(attr => attr.value()))
    .flatten()
    .filter(x => /^\d+$/.test(x))
    .forEach(x => maxSid = Math.max(maxSid, Number.parseInt(x)))


  console.log(`applying autofixes…`)
  for (let file of files) {
    try {
      let root = parseXmlFileSync(file)

      // set missing token numbers
      numerateTokensGently(root)

      // rename sentence boundaries
      mu(root.evaluateElements('//se'))
        .forEach(x => {
          x.insertAfter(root.document().createElement('sb'))
          x.remove()
        })

      // set missing sentence ids
      root.evaluateElements('//sb')
        .flatten()
        .filter(el => el.attribute('sid') === undefined || !/^\d+$/.test(el.attribute('sid')))
        .forEach(el => el.setAttribute('sid', ++maxSid))

      // remove redundant attributes
      let words = [...root.evaluateElements('//w_')]
      wc += words.length
      for (let w of words) {
        w.removeAttribute('nn')
        w.removeAttribute('disamb')
        w.removeAttribute('author')
      }

      // do safe transforms
      let analyzer = createMorphAnalyzerSync().setExpandAdjectivesAsNouns(true)
      let interpEls = root.evaluateElements('//w_/w')
      for (let interpEl of interpEls) {
        let form = interpEl.text()
        let tag = interpEl.attribute('ana')
        let lemma = interpEl.attribute('lemma')
        if (!tag || !lemma) {
          throw new Error(`No tag/lemma for ${form}`)
        }
        let interp = MorphInterp.fromVesumStr(interpEl.attribute('ana'), interpEl.attribute('lemma'))
        let interpsInDict = analyzer.tag(form)
        let presentInDict = interpsInDict.some(dictInterp => dictInterp.featurewiseEquals(interp))
        // console.log(presentInDict)
        if (!presentInDict) {
          // negativity
          let newInterp = interp.clone().setIsNegative()
          if (interpsInDict.some(x => x.featurewiseEquals(newInterp))) {
            interp = newInterp
          }
        }

        // advp lemmas
        if (interp.isConverb()) {
          let dictInterps = analyzer.tag(form).filter(x => x.isConverb)
          if (dictInterps.length) {
            interp.lemma = dictInterps[0].lemma
          }
        }

        saveInterp(interpEl, interp)
      }

      fs.writeFileSync(file, serializeMiDocument(root))
    } catch (e) {
      console.error(`Error in file "${file}"`)
      throw e
    }
  }
  console.log(`${wc} words`)
}

//------------------------------------------------------------------------------
function saveInterp(el: AbstractElement, interp: MorphInterp) {
  el.setAttribute('ana', interp.toVesumStr())
  el.setAttribute('lemma', interp.lemma)
}

if (require.main === module) {
  main()
}
