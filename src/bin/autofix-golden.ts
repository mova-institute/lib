#!/usr/bin/env node

import * as fs from 'fs'
import * as glob from 'glob'
import * as minimist from 'minimist'
import { parseXmlFileSync } from '../xml/utils.node'
import { AbstractElement } from 'xmlapi'
import { MorphInterp } from '../nlp/morph_interp'
import * as ukGrammar from '../nlp/uk_grammar'
import { numerateTokensGently, serializeMiDocument, setTenseIfConverb, tokenizeTei, morphInterpret, tei2tokenStream } from '../nlp/utils'
// import { $t } from '../nlp/text_token'
import { removeNamespacing } from '../xml/utils'
import { toSortableDatetime } from '../date'
import { mu } from '../mu'
import { createDictionarySync } from '../nlp/dictionary/factories.node'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'



// const IDS = new Set(``.trim().split(/\s/g))

const TRANSFORMS = {
  toPart(el: AbstractElement) {
    el.firstElementChild().setAttribute('ana', 'part')
  }
}

function main() {
  const now = toSortableDatetime(new Date())

  let args = minimist(process.argv.slice(2))
  if (args.tranformIds) {
    var ids = new Set(fs.readFileSync(args.tranformIds, 'utf8').trim().split(/\s+/g))
  }
  let [globStr, sequencePath] = args._
  let files = glob.sync(globStr)
  let tokenCount = 0

  console.log(`removing legacy namespaces…`)
  for (let filePath of files) {
    fs.writeFileSync(filePath, removeNamespacing(fs.readFileSync(filePath, 'utf8')))
  }

  let idSequence: number
  if (fs.existsSync(sequencePath)) {
    idSequence = Number.parseInt(fs.readFileSync(sequencePath, 'utf8').trim())
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

      renameStructures(root)

      // set missing sentence ids
      root.evaluateElements('//sb')
        .flatten()
        .filter(el => el.attribute('sid') === undefined || !/^\d+$/.test(el.attribute('sid')))
        .forEach(el => el.setAttribute('sid', ++maxSid))

      // remove redundant attributes
      let tokens = [...root.evaluateElements('//w_')]
      for (let w of tokens) {
        w.removeAttribute('nn')
        w.removeAttribute('disamb')
        w.removeAttribute('author')
      }

      // tokens.filter(x => IDS.has(x.attribute('id')))
      //   .forEach(t => t.firstElementChild().setAttribute('ana', 'part'))


      let dict = createDictionarySync()
      let analyzer = new MorphAnalyzer(dict).setExpandAdjectivesAsNouns(true)


      // do safe transforms
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
        if (interp.isAdjectiveAsNoun()) {
          let adjLemma = interpEl.attribute('lemma2') || interp.lemma
          interpEl.setAttribute('lemma2', adjLemma)
          let lexeme = dict.lookupLexemesByLemma(adjLemma)
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
          } else if (!interp.isOrdinalNumeral()) {
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
      tokenCount += [...root.evaluateElements('//w_')].length

      // give each token an id
      if (idSequence !== undefined) {
        const idedElements = ['doc', 'p', 'sb', 's', 'w_', 'pc']
        tokens = [...root.evaluateElements(idedElements.map(x => `//${x}`).join('|'))]
        for (let token of tokens) {
          if (!token.attribute('id')) {
            token.setAttribute('id', (idSequence++).toString(36).padStart(4, '0'))
          }
        }
      }

      runValidations(root)

      if (ids) {
        mu(root.evaluateElements('//w_'))
          .filter(x => ids.has(x.attribute('id')))
          .toArray()
          .forEach(el => {
            TRANSFORMS[args.transform](el)
            el.setAttribute('mtime-morpho', now)
          })
      }

      let content = serializeMiDocument(root)
      // content = beautify(content, { indent_size: 2 })
      fs.writeFileSync(file, content)
    } catch (e) {
      console.error(`Error in file "${file}"`)
      throw e
    }
  }

  if (sequencePath) {
    fs.writeFileSync(sequencePath, idSequence)
  }
  console.log(`${tokenCount} tokens`)
}

//------------------------------------------------------------------------------
function runValidations(root: AbstractElement) {
  for (let token of tei2tokenStream(root)) {
    if (!token.isWord()) {
      continue
    }

    let interp = token.interp
    let features = interp.features
    if (interp.isPreposition() && !interp.hasRequiredCase()) {
      console.error(`no case in prep "${token.form}" #${token.globalId}`)
    } else if (ukGrammar.inflectsCase(features.pos) && !interp.isBeforeadj()
      && !interp.isStem() && !interp.isForeign() && !interp.hasCase()) {
      // console.error(`no case in "${token.form}" #${token.globalId}`)
    }
  }
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

//------------------------------------------------------------------------------
function renameStructures(root: AbstractElement) {
  // rename sentence boundaries
  mu(root.evaluateElements('//se'))
    .forEach(x => {
      x.insertAfter(root.document().createElement('sb'))
      x.remove()
    })

  // let elems = [...root.evaluateElements('chunk').filter(x => !x.ancestors().find(xx => xx.localName() === 'chunk'))]
  // elems.forEach(x => x)

  const DOC_META_ATTRS = [
    'src',
    'title',
    'author',
    'date',
  ]
  root.evaluateElements('//doc').forEach(doc =>
    DOC_META_ATTRS.forEach(attr =>
      !doc.attribute(attr) && doc.setAttribute(attr, '')))

}

//------------------------------------------------------------------------------
function convertPcToW(root: AbstractElement) {
  mu(root.evaluateElements('//pc'))
    .forEach(pc => {
      let word = root.document().createElement('w_').setAttributes(pc.attributesObj())
      let interp = root.document().createElement('w').setAttributes({
        lemma: pc.text(),
        ana: 'punct'
      })
      interp.text(pc.text())
      word.appendChild(interp)
      pc.insertAfter(word)
      pc.remove()
    })
}

      // tokens.forEach(el => {
      //   let t = $t(el)

      //   let interps = [...el.elementChildren()]
      //   if (interps.length === 1) {
      //     let form = t.text()
      //     let lemma = t.lemmaIfUnamb()
      //     if ((!lemma || !lemma.startsWith('будь-')) && /[^\-\d]-[^\-]/.test(form)) {
      //       if (!analyzer.tag(form).length) {
      //         el.insertBefore(el.firstElementChild().firstChild())
      //         el.remove()
      //       }
      //     }
      //   }
      // })
      // tokenizeTei(root, analyzer)
      // morphInterpret(root, analyzer)

