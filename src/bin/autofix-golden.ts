#!/usr/bin/env node

import * as glob from 'glob'
import * as fs from 'fs'
import { parseXmlFileSync } from '../xml/utils.node'
import { AbstractElement } from 'xmlapi'
import { MorphInterp } from '../nlp/morph_interp'
import { numerateTokensGently, serializeMiDocument, setTenseIfConverb } from '../nlp/utils'
import { removeNamespacing } from '../xml/utils'
import { mu } from '../mu'
import { createDictionarySync } from '../nlp/dictionary/factories.node'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'



function main() {
  let [globStr, sequencePath] = process.argv.slice(2)
  let files = glob.sync(globStr)
  let tokenCount = 0

  console.log(`removing legacy namespaces…`)
  for (let filePath of files) {
    fs.writeFileSync(filePath, removeNamespacing(fs.readFileSync(filePath, 'utf8')))
  }

  if (fs.existsSync(sequencePath)) {
    var idSequence = Number.parseInt(fs.readFileSync(sequencePath, 'utf8').trim())
  } else {
    idSequence = 0
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

      // root.evaluateElements('//*').forEach(x => x.removeAttribute('n'))
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
      let tokens = [...root.evaluateElements('//w_|//pc')]
      for (let w of tokens) {
        w.removeAttribute('nn')
        w.removeAttribute('disamb')
        w.removeAttribute('author')
      }

      // do safe transforms
      let dict = createDictionarySync()
      let analyzer = new MorphAnalyzer(dict).setExpandAdjectivesAsNouns(true)
      let interpEls = root.evaluateElements('//w_/w')
      for (let interpEl of interpEls) {
        // continue
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

        // adj as noun lemmas
        if (interp.isAdjectiveAsNoun() && !interpEl.attribute('lemma2')) {
          interpEl.setAttribute('lemma2', interp.lemma)
          let lexeme = dict.lookupLexemesByLemma(interp.lemma)
            .find(([{ flags }]) => MorphInterp.fromVesumStr(flags).isAdjective())
          if (lexeme) {
            let nounLemma =
              lexeme.find(({ flags }) => {
                let cursor = MorphInterp.fromVesumStr(flags)
                let ret = !cursor.isUncontracted()
                  && ((cursor.isPlural() && cursor.features.number === interp.features.number)
                    || cursor.features.gender === interp.features.gender)
                return ret
              })
            if (nounLemma) {
              interp.lemma = nounLemma.form
            } else {
              console.log(`Nothingo ${interp.lemma}`)
              // console.log(`Nothingo ${interp.lemma}`)
            }
          } else {
            console.log(`CAUTION: no paradigm in dict: ${interp.lemma}`)
          }
        }

        if (interp.isVerb() && interp.lemma === 'бути') {
          let dep = interpEl.parent().attribute('dep')
          if (dep && /^\d+\-(aux|cop)$/.test(dep)) {
            interp.setIsAuxillary()
          }
        }

        // advps without tense
        setTenseIfConverb(interp, form)

        // if (isNoninfl(interp)) {
        //   let oldLemma = interp.lemma
        //   interp.lemma = interpEl.parent().attribute('corrected') || form.toLowerCase()
        //   if (oldLemma.endsWith('.')) {
        //     interp.lemma += '.'
        //   }
        // }

        saveInterp(interpEl, interp)
      }

      // give each token an id
      tokens = [...root.evaluateElements('//w_|//pc')]
      tokenCount += tokens.length
      for (let token of tokens) {
        if (!token.attribute('id')) {
          // token.setAttribute('id', (idSequence++).toString(36).padStart(4, '0'))
        }
      }

      fs.writeFileSync(file, serializeMiDocument(root))
    } catch (e) {
      console.error(`Error in file "${file}"`)
      throw e
    }
  }

  if (fs.existsSync(sequencePath)) {
    fs.writeFileSync(sequencePath, idSequence)
  }
  console.log(`${tokenCount} tokens`)
}

//------------------------------------------------------------------------------
function saveInterp(el: AbstractElement, interp: MorphInterp) {
  el.setAttribute('ana', interp.toVesumStr())
  el.setAttribute('lemma', interp.lemma)
}

if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
function isNoninfl(interp: MorphInterp) {
  return interp.isConjunction() || interp.isParticle() || interp.isAdverb()
    || interp.isPreposition() || interp.isInterjection() || interp.isPunctuation()
}
