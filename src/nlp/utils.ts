import { NS, nameNs, traverseDepth, traverseDepthEl, sortChildElements,
  traverseDepthGen, traverseDepthGen2 } from '../xml/utils'
import * as xmlutils from '../xml/utils'
import { W, W_, PC, SE, P } from './common_elements'
import * as elementNames from './common_elements'
import { r, createObject } from '../lang'
import { uniqueSmall as unique, uniqueJson } from '../algo'
import { AbstractNode, AbstractElement, AbstractDocument } from 'xmlapi'
import { MorphAnalyzer } from './morph_analyzer/morph_analyzer'
import { $t } from './text_token'
import { IStringMorphInterp } from './interfaces'
import { MorphInterp, compareTags } from './morph_interp'
import { WORDCHAR_UK_RE, WORDCHAR, LETTER_UK } from './static'
import { $d } from './mi_tei_document'
import { mu, Mu } from '../mu'

const wu: Wu.WuStatic = require('wu')


export type DocCreator = (xmlstr: string) => AbstractDocument


export const ELEMS_BREAKING_SENTENCE_NS = new Set([
  nameNs(NS.tei, 'p'),
  nameNs(NS.tei, 'body'),
  nameNs(NS.tei, 'text'),
])

const PUNC_REGS = [
  r`\.{4,}`,
  r`!\.{2,}`,
  r`\?\.{2,}`,
  r`[!?]+`,
  r`,`,
  r`„`,
  r`“`,
  r`”`,
  r`«`,
  r`»`,
  r`\(`,
  r`\)`,
  r`\[`,
  r`\]`,
  r`\.`,
  r`…`,
  r`:`,
  r`;`,
  r`—`,
  r`/`,
]
const ANY_PUNC = PUNC_REGS.join('|')
const ANY_PUNC_OR_DASH_RE = new RegExp(`^${ANY_PUNC}|-$`)

let PUNC_SPACING = {
  ',': [false, true],
  '.': [false, true],
  ':': [false, true],
  ';': [false, true],
  '-': [false, false],   // dash
  '–': [false, false],   // n-dash
  '—': [true, true],     // m-dash
  '(': [true, false],
  ')': [false, true],
  '[': [true, false],
  ']': [false, true],
  '„': [true, false],
  '“': [true, false],    // what about ukr/eng?
  '”': [false, true],
  '«': [true, false],
  '»': [false, true],
  '!': [false, true],
  '?': [false, true],
  '…': [false, true],
}

const LEFT_GLUE_PUNC = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][0]).map(x => '\\' + x).join('')
const RIGHT_GLUE_PUNC = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][1]).map(x => '\\' + x).join('')
const NO_GLUE_PUNC = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][0] && PUNC_SPACING[x][1]).map(x => '\\' + x).join('')
// console.log(NO_GLUE_PUNC)

const WORD_TAGS = new Set([W, W_])

////////////////////////////////////////////////////////////////////////////////
export function haveSpaceBetween(tagA: string, textA: string, tagB: string, textB: string) {
  if (!tagA || !tagB) {
    return null
  }
  let spaceA = !!PUNC_SPACING[textA] && PUNC_SPACING[textA][1]
  let spaceB = !!PUNC_SPACING[textB] && PUNC_SPACING[textB][0]
  let isWordA = WORD_TAGS.has(tagA)
  let isWordB = WORD_TAGS.has(tagB)

  if (isWordA && isWordB) {
    return true
  }

  if (isWordA && tagB === PC) {
    return spaceB
  }
  if (isWordB && tagA === PC) {
    return spaceA
  }

  if (tagA === tagB && tagB === PC) {
    return spaceA && spaceB
  }

  if (tagB === PC) {
    return spaceB
  }

  if (tagB === P) {
    return false
  }

  if (tagA === SE) {
    return true
  }

  return null
}

////////////////////////////////////////////////////////////////////////////////
export function haveSpaceBetweenEl(a: AbstractElement, b: AbstractElement): boolean {
  let tagA = a ? a.name() : null
  let textA = a ? a.text() : null
  let tagB = b ? b.name() : null
  let textB = b ? b.text() : null
  return haveSpaceBetween(tagA, textA, tagB, textB)
}

////////////////////////////////////////////////////////////////////////////////
const SPLIT_REGEX = new RegExp(`(${ANY_PUNC}|[^${WORDCHAR}])`)
export function* tokenizeUk(val: string, analyzer: MorphAnalyzer) {
  let toks = val.trim().split(SPLIT_REGEX)
  let glue = false
  for (let i = 0; i < toks.length; ++i) {
    let token = toks[i]
    if (!/^\s*$/.test(token)) {
      if (token.includes('-') && !analyzer.canBeToken(token)) {
        yield* token.split(/(-)/).filter(x => !!x).map(token => ({ token, glue }))
      }
      else {
        yield { token, glue }
      }
      glue = true
    }
    else if (/^\s+$/.test(token)) {
      glue = false
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
const TOSKIP = new Set(['w', 'mi:w_', 'pc', 'abbr', 'mi:se'])

export function tokenizeTei(root: AbstractElement, tagger: MorphAnalyzer) {
  let subroots = [...root.evaluateNodes('//tei:title|//tei:text', NS)]
  if (!subroots.length) {
    subroots = [root]
  }
  let doc = root.document()
  for (let subroot of subroots) {
    traverseDepth(subroot, node => {
      if (node.isElement() && TOSKIP.has(node.asElement().localName())) {
        return 'skip'
      }
      if (node.isText()) {
        let text = node.text()
        let cursor = node.document().createElement('cursor')
        node.replace(cursor)

        for (let tok of tokenizeUk(text, tagger)) {
          if (tok.glue) {
            cursor.insertBefore(doc.createElement('g', NS.mi))
          }
          cursor.insertBefore(elementFromToken(tok.token, doc))
        }

        cursor.remove()
      }
    })
  }

  return root
}

////////////////////////////////////////////////////////////////////////////////
export function elementFromToken(token: string, document: AbstractDocument) {
  let ret: AbstractNode
  if (ANY_PUNC_OR_DASH_RE.test(token)) {
    ret = document.createElement('pc'/*, NS.tei*/)
    ret.text(token)
  }
  // else if (/^\d+$/.test(token) || WORDCHAR_RE.test(token)) {
  //   ret = document.createElement('w'/*, NS.tei*/)
  //   ret.text(token)
  // }
  else {
    //console.error(`Unknown token: "${token}"`) // todo
    ret = document.createElement('w'/*, NS.tei*/)
    ret.text(token)
    //throw 'kuku' + token.length
  }

  return ret
}

//------------------------------------------------------------------------------
function fillInterpElement(miw: AbstractElement, form: string, morphTags: Iterable<IStringMorphInterp>) {
  let doc = miw.document()
  for (let morphTag of morphTags) {
    let w = doc.createElement('w')
    w.text(form)
    let { lemma, flags } = morphTag
    w.setAttribute('lemma', lemma)
    w.setAttribute('ana', flags)
    miw.appendChild(w)
  }
  return miw
}

//------------------------------------------------------------------------------
function tagWord(el: AbstractElement, morphTags: Iterable<IStringMorphInterp>) {
  let miw = fillInterpElement(el.document().createElement('w_', NS.mi), el.text(), morphTags)
  el.replace(miw)
  return miw
}

//------------------------------------------------------------------------------
function tagOrXVesum(interps: MorphInterp[]) {
  return interps.map(x => x.toVesumStrMorphInterp())
}

//------------------------------------------------------------------------------
function tagOrXMte(interps: MorphInterp[]) {
  let res = interps.map(x => x.toMteMorphInterp())
  return uniqueJson(res)
}

////////////////////////////////////////////////////////////////////////////////
export function isRegularizedFlowElement(el: AbstractElement) {
  let ret = !(el.name() === elementNames.teiOrig && el.parent() && el.parent().name() === elementNames.teiChoice)
  return ret
}

////////////////////////////////////////////////////////////////////////////////
// export function morphInterpret2(root: AbstractElement, analyzer: MorphAnalyzer, mte = false) {
//   for (let {el, unamb, interps} of genMorphInterps(root, analyzer, mte)) {
//     console.log(el.name())
//     let w = tagWord(el, interps)
//     if (unamb) {
//       w.setAttribute('disamb', 0)
//     }
//   }
// }

////////////////////////////////////////////////////////////////////////////////
// export function* genMorphInterps(root: AbstractElement, analyzer: MorphAnalyzer, mte = false) {
//   let tagFunction = mte ? tagOrXMte : tagOrXVesum

//   let subroots = [...root.evaluateElements('//tei:title', NS), ...root.evaluateElements('//tei:text', NS)]
//   if (!subroots.length) {
//     subroots = [root]
//   }

//   for (let subroot of subroots) {
//     let iterator = traverseDepthGen(subroot)
//     let pointer = iterator.next()
//     while (!pointer.done) {
//       // console.log('erato')
//       if (!pointer.value.node.isElement()) {
//         continue
//       }
//       let el = pointer.value.node.asElement()
//       let name = el.name()
//       if (name === W_ || !isRegularizedFlowElement(el)) {
//         pointer = iterator.next('skip')
//         continue
//       }

//       if (name === W || name === 'w') {  // hack, todo
//         let lang = el.lang()
//         if (lang && lang !== 'uk') {
//           yield { el, unamb: true, interps: [{ lemma: el.text(), flags: 'x:foreign' }] }
//         }
//         else {
//           let next = el.nextElementSiblings()
//             .find(x => x.localName() === 'pc' || x.localName === 'w')
//           yield {
//             el,
//             unamb: false,
//             interps: tagFunction(analyzer, el.text(), next && next.text()),
//           }
//         }
//       }
//       pointer = iterator.next()
//     }
//   }

//   return root
// }

const elementsOfInterest = new Set(['w_', 'w', 'p', 'lg', 'l', 's', 'pc', 'div', 'g'])
////////////////////////////////////////////////////////////////////////////////
export function iterateCorpusTokens(root: AbstractElement) {
  let subroots = [...root.evaluateElements('//tei:title', NS), ...root.evaluateElements('//tei:text', NS)]
  if (!subroots.length) {
    subroots = [root]
  }

  return mu((function* () {
    for (let subroot of subroots) {
      let iterator = traverseDepthGen2(subroot)
      let pointer = iterator.next()
      while (!pointer.done) {
        let { node, entering } = pointer.value
        if (node.isElement()) {
          let el = node.asElement()
          let name = el.name()
          if (entering && (name === W_ || !isRegularizedFlowElement(el))) {
            if (name === W_) {
              yield { el, entering }
            }
            pointer = iterator.next('skip')
            // console.log('skipped')
            continue
          }
          if (elementsOfInterest.has(el.localName())) {  // todo
            yield { el, entering }
          }
        }
        pointer = iterator.next()
      }
    }
  })())
}

//------------------------------------------------------------------------------
function findNextToken(el: AbstractElement) {
  return el.nextElementSiblings().find(x => x.localName() === 'pc' || x.localName === 'w')
}

////////////////////////////////////////////////////////////////////////////////
export function morphInterpret(root: AbstractElement, analyzer: MorphAnalyzer, mte = false) {
  let tagFunction = mte ? tagOrXMte : tagOrXVesum

  let subroots = [...root.evaluateElements('//tei:title', NS), ...root.evaluateElements('//tei:text', NS)]
  if (!subroots.length) {
    subroots = [root]
  }

  for (let subroot of subroots) {
    traverseDepthEl(subroot, el => {

      let name = el.name()
      if (name === W_ || !isRegularizedFlowElement(el)) {
        return 'skip'
      }

      if (name === W || name === 'w') {  // hack, todo
        let lang = el.lang()
        if (lang && lang !== 'uk') {
          tagWord(el, [{ lemma: el.text(), flags: 'x:foreign' }]).setAttribute('disamb', 0)
        }
        else {
          let next = findNextToken(el)
          tagWord(el, tagFunction(analyzer.tagOrX(el.text(), next && next.text())))
        }
      }
    })
  }

  return root
}

////////////////////////////////////////////////////////////////////////////////
export function morphReinterpret(words: AbstractElement[], analyzer: MorphAnalyzer) {
  for (let token of words.map(x => $t(x))) {
    let form = token.text()
    let interps = token.getDisambedInterps()
    let lang = token.elem.lang()
    if (lang && lang !== 'uk') {
      token.onlyInterpAs('x:foreign', form)
    } else {
      token.elem.clear()
      token.clearDisamb()
      let next = token.nextToken() && token.nextToken().text()
      fillInterpElement(token.elem, form, tagOrXVesum(analyzer.tagOrX(form, next)))
      interps.forEach(x => {
        if (true /*token.hasInterp(x.flags, x.lemma)*/) {  // todo
          token.alsoInterpAs(x.flags, x.lemma)
        }
      })
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function enumerateWords(root: AbstractElement, attributeName = 'n') {
  let idGen = 0
  traverseDepthEl(root, el => {
    if (el.name() === W_) {
      el.setAttribute(attributeName, (idGen++).toString())
    }
  })

  return idGen
}

//------------------------------------------------------------------------------
function normalizeForm(str: string) {
  return cantBeLowerCase(str) ? str : str.toLowerCase()
}
////////////////////////////////////////////////////////////////////////////////
export function getStats(root: AbstractElement) {
  let wordCount = 0
  let dictUnknownCount = 0
  let dictUnknowns = new Set<string>()
  traverseDepthEl(root, elem => {
    let name = elem.name()
    if (name === W_) {
      ++wordCount
      // todo: use TextToken
      //...
    }
    else if (name === W && elem.attribute('ana') === 'X') {
      dictUnknowns.add(normalizeForm(elem.text()))
      ++dictUnknownCount
    }
  })

  return {
    wordCount,
    dictUnknownCount,
    dictUnknowns: [...dictUnknowns],
  }
}

////////////////////////////////////////////////////////////////////////////////
export function cantBeLowerCase(word: string) {
  if (word.length < 2) {
    return false
  }
  let subsr = word.substr(1)
  return subsr !== subsr.toLowerCase()
}

////////////////////////////////////////////////////////////////////////////////
export function isSaneLemma(value: string) {
  return WORDCHAR_UK_RE.test(value) || /^\d+$/.test(value)
}

////////////////////////////////////////////////////////////////////////////////
export function isSaneMte5Tag(value: string) {
  return /^[A-Z][a-z0-9\-]*$/.test(value)
}

////////////////////////////////////////////////////////////////////////////////
export function* dictFormLemmaTag(lines: Array<string>) {
  let lemma
  for (let line of lines) {
    let isLemma = !line.startsWith(' ')
    line = line.trim()
    if (line) {
      let [form, tag] = line.split(' ')
      if (isLemma) {
        lemma = form
      }
      yield { form, lemma, tag }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function markWordwiseDiff(mine: AbstractElement, theirs: AbstractElement) {
  let wordPairs = wu.zip(mine.evaluateElements('//mi:w_', NS), theirs.evaluateElements('//mi:w_', NS))
  let numDiffs = 0
  for (let [mineW, theirW] of wordPairs) {
    if (!$t(mineW).isEquallyInterpreted($t(theirW))) {
      ++numDiffs
      $t(mineW).setMark('to-review')
    }
  }
  if (!wordPairs.next().done) {  // todo: check wat's up with wu's zipLongest
    throw new Error('Diff for docs with uneven word count not implemented')
  }

  return numDiffs
}

////////////////////////////////////////////////////////////////////////////////
export function firstNWords(n: number, from: AbstractElement) {
  let words = [...from.evaluateElements(`(//mi:w_)[position() <= ${n}]`, NS)
    .map(x => x.firstElementChild().text())]  //todo
  return words
}

////////////////////////////////////////////////////////////////////////////////
export function oldZhyto2newerFormat(root: AbstractElement) {  // todo: rename xmlns
  let miwords = root.evaluateElements('//mi:w_', NS)
  for (let miw of miwords) {
    // rename attributes
    miw.renameAttributeIfExists('ana', 'disamb')
    miw.renameAttributeIfExists('word-id', 'n')




    // select unambig dict interps
    if ([...miw.elementChildren()].length === 1 && !miw.attribute('disamb')) {
      miw.setAttribute('disamb', 0)
    }

    for (let w of miw.elementChildren()) {
      let mte = w.attribute('ana')
      // console.log(`mte: ${mte}`)
      let vesum = MorphInterp.fromMte(mte, w.text()).toVesumStr()
      // console.log(`vesum: ${vesum}`)

      w.setAttribute('ana', vesum)
    }

    // miw.removeAttribute('n')  // temp
    // miw.removeAttribute('disamb')  // temp
  }

  sortInterps(root)

  return root

  // todo: sort attributes
}

////////////////////////////////////////////////////////////////////////////////
export function sortInterps(root: AbstractElement) {
  for (let miw of [...root.evaluateElements('//mi:w_', NS)]) {

    let disambIndex = Number.parseInt(miw.attribute('disamb'))
    let disambElem
    if (!Number.isNaN(disambIndex)) {
      disambElem = miw.elementChild(disambIndex)
    }

    sortChildElements(miw, (a, b) => {
      let ret = a.text().localeCompare(b.text())
      if (ret) {
        return ret
      }

      return compareTags(MorphInterp.fromVesumStr(a.attribute('ana')), MorphInterp.fromVesumStr(b.attribute('ana')))
      // return a.attribute('ana').localeCompare(b.attribute('ana'))
    })

    if (disambElem) {
      miw.setAttribute('disamb', [...miw.elementChildren()].indexOf(disambElem))
    }
  }

  return root
}

////////////////////////////////////////////////////////////////////////////////
export function untag(root: AbstractElement) {
  let doc = root.document()
  for (let miw of [...root.evaluateElements('//mi:w_', NS)]) {
    let replacer = doc.createElement('w')
    replacer.text(miw.firstElementChild().text())
    miw.replace(replacer)
  }

  return root
}

////////////////////////////////////////////////////////////////////////////////
export function getTeiDocName(doc: AbstractDocument) {  // todo
  let title = doc.root().evaluateElement('//tei:title[1]', NS)
  if (title) {
    return title.evaluateElements('./mi:w_', NS).map(x => $t(x).text()).toArray().join(' ').trim()
  }
}

////////////////////////////////////////////////////////////////////////////////
export function adoptMorphDisambs(destRoot: AbstractElement, sourceRoot: AbstractElement) {
  // for (let miwSource of sourceRoot.evaluateElements('//mi:w_', NS)) {
  //   let miwDest = destRoot.evaluateElement(`//mi:w_[@n="${miwSource.attribute('n')}"]`, NS)
  //   let tokenSource = $t(miwSource)
  //   let { flags, lemma } = tokenSource.getDisambedInterps()
  //   let w = miwSource.document().createElement('w').setAttributes({
  //     ana: flags,
  //     lemma,
  //   })
  //   w.text(tokenSource.text())
  //   miwDest.replace(w)
  // }
  throw new Error('todo')
}

////////////////////////////////////////////////////////////////////////////////
const LATIN_CYR_GLYPH_MISSPELL = {
  'e': 'е',
  'y': 'у',
  'i': 'і',
  'o': 'о',
  'p': 'р',
  'a': 'а',
  'x': 'х',
  'c': 'с',
  'E': 'Е',
  'T': 'Т',
  'I': 'І',
  'O': 'О',
  'P': 'Р',
  'A': 'А',
  'H': 'Н',
  'K': 'К',
  'X': 'Х',
  'C': 'С',
  'B': 'В',
  'M': 'М',
}
const latinMisspells = Object.keys(LATIN_CYR_GLYPH_MISSPELL).join('')
const latinMisspellsRe1 = new RegExp(r`([${LETTER_UK}])([${latinMisspells}])`, 'g')
const latinMisspellsRe2 = new RegExp(r`([${latinMisspells}])([${LETTER_UK}])`, 'g')
export function fixLatinGlyphMisspell(value: string) {
  value = value.replace(latinMisspellsRe1, (match, cyr, latin) => cyr + LATIN_CYR_GLYPH_MISSPELL[latin])
  value = value.replace(latinMisspellsRe2, (match, latin, cyr) => LATIN_CYR_GLYPH_MISSPELL[latin] + cyr)
  return value
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeCorpusTextString(value: string) {
  let ret = value
    // .replace(/[\xa0]/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/(\s*)\n\s*\n(\s*)/g, '$1\n$2')
    .replace(new RegExp(r`([${WORDCHAR}${RIGHT_GLUE_PUNC}])\.{3}([^\.])?`, 'g'), '$1…$2')
    .replace(/(^|\s)[\-–] /g, '$1— ')
    // .replace(new RegExp(r`((\s|${ANY_PUNC})[\-–]([${LETTER_UK}])`, 'g'), '$1 — $2')
    .replace(new RegExp(r`([${LETTER_UK}])'`, 'g'), '$1’')
    .replace(new RegExp(r`(?=[${WORDCHAR}])['\`](?=[${WORDCHAR}])'`, 'g'), '’')
    .replace(new RegExp(r`(^|\s)"([${RIGHT_GLUE_PUNC}${LETTER_UK}\w])`, 'g'), '$1“$2')
    .replace(new RegExp(r`([${LETTER_UK}${RIGHT_GLUE_PUNC}])"(\s|[-${RIGHT_GLUE_PUNC}${NO_GLUE_PUNC}]|$)`, 'g'), '$1”$2')
  ret = fixLatinGlyphMisspell(ret)

  return ret
}

////////////////////////////////////////////////////////////////////////////////
const unboxElems = new Set(['nobr', 'img'])
const removeElems = new Set(['br'])
export function normalizeCorpusText(root: AbstractElement) {
  let doc = root.document()
  traverseDepthEl(root, el => {
    if (unboxElems.has(el.localName())) {
      el.unwrap()
    }
    else if (removeElems.has(el.localName())) {
      el.remove()
    }
    else if (el.localName() === 'em') {
      let box = el.document().createElement('emph').setAttribute('rend', 'italic')
      el.rewrap(box)
    }
  })

  for (let textNode of root.evaluateNodes('//text()', NS)) {
    let res = normalizeCorpusTextString(textNode.text())
    textNode.replace(doc.createTextNode(res))
  }

  // todo:
  // if orig has >2 words
  // invisible spaces, libxmljs set entities
}

////////////////////////////////////////////////////////////////////////////////
const MULTISEP = '|'
const teiStructuresToCopy = createObject(['s', 'p', 'l', 'lg', 'div'].map(x => [x, x]))
// todo: fix namespace problem
function element2sketchVertical(el: AbstractElement, entering: boolean, interps?: MorphInterp[]) {
  let elName = el.localName()
  if (entering) {
    switch (elName) {
      case 'w':
      case elementNames.W: {
        let mteTags = unique(interps.map(x => x.toMte()))
        let vesumFlagss = interps.map(x => x.toVesumStr())
        let lemmas = unique(interps.map(x => x.lemma))
        return sketchLine(el.text(),
          lemmas.join(MULTISEP), mteTags.join(MULTISEP), vesumFlagss.join(MULTISEP))
      }
      case 'w_':
      case elementNames.W_: {
        let wInterps = $t(el).disambedOrDefiniteInterps()
        let mteTags = wInterps.map(x => MorphInterp.fromVesumStr(x.flags, x.lemma).toMte())
        let vesumFlagss = wInterps.map(x => x.flags)
        let lemmas = wInterps.map(x => x.lemma)
        lemmas = unique(lemmas)
        mteTags = unique(mteTags)
        // vesumFlagss = unique(vesumFlagss)
        return sketchLine($t(el).text(),
          lemmas.join(MULTISEP), mteTags.join(MULTISEP), vesumFlagss.join(MULTISEP))
      }
      case 'pc':
      case elementNames.PC:  // todo
        return sketchLine(el.text(), el.text(), 'U', 'punct')
      case 'g':
      case elementNames.G:
        return '<g/>'
      default: {
        if (elName in teiStructuresToCopy) {
          return `<${teiStructuresToCopy[elName]}>`
        }
        break
      }
    }
  } else {
    switch (elName) {
      default: {
        if (elName in teiStructuresToCopy) {
          return `</${teiStructuresToCopy[elName]}>`
        }
        break
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenizedTeiDoc2sketchVertical(
  root: AbstractElement, analyzer: MorphAnalyzer, meta: any = {}) {

  yield `<doc ${xmlutils.keyvalue2attributes(meta)}>`

  for (let {el, entering} of iterateCorpusTokens(root)) {
    let interps
    if (el.localName() === 'w'/* && !meta.disambed*/) {
      interps = analyzer.tagOrX(el.text(), findNextToken(el))
    }
    let line = element2sketchVertical(el, entering, interps)
    if (line) {
      yield line
    }
  }

  yield `</doc>`
}

////////////////////////////////////////////////////////////////////////////////
export function* interpretedTeiDoc2sketchVertical(root: AbstractElement, meta: any = {}) {
  yield `<doc ${xmlutils.keyvalue2attributes(meta)}>`
  yield* interpretedTeiDoc2sketchVerticalTokens(root)
  yield `</doc>`
}

////////////////////////////////////////////////////////////////////////////////
export function* interpretedTeiDoc2sketchVerticalTokens(root: AbstractElement) {
  for (let {el, entering} of iterateCorpusTokens(root)) {
    let line = element2sketchVertical(el, entering)
    if (line) {
      yield line
    }
  }
}

//------------------------------------------------------------------------------
function sketchLine(token: string, lemma: string, mteTag: string, vesumTag: string) {
  return `${token}\t${lemma}\t${mteTag}\t${vesumTag}`
}

function paragraphBySpaceBeforeNewLine(root: AbstractElement) {
  let doc = root.document()
  for (let textNode of root.evaluateNodes('./text()', NS)) {
    let matches = (textNode.text().match(/(.|\n)*?\S(\n|$)/g) || [])
    matches.forEach(match => {
      let p = doc.createElement('p')
      p.text(match.replace(/\n/g, ''))
      root.appendChild(p)
      // console.log(match)
    })
    textNode.remove()
  }
}

////////////////////////////////////////////////////////////////////////////////
const TEI_DOC_TRANSFORMS = {
  normalize: normalizeCorpusText,
  paragraphBySpaceBeforeNewLine,
}
export function processMiTeiDocument(root: AbstractElement) {
  let doc = $d(root)

  doc.getTransforms().forEach(transformName => {
    TEI_DOC_TRANSFORMS[transformName](doc.getBody())
  })
}

////////////////////////////////////////////////////////////////////////////////
export function looksLikeMiTei(value: string) {
  return /^<[^>]*xmlns:mi="http:\/\/mova\.institute\/ns\/corpora\/0\.1"/.test(value)
}

////////////////////////////////////////////////////////////////////////////////
// todo: kill
export function tagText(value: string, analyzer: MorphAnalyzer, docCreator: DocCreator) {
  value = xmlutils.removeProcessingInstructions(value)
  if (!looksLikeMiTei(value)) {
    value = xmlutils.encloseInRootNs(value)
  }

  let doc = docCreator(value)
  tokenizeTei(doc.root(), analyzer)
  morphInterpret(doc.root(), analyzer)

  return doc.serialize(true)
}

////////////////////////////////////////////////////////////////////////////////
export function preprocessForTaggingGeneric(value: string, docCreator: DocCreator, isXml: boolean) {
  if (isXml) {
    value = xmlutils.removeProcessingInstructions(value)
    if (looksLikeMiTei(value)) {
      let ret = docCreator(value).root()
      processMiTeiDocument(ret)
      return ret
    }
  }
  value = normalizeCorpusTextString(value)
  if (!isXml) {
    value = xmlutils.escape(value)
  }
  value = xmlutils.encloseInRootNs(value)

  return docCreator(value).root()
}
