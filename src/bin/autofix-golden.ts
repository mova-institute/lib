#!/usr/bin/env node

import * as fs from 'fs'
import * as glob from 'glob'
import * as minimist from 'minimist'
import { parseXmlFileSync } from '../xml/utils.node'
import { AbstractElement } from 'xmlapi'
import { MorphInterp } from '../nlp/morph_interp'
import * as ukGrammar from '../nlp/uk_grammar'
import { serializeMiDocument, setTenseIfConverb, tokenizeTei, morphInterpret, tei2tokenStream } from '../nlp/utils'
// import { $t } from '../nlp/text_token'
import { removeNamespacing, autofixSomeEntitites } from '../xml/utils'
import { toSortableDatetime } from '../date'
import { mu } from '../mu'
import { createDictionarySync } from '../nlp/dictionary/factories.node'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'



// const IDS = new Set(``.trim().split(/\s/g))

const TRANSFORMS = {
  toPart(el: AbstractElement) {
    el.firstElementChild().setAttribute('ana', 'part')
  },
  toConjSubord(el: AbstractElement) {
    el.firstElementChild().setAttribute('ana', 'conj:subord')
  },
}

// temp
const KNOWN_NONDIC_LEMMAS = new Set([
  'п.',
  'неповчальний',
  'і.',
  'телеведучий',
])


//------------------------------------------------------------------------------
function main() {
  const now = toSortableDatetime(new Date())

  let args = minimist(process.argv.slice(2))
  if (args.tranformIds) {
    var ids = new Set(fs.readFileSync(args.tranformIds, 'utf8').trim().split(/\s+/g))
  }
  let [globStr, sequencePath] = args._
  let files = glob.sync(globStr)
  let tokenCount = 0

  console.log(`removing legacy namespaces & autofixing xml…`)
  for (let filePath of files) {
    let xmlstr = fs.readFileSync(filePath, 'utf8')
    xmlstr = autofixSomeEntitites(xmlstr)
    xmlstr = removeNamespacing(xmlstr)
    fs.writeFileSync(filePath, xmlstr)
  }

  let idSequence: number
  if (fs.existsSync(sequencePath)) {
    idSequence = Number.parseInt(fs.readFileSync(sequencePath, 'utf8').trim())
  }


  console.log(`applying autofixes…`)
  for (let file of files) {
    try {
      let root = parseXmlFileSync(file)

      renameStructures(root)

      // remove redundant attributes
      let tokens = [...root.evaluateElements('//w_')]
      for (let w of tokens) {
        w.removeAttribute('n')
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
        let form = interpEl.text() as string  // todo: remove as
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
          } else if (!interp.isOrdinalNumeral() && !KNOWN_NONDIC_LEMMAS.has(interp.lemma)) {
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
            token.setAttribute('id', id2str(idSequence++))
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

      // switch2globalIds(root)

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
function id2str(n: number) {
  return n.toString(36).padStart(4, '0')
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
      console.error(`no case in prep "${token.form}" #${token.id}`)
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
function switch2globalIds(root: AbstractElement) {
  let tokens = [...root.evaluateElements('//w_')]

  let n2id = new Map<string, string>(
    tokens.map(x => [x.attribute('n'), x.attribute('id')] as [string, string])
  )

  for (let token of tokens) {
    let dep = token.attribute('dep')
    if (dep) {
      dep = dep.replace(/\d+/g, x => n2id.get(x))
      token.setAttribute('dep', dep)
    }
  }
  for (let token of tokens) {
    token.removeAttribute('n')
  }
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



/*

// split tokens

tokens.forEach(el => {
  let t = $t(el)

  let interps = [...el.elementChildren()]
  if (interps.length === 1) {
    let form = t.text()
    let lemma = t.lemmaIfUnamb()
    if ((!lemma || !lemma.startsWith('будь-')) && /[^\-\d]-[^\-]/.test(form)) {
      if (!analyzer.tag(form).length) {
        el.insertBefore(el.firstElementChild().firstChild())
        el.remove()
      }
    }
  }
})
tokenizeTei(root, analyzer)
morphInterpret(root, analyzer)



// split fractions

      tokens = mu(root.evaluateElements('//w_')).toArray()
      for (let token of tokens) {
        let interpEl = token.firstElementChild()
        let form = interpEl.text()
        let match = form.match(/^(\d+)([^\d\s])+(\d+)$/)
        if (match) {
          let [, intPart, punct, fracPart] = match
          interpEl.text(intPart)
          interpEl.setAttribute('lemma', intPart)

          let punctElId = id2str(idSequence++)
          let fracElId = id2str(idSequence++)


          let fracEl = token.document().createElement('w_').setAttributes({
            id: fracElId,
            dep: `${token.attribute('id')}-compound`
          }) as AbstractElement
          let fracInterpEl = token.document().createElement('w').setAttributes({
            lemma: fracPart,
            ana: interpEl.attribute('ana'),
          })
          fracInterpEl.text(fracPart)
          fracEl.appendChild(fracInterpEl)
          token.insertAfter(fracEl)


          let punctEl = token.document().createElement('w_').setAttributes({
            id: punctElId,
            dep: `${fracElId}-punct`
          }) as AbstractElement
          let punctInterpEl = token.document().createElement('w').setAttributes({
            lemma: punct,
            ana: 'punct',
          })
          punctInterpEl.text(punct)
          punctEl.appendChild(punctInterpEl)
          token.insertAfter(punctEl)
        }
      }


*/
