#!/usr/bin/env node

import * as fs from 'fs'
import * as glob from 'glob'
import * as minimist from 'minimist'
import { parseXmlFileSync } from '../xml/utils.node'
import { AbstractElement } from 'xmlapi'
import { MorphInterp } from '../nlp/morph_interp'
import * as ukGrammar from '../nlp/uk_grammar'
import { Token } from '../nlp/token'
import { serializeMiDocument, setTenseIfConverb, tokenStream2sentences, tei2tokenStream } from '../nlp/utils'
// import { $t } from '../nlp/text_token'
import { removeNamespacing, autofixSomeEntitites } from '../xml/utils'
import { toSortableDatetime } from '../date'
import { mu } from '../mu'
import { createDictionarySync } from '../nlp/dictionary/factories.node'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { GraphNode } from '../lib/graph'
import { uEq, uEqSome } from '../nlp/ud/utils'
import { PREDICATES } from "../nlp/ud/uk_grammar";


// const IDS = new Set(``.trim().split(/\s/g))

const REPLACE_RE = /#>(\S+)/

const TRANSFORMS = {
  // toPart(el: AbstractElement) {
  //   el.firstElementChild().setAttribute('ana', 'part')
  // },
  // toConjSubord(el: AbstractElement) {
  //   el.firstElementChild().setAttribute('ana', 'conj:subord')
  // },
  toAccusative(t: GraphNode<Token>) {
    let toChange = t.children.filter(x => uEq(x.node.rel, 'amod') || uEq(x.node.rel, 'det'))
    toChange.push(t)
    toChange.forEach(tt => tt.node.interp.setIsAccusative())
  },
  toGenitive(t: GraphNode<Token>) {
    let toChange = t.children.filter(x => uEq(x.node.rel, 'amod') || uEq(x.node.rel, 'det'))
    toChange.push(t)
    toChange.forEach(tt => tt.node.interp.setIsGenitive())
  },
  toCc(t: GraphNode<Token>) {
  }
}

//------------------------------------------------------------------------------
// function changeNominalCaseTo

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
  // console.log(args)
  if (args.tranformIds) {
    var ids = new Set(fs.readFileSync(args.tranformIds, 'utf8')
      .trim()
      .split(/\n+/g)
      .map(x => x.trim())
      .filter(x => !x.startsWith('#'))
      .join(' ')
      .split(/\s+/g))
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
      let tokenEls = [...root.evaluateElements('//w_')]
      for (let w of tokenEls) {
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
          if (dep && /\-(aux|cop)$/.test(dep)) {
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
        tokenEls = [...root.evaluateElements(idedElements.map(x => `//${x}`).join('|'))]
        for (let token of tokenEls) {
          if (!token.attribute('id')) {
            token.setAttribute('id', id2str(idSequence++))
          }
        }
      }

      runValidations(root)

      let id2el = new Map(root.evaluateElements('//*[@id]').map(
        x => [x.attribute('id'), x] as [string, AbstractElement]))

      let documentTokens = mu(tei2tokenStream(root)).toArray()
      let sentenceStream = tokenStream2sentences(documentTokens)
      for (let { sentenceId, set, nodes, newParagraph, newDocument } of sentenceStream) {
        let roots = nodes.filter(x => x.isRoot())
        let sentenceHasOneRoot = roots.length === 1

        // console.log(ids.size)
        if (ids) {
          // console.log(id2el)
          nodes.forEach(t => {
            if (ids.has(t.node.id)) {
              // console.log(t.node.form)
              TRANSFORMS[args.transform](t)
            }
          })
        }

        for (let { node } of nodes) {
          if (node.comment) {
            let match = node.comment.match(REPLACE_RE)
            if (match) {
              node.interp = MorphInterp.fromVesumStr(match[1], node.interp.lemma)
            }
            node.comment = node.comment.replace(REPLACE_RE, '').trim()
          }

          if (node.rel && node.interp.isPunctuation()) {
            node.rel = 'punct'
          }

          if (node.interp.isName()) {
            node.interp.setIsAnimate().setIsProper()
          }
        }

        for (let node of nodes) {
          let token = node.node

          if (PREDICATES.isAuxWithNoCopAux(node)
            || sentenceHasOneRoot && node.isRoot() && node.node.interp.isAuxillary()) {
            node.node.interp.setIsAuxillary(false)
          }

          if (token.rel === 'mark' && token.interp.isAdverb() && token.interp.isRelative()) {
            token.rel = 'advmod'
          }

          if (token.rel
            && token.interp.isParticle()
            && token.interp.isNegative()
            && !token.isPromoted
            && !node.children.some(x => uEq(x.node.rel, 'fixed'))
          ) {
            token.rel = 'advmod'
          }

          if (token.form.toLowerCase() === 'то' && token.interp.isSubordinative()) {
            if (token.rel) {
              token.rel = 'discourse'
            }
            token.interp = MorphInterp.fromVesumStr('part:conseq', token.interp.lemma)
            saveToken(token, id2el.get(token.id))
          }

          if (['це', 'то'].includes(token.form.toLowerCase())
            && token.interp.isParticle()
            && token.rel === 'expl') {
            token.interp = MorphInterp.fromVesumStr('noun:inanim:n:v_naz:&amp;pron:dem', token.interp.lemma)
          }

          if (token.rel === 'punct' && token.interp.isCoordinating()) {
            token.rel = 'cc'
          }

          // {
          //   let interpsFromDict = analyzer.tag(token.form)
          //   let toCompare = token.interp.clone()
          //   toCompare.features.formality = undefined
          //   toCompare.features.paradigmOmonym = undefined
          //   if (!interpsFromDict.some(x => x.featurewiseEquals(toCompare))) {
          //     console.log(`form-interp not in dict: ${token.form} ${token.interp.toVesumStr()}`)
          //   }
          // }

          if (token.interp.isInterjection()) {
            let newInterp = analyzer.tag(token.form).find(x => x.isInstant())
            if (newInterp) {
              // token.interp = newInterp
            }
          }

          if (!node.isRoot()
            && token.interp.isPreposition()
            && node.children.some(x => !uEqSome(x.node.rel, ['fixed']))
            && !uEq(token.rel, 'conj')
          ) {
            token.rel = 'case'
          }

          if (uEq(token.rel, 'obl')
            && token.interp.isDative()
            && !node.children.some(x => uEq(x.node.rel, 'case'))
          ) {
            token.rel = 'iobj'
          }
        }

        nodes.forEach(x => {
          // console.log(x)
          let element = id2el.get(x.node.id)
          if (element) {
            // console.log(x.node.form)
            saveToken(x.node, element)
          }
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
function saveToken(token: Token, element: AbstractElement) {
  Object.entries(token.getAttributes())
    .forEach(([k, v]) => element.setAttribute(k, v || undefined))

  let interp0 = element.firstElementChild()
  interp0.setAttribute('ana', token.interp.toVesumStr())
  interp0.setAttribute('lemma', token.interp.lemma)
  let dep = token.deps.map(x => `${x.headId}-${x.relation}`).join('|')
  if (dep) {
    element.setAttribute('dep', dep)
  }
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



/*

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

//------------------------------------------------------------------------------
function sideQuotes(root: AbstractElement) {
  mu(root.evaluateElements('//w_'))
    .filter(x => x.firstElementChild().attribute('lemma') === '"')
    .forEach(interpEl => {
      let isOpeninig = interpEl.nextElementSibling()
        && interpEl.nextElementSibling().localName() === 'g'
        && !(interpEl.nextElementSibling().firstElementChild()
          && interpEl.nextElementSibling().firstElementChild().attribute('ana').startsWith('punct'))
      let isClosing = interpEl.previousElementSibling()
        && interpEl.previousElementSibling().localName() === 'g'
        && !(interpEl.previousElementSibling().firstElementChild()
          && interpEl.previousElementSibling().firstElementChild().attribute('ana').startsWith('punct'))
      if (isOpeninig === isClosing) {
        console.error(`fooooo id ${interpEl.attribute('id')}`)
      } else if (isOpeninig) {
        interpEl.firstElementChild().setAttribute('ana', 'punct:quote:open')
      } else if (isClosing) {
        interpEl.firstElementChild().setAttribute('ana', 'punct:quote:close')
      }
    })
}

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
