#!/usr/bin/env node

import * as fs from 'fs'
import * as glob from 'glob'
import * as minimist from 'minimist'
import { parseXmlFileSync } from '../xml/utils.node'
import { AbstractElement } from 'xmlapi'
import { MorphInterp } from '../nlp/morph_interp'
import * as f from '../nlp/morph_features'
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
import { toUd } from '../nlp/ud/tagset'
import { PREDICATES } from '../nlp/ud/uk_grammar';
import * as g from '../nlp/uk_grammar'
import * as grammar from '../nlp/ud/uk_grammar';


const REPLACE_RE = /#>(\S+)/


// temp
const KNOWN_NONDIC_LEMMAS = new Set([
  'п.',
  'неповчальний',
  'і.',
  'телеведучий',
])

//------------------------------------------------------------------------------
function prepareIds(path: string) {
  return new Set(fs.readFileSync(path, 'utf8')
    .trim()
    .split(/\n+/g)
    .map(x => x.trim())
    .filter(x => !x.startsWith('#'))
    .join(' ')
    .split(/\s+/g))
}

//------------------------------------------------------------------------------
function main() {
  let args = minimist(process.argv.slice(2))
  let [globStr, sequencePath] = args._
  let files = glob.sync(globStr)
  let tokenCount = 0

  if (args.tranformIds) {
    var ids = prepareIds(path)
  }

  let idSequence: number
  if (fs.existsSync(sequencePath)) {
    idSequence = Number.parseInt(fs.readFileSync(sequencePath, 'utf8').trim())
  }

  // prepare xml
  if (args.afterAnnotator) {
    console.log(`removing legacy namespaces & autofixing xml…`)
    autofixXml(files)
  }


  console.log(`applying autofixes…`)

  const dict = createDictionarySync()
  const analyzer = new MorphAnalyzer(dict).setExpandAdjectivesAsNouns(true)

  for (let file of files) {
    try {
      let root = parseXmlFileSync(file)

      // renameStructures(root)

      // remove redundant attributes
      if (args.afterAnnotator) {
        let tokenEls = [...root.evaluateElements('//w_')]
        for (let w of tokenEls) {
          // w.removeAttribute('n')
          w.removeAttribute('nn')
          w.removeAttribute('disamb')
          w.removeAttribute('author')
        }
      }


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
        let interp: MorphInterp
        try {
          interp = MorphInterp.fromVesumStr(
            interpEl.attribute('ana'), interpEl.attribute('lemma'), undefined, true)
        } catch (e) {
          console.error(e.message)
          continue
        }
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
        let tokenEls = [...root.evaluateElements(idedElements.map(x => `//${x}`).join('|'))]
        for (let token of tokenEls) {
          if (!token.attribute('id')) {
            token.setAttribute('id', id2str(idSequence++))
          }
        }
      }


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
              let tag = match[1].replace('&amp;', '&')  // sometimes it's copyped from xml
              node.interp = MorphInterp.fromVesumStr(tag, node.interp.lemma)
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
          let parent = node.parent && node.parent.node
          let interp = token.interp
          const udInterp = toUd(interp.clone())

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
            token.interp = MorphInterp.fromVesumStr('noun:inanim:n:v_naz:&pron:dem', token.interp.lemma)
          }

          if (token.rel === 'punct' && token.interp.isCoordinating()) {
            token.rel = 'cc'
          }

          if (token.interp.isInterjection()) {
            let newInterp = analyzer.tag(token.form).find(x => x.isInstant())
            if (newInterp) {
              // token.interp = newInterp
            }
          }

          if (!node.isRoot()
            && interp.isPreposition()
            && node.children.some(x => !uEqSome(x.node.rel, ['fixed']))
            && !uEq(token.rel, 'conj')
          ) {
            token.rel = 'case'
          }

          if (uEq(token.rel, 'obl')
            && interp.isDative()
            && !node.children.some(x => uEq(x.node.rel, 'case'))
          ) {
            token.rel = 'iobj'
          }

          if (uEqSome(token.rel, ['det'])
            && udInterp.pos === 'DET'
            && interp.isCardinalNumeral()
          ) {
            if (token.interp.features.case === node.parent.node.interp.features.case) {
              token.rel = 'det:nummod'
            } else if ((interp.isNominative() || interp.isAccusative())
              && node.parent.node.interp.isGenitive()
            ) {
              token.rel = 'det:numgov'
            }
          }

          if (grammar.isGoverning(token.rel)
            && token.interp.features.case === node.parent.node.interp.features.case
          ) {
            if (node.parent.children.some(x => x.node.interp.isPreposition()
              && x.node.interp.features.requiredCase as number === token.interp.features.case)
            ) {
              token.rel = udInterp.pos === 'DET'
                ? 'det:nummod'
                : 'nummod'
            }
          }

          if (uEq(token.rel, 'discourse')
            && interp.lemma === 'це'
            && interp.isParticle()
            && node.parent.children.some(x => uEqSome(x.node.rel, ['nsubj', 'csubj']))
            && !parent.interp.isVerb()
            // && false
          ) {
            token.interp = MorphInterp.fromVesumStr('noun:inanim:n:v_naz:&pron:dem', interp.lemma)
            token.rel = 'expl'
          }

          if (interp.hasPronominalType()
            && !interp.isParticle() // todo: separate :pers
          ) {
            interp.setIsPronoun()
          }

          if (!grammar.isGoverning(token.rel)
            && (uEq(token.rel, 'det')
              // || uEq(token.rel, 'amod')
            )
            // && !interp.isBeforeadj()
            // && !parent.interp.isForeign()
            // && !parent.isGraft
            // && !node.parent.children.some(x => uEq(x.node.rel, 'conj'))
            // && (interp.isNounish() || interp.isAdjective())
            && udInterp.pos === 'DET' && ['його', 'її', 'їх'].includes(interp.lemma)
            // && false
          ) {
            interp.features.case = parent.interp.features.case
            if (parent.interp.isPlural()) {
              interp.features.number = parent.interp.features.number
              interp.features.gender = undefined
            } else {
              interp.features.number = undefined
              if (parent.interp.features.gender) {
                interp.features.gender = parent.interp.features.gender
              }
            }
          }

          if (udInterp.pos === 'DET' && uEq(token.rel, 'amod')) {
            token.rel = 'det'
          }

          if (udInterp.pos !== 'DET' && uEq(token.rel, 'det') && interp.isAdjective()) {
            token.rel = 'amod'
          }

          if (!interp.isAccusative() && (
            interp.features.grammaticalAnimacy !== undefined
            || interp.features.requiredAnimacy !== undefined)
          ) {
            interp.features.grammaticalAnimacy = undefined
            interp.features.requiredAnimacy = undefined
          }

          if (interp.isAbbreviation() && interp.lemma.endsWith('.')) {
            if (g.isInflecable(interp.features.pos)) {
              interp.setIsUninflectable()
            } else {
              interp.setIsUninflectable(false)
            }
          }

          if (interp.isCardinalNumeral() && /\d$/.test(token.form)) {
            interp.setIsUninflectable()
          }

          // if (interp.isUninflectable()) {
          //   let form = token.form
          //   if (interp.isAbbreviation() && interp.lemma.endsWith('.') && !form.endsWith('.')) {
          //     form = `${form}.`
          //   }
          //   if (form.toLowerCase() !== interp.lemma.toLowerCase()) {
          //     console.error(`form differs from lemma for :nv >> "${token.form}" #${token.id}`)
          //   }
          // }

          testMorpho(node, analyzer)
        }


        // save to xml doc
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
function saveInterp(el: AbstractElement, interp: MorphInterp) {
  el.setAttribute('ana', interp.toVesumStr())
  el.setAttribute('lemma', interp.lemma)
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
function testMorpho(node: GraphNode<Token>, analyzer: MorphAnalyzer) {
  let token = node.node
  let interp = node.node.interp
  token.form = token.correctedForm()

  if (interp.isForeign()) {
    return
  }

  // missing case
  if (g.inflectsCase(interp.features.pos)
    && !interp.isBeforeadj()
    && !interp.isStem()
    && !interp.isForeign()
    && !interp.hasCase()
  ) {
    console.error(`no case in "${token.form}" #${token.id}`)
    interp.features.case = f.Case.nominative
  }

  // missing required case
  if (interp.isPreposition() && !interp.hasRequiredCase()) {
    console.error(`no case in prep "${token.form}" #${token.id}`)
  }

  // missing gender for adj
  if (interp.isAdjective() && !interp.isStem() && !interp.isForeign()) {
    if (!interp.hasGender() && !interp.hasNumber()) {
      console.error(`no gender/plural for ${token2string(node.node)}`)
    }
  }

  // missing gender for noun
  if (interp.isNounish()) {
    // missing gender for noun
    if (!interp.hasGender()
      && !grammar.GENDERLESS_PRONOUNS.includes(interp.lemma) && !(
        interp.isNoSingular() || interp.isSingular() && interp.features.person === 1
      )
    ) {
      // console.error(`no gender for ${token2string(node.node)}`)
    }
  }

  // missing animacy
  if (interp.isNounish() && !interp.hasAnimacy()
    && !grammar.EMPTY_ANIMACY_NOUNS.includes(interp.lemma)
    && !(interp.features.pronominalType === f.PronominalType.personal
      && interp.features.person === 3
    )
  ) {
    console.error(`no animacy for ${token2string(node.node)}`)
  }

  // missing in dict
  {
    let interpsFromDict = analyzer.tag(token.form)
    interpsFromDict.forEach(x => x.features.auto = x.features.oddness = undefined)

    let toCompare = token.interp.clone()
    // .removeNondictionaryFeatures()
    toCompare.features.formality = undefined
    toCompare.features.paradigmOmonym = undefined
    toCompare.features.auto = undefined
    toCompare.features.oddness = undefined

    // if (interp.isAdjectiveAsNoun()) {  // todo
    //   toCompare.lemma =
    // }

    if (!interpsFromDict.some(x => interp.isAdjectiveAsNoun()
      ? x.featurewiseEquals(toCompare)
      : x.equals(toCompare))
      // temp
      // && (interp.isParticle()
      //   // ||interp.isVerb()
      //   // || interp.isPreposition()
      //   //   || interp.isParticle()
      //   //   || interp.isAdverb()
      //   //   || interp.isAdjective()
      //   //   || interp.isNoun()
      //   //   || interp.isConverb()
      //   //   || interp.isCardinalNumeral()
      // )
      && interp.isCardinalNumeral()
      && !interp.isStem()
      && !interp.isTypo()  // temp
      && !interp.isName()  // temp
      && !interp.isAbbreviation()  // temp
    ) {
      let interpsFromDictStr = interpsFromDict.map(x => `${x.toVesumStr()}@${x.lemma}`)
      let message = `>>> interp not in dict: ${
        token2stringRaw(token.id, token.form, toCompare.lemma, toCompare.toVesumStr())}`
      if (interpsFromDictStr.length) {
        message += ` dict:\n${interpsFromDictStr.slice(0, 10).join('\n' )}\n=========`
      }
      console.log(message)
    }
  }
}

//------------------------------------------------------------------------------
function autofixXml(files: string[]) {
  for (let filePath of files) {
    let xmlstr = fs.readFileSync(filePath, 'utf8')
    xmlstr = autofixSomeEntitites(xmlstr)
    xmlstr = removeNamespacing(xmlstr)
    fs.writeFileSync(filePath, xmlstr)
  }
}

//------------------------------------------------------------------------------
// function isIncompleteNoun(interp: MorphInterp) {
//   return
//   interp.features.gender === undefined && !(
//     interp.isNoSingular()
//   )
//     || interp.features.animacy === undefined && !(
//       interp.features.pronominalType === f.PronominalType.personal
//       && interp.features.person === 3
//     )
// }

//------------------------------------------------------------------------------
function token2stringRaw(id: string, form: string, lemma: string, tag: string) {
  return `#${id} ${form} @ ${lemma} @@ ${tag}`
}

//------------------------------------------------------------------------------
function token2string(token: Token) {
  return token2stringRaw(token.id, token.form, token.interp.lemma, token.interp.toVesumStr())
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

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
