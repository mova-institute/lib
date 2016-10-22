import {
  NS, nameNs, traverseDepth, traverseDepthEl, sortChildElements,
  traverseDepthGen, traverseDepthGen2, keyvalue2attributesNormalized,
} from '../xml/utils'
import * as xmlutils from '../xml/utils'
import { W, W_, PC, SE, P } from './common_elements'
import * as elementNames from './common_elements'
import { r, createObject, matchAll } from '../lang'
import { uniqueSmall as unique, uniqueJson } from '../algo'
import { AbstractNode, AbstractElement, AbstractDocument, DocCreator } from 'xmlapi'
import { MorphAnalyzer } from './morph_analyzer/morph_analyzer'
import { $t } from './text_token'
import { IStringMorphInterp } from './interfaces'
import { MorphInterp, compareTags } from './morph_interp'
import { WORDCHAR_UK_RE, WORDCHAR, LETTER_UK } from './static'
import { $d } from './mi_tei_document'
import { mu, Mu } from '../mu'
import { startsWithCapital } from '../string_utils'
import { Token, TokenType, Structure } from './token'
import * as uniq from 'lodash/uniq'
import * as sortedUniq from 'lodash/sortedUniq'

const wu: Wu.WuStatic = require('wu')



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

const PUNC_GLUED_AFTER = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][0]).map(x => '\\' + x).join('')
const PUNC_GLUED_BEFORE = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][1]).map(x => '\\' + x).join('')
const NO_GLUE_PUNC = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][0] && PUNC_SPACING[x][1]).map(x => '\\' + x).join('')
// console.log(NO_GLUE_PUNC)

const WORD_TAGS = new Set([W, W_])


////////////////////////////////////////////////////////////////////////////////
export function normalizeDiacritics(str: string) {
  return str
    .replace(/і\u{308}/gui, x => startsWithCapital(x) ? 'Ї' : 'ї')
    .replace(/и\u{306}/gui, x => startsWithCapital(x) ? 'Й' : 'й')
}

////////////////////////////////////////////////////////////////////////////////
export function haveSpaceBetween(tagA: string, textA: string, tagB: string, textB: string) {
  if (!tagA || !tagB) {
    return
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
  return haveSpaceBetween(a.name(), a.text(), b.name(), b.text())
}

////////////////////////////////////////////////////////////////////////////////
const SPLIT_REGEX = new RegExp(`(${ANY_PUNC}|[^${WORDCHAR}])`)
export function tokenizeUk(val: string, analyzer: MorphAnalyzer) {
  let ret: { token: string, glue: boolean }[] = []
  let toks = val.trim().split(SPLIT_REGEX)
  let glue = false
  for (let i = 0; i < toks.length; ++i) {
    let token = toks[i]
    if (!/^\s*$/.test(token)) {
      if (token.includes('-') && !analyzer.canBeToken(token)) {
        ret.push(...token.split(/(-)/).filter(x => x).map(token => ({ token, glue })))
      }
      else {
        ret.push({ token, glue })
      }
      glue = true
    }
    else if (/^\s+$/.test(token)) {
      glue = false
    }
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function string2tokenStream(val: string, analyzer: MorphAnalyzer) {
  return mu((function* () {
    let tokens = tokenizeUk(val, analyzer)
    for (let i = 0; i < tokens.length; ++i) {
      let {token, glue} = tokens[i]
      if (glue) {
        yield Token.glue()
      }
      if (ANY_PUNC_OR_DASH_RE.test(token)) {  // todo
        yield Token.word(token, [MorphInterp.fromVesumStr('punct').setLemma(token)])
        continue
      }
      let next = tokens[i + 1] && tokens[i + 1].token
      yield Token.word(token, analyzer.tagOrX(token, next))
    }
  })())
}

////////////////////////////////////////////////////////////////////////////////
export function tokenStream2plainVertical(stream: Mu<Token>, mte: boolean) {
  let tagSerializer = mte
    ? (x: MorphInterp) => x.toMte()
    : (x: MorphInterp) => x.toVesumStr()

  return stream.map(token => {
    if (token.isGlue()) {
      return '<g/>'
    }
    let ret = token.formRepesentation() + ' '
    let interps = token.interps.map(x => `${x.lemma}[${tagSerializer(x)}]`)
    if (mte) {
      interps = uniq(interps)
    }
    ret += interps.join('|')

    return ret
  })
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

const elementsOfInterest = new Set(['w_', 'w', 'p', 'lg', 'l', 's', 'pc', 'div', 'g', 'se'])
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
        let attributes = el.attributes().map(x => [x.nameLocal(), x.value()])
        let lemma = el.attribute('lemma')
        let ana = el.attribute('ana')
        if (lemma && ana) {
          var miw = tagWord(el, [{ lemma, flags: ana }]).setAttribute('disamb', 0)
        } else {
          let lang = el.lang()
          if (lang && lang !== 'uk') {
            miw = tagWord(el, [{ lemma: el.text(), flags: 'x:foreign' }]).setAttribute('disamb', 0)
          }
          else {
            let next = findNextToken(el)
            miw = tagWord(el, tagFunction(analyzer.tagOrX(el.text(), next && next.text())))
          }
        }
        attributes.filter(x => x[0] !== 'lemma' && x[0] !== 'ana')
          .forEach(x => miw.setAttribute(x[0], x[1]))
      }
    })
  }

  return root
}

//------------------------------------------------------------------------------
function orX(form: string, interps: MorphInterp[]) {  // todo
  if (!interps.length) {
    interps = [MorphInterp.fromVesumStr('x', form)]
  }
  return interps
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
      let next = token.nextToken() && token.nextToken() !.text()
      let curDictInterps = analyzer.tag(form, next)
      if (curDictInterps.length) {
        token.elem.clear()
        token.clearDisamb()
        fillInterpElement(token.elem, form, tagOrXVesum(orX(form, curDictInterps)))
        interps.forEach(x => {
          if (true /*token.hasInterp(x.flags, x.lemma)*/) {  // todo
            token.alsoInterpAs(x.flags, x.lemma)
          }
        })
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function enumerateWords(root: AbstractElement, attributeName = 'n') {
  let idGen = 0  // todo: switch from wu to normal forEach
  root.evaluateElements('//mi:w_|//w[not(ancestor::mi:w_)]', NS)  // todo: NS bug
    .forEach(x => x.setAttribute(attributeName, (idGen++).toString()))

  return idGen
}

////////////////////////////////////////////////////////////////////////////////
export function newline2Paragraph(root: AbstractElement) {
  root.evaluateNodes('.//text()').forEach(node => {
    let text = node.text()
    if (text.trim()) {
      text.split(/[\r\n]+/g).forEach(x => {
        if (x.trim()) {
          let p = root.document().createElement('p', NS.tei)
          // console.log(node.wrapee.parent().)
          node.parent().appendChild(p)  // todo!!
          p.text(x)
        }
      })
      node.remove()
    }
  })
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
export function removeHypenation(str: string, analyzer: MorphAnalyzer) {
  let re = new RegExp(r`(^|[^${WORDCHAR}])([${WORDCHAR}]+)[\u00AD\-]\s+([${WORDCHAR}]+|$)`, 'g')
  return str.replace(re, (match, beforeLeft, left, right) => {
    let together = left + right
    if (analyzer.canBeToken(together)) {  // it's a hypen
      return beforeLeft + left + right
    }
    let dashed = left + '-' + right
    if (analyzer.canBeToken(dashed)) {
      return beforeLeft + dashed
    }
    return beforeLeft + left + right
  })
    .replace(/\u00AD/g, '')  // just kill the rest
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeCorpusTextString(value: string, analyzer?: MorphAnalyzer) {
  let ret = value
    .replace(/[\t\u{0}\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2060}]/gu, '')  // invizibles
    // .replace(/[\xa0]/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/(\s*)\n\s*\n(\s*)/g, '$1\n$2')
    .replace(new RegExp(r`([${WORDCHAR}${PUNC_GLUED_BEFORE}])\.{3}([^\.])?`, 'g'), '$1…$2')
    .replace(new RegExp(r`(^|[\s${PUNC_GLUED_BEFORE}])[\-–] `, 'g'), '$1— ')
    // .replace(new RegExp(r`((\s|${ANY_PUNC})[\-–]([${LETTER_UK}])`, 'g'), '$1 — $2')
    .replace(new RegExp(r`([${LETTER_UK}])'`, 'g'), '$1’')
    .replace(new RegExp(r`(?=[${WORDCHAR}])['\`](?=[${WORDCHAR}])'`, 'g'), '’')
    .replace(new RegExp(r`(^|\s)"([${PUNC_GLUED_BEFORE}${WORDCHAR}])`, 'g'), '$1“$2')
    .replace(new RegExp(r`(^|\s),,([${PUNC_GLUED_AFTER}${WORDCHAR}])`, 'g'), '$1„$2')
    .replace(new RegExp(r`([${WORDCHAR}${PUNC_GLUED_BEFORE}])"(\s|[-${PUNC_GLUED_BEFORE}${NO_GLUE_PUNC}]|$)`, 'g'), '$1”$2')
  ret = fixLatinGlyphMisspell(ret)
  ret = normalizeDiacritics(ret)
  if (analyzer) {
    ret = removeHypenation(ret, analyzer)
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
const unboxElems = new Set(['nobr', 'img'])
const removeElems = new Set(['br'])
export function normalizeCorpusText(root: AbstractElement, analyzer?: MorphAnalyzer) {
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
    let res = normalizeCorpusTextString(textNode.text(), analyzer)
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
        if (!interps) {
          throw new Error(`No interps`)
        }
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
          let attributes = keyvalue2attributesNormalized(el.attributesObj())
          return `<${teiStructuresToCopy[elName]}${attributes.trim() ? ` ${attributes}` : ''}>`
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

const structureNameToSketchTag = new Map<Structure, string>([
  ['document', 'doc'],
  ['div', 'div'],
  ['paragraph', 'p'],
  ['sentence', 's'],
  ['stanza', 'lg'],
  ['line', 'l'],
])
////////////////////////////////////////////////////////////////////////////////
export function token2sketchVertical(token: Token) {
  if (token.isWord()) {
    if (token.interps.length) {
      let mteTags = sortedUniq(token.interps.map(x => x.toMte()).sort()).join(MULTISEP)
      let mivesumFlagss = token.interps.map(x => x.toVesumStr()).sort().join(MULTISEP)
      let lemmas = sortedUniq(token.interps.map(x => x.lemma).sort()).join(MULTISEP)
      return sketchLine(token.form, lemmas, mteTags, mivesumFlagss)
    } else {
      return token.form
    }
  }
  if (token.isGlue()) {
    return '<g/>'
  }
  if (token.isStructure()) {
    let tagName = structureNameToSketchTag.get(token.getStructureName())
    if (!tagName) {
      throw new Error('Unknown structure')
    }
    if (token.isClosing()) {
      return `</${tagName}>`
    }
    let attributes = token.getStructureAttributes()
    if (attributes) {
      return `<${tagName} ${keyvalue2attributesNormalized(attributes)}>`
    }
    return `<${tagName}>`
  }
  throw new Error('Unknown token')
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenizedTeiDoc2sketchVertical(
  root: AbstractElement, analyzer: MorphAnalyzer, meta: any = {}) {

  yield `<doc ${xmlutils.keyvalue2attributesNormalized(meta)}>`

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
  yield `<doc ${keyvalue2attributesNormalized(meta)}>`
  yield* interpretedTeiDoc2sketchVerticalTokens(root)
  yield `</doc>`
}

////////////////////////////////////////////////////////////////////////////////
export function* interpretedTeiDoc2sketchVertical2(root: AbstractElement, meta: any = {}) {
  yield `<doc ${keyvalue2attributesNormalized(meta)}>`
  yield* mu(tei2tokenStream(root)).map(x => token2sketchVertical(x))
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
  return tsvLine(token, lemma, mteTag, vesumTag)
}

//------------------------------------------------------------------------------
function tsvLine(...values: string[]) {
  return values.join('\t')
}

//------------------------------------------------------------------------------
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
const miteiTransforms = {
  normalize: normalizeCorpusText,
  paragraphBySpaceBeforeNewLine,
  oldMteDisamb2mivesum,
}
export function applyMiTeiDocTransforms(root: AbstractElement) {
  let doc = $d(root)
  for (let transformName of doc.getTransforms()) {
    if (!(transformName in miteiTransforms)) {
      throw new Error(`Unknown mitei transorm "${transformName}"`)
    }
    miteiTransforms[transformName](doc.getBody())
  }
}

////////////////////////////////////////////////////////////////////////////////
export function looksLikeMiTei(value: string) {
  return /^<[^>]*xmlns:mi="http:\/\/mova\.institute\/ns\/corpora\/0\.1"/.test(value)
}

////////////////////////////////////////////////////////////////////////////////
export function preprocessForTaggingGeneric(value: string, docCreator: DocCreator, isXml: boolean) {
  if (isXml) {
    value = xmlutils.removeProcessingInstructions(value)
    if (looksLikeMiTei(value)) {
      let ret = docCreator(value).root()
      // processMiTeiDocument(ret)
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

////////////////////////////////////////////////////////////////////////////////
export function oldMteDisamb2mivesum(root: AbstractElement) {
  for (let w of root.evaluateElements('//tei:w', NS)) {
    let form = w.text()
    let mte = w.attribute('ana')
    let vesum = MorphInterp.fromMte(mte, form).toVesumStr()
    w.setAttribute('ana', vesum)
  }
}

const structureElementName2type = new Map<string, Structure>([
  ['div', 'div'],
  ['p', 'paragraph'],
  ['lg', 'stanza'],
  ['l', 'line'],
  ['s', 'sentence'],
  // ['', ''],
])

////////////////////////////////////////////////////////////////////////////////
export function* tei2tokenStream(root: AbstractElement) {
  for (let {el, entering} of iterateCorpusTokens(root)) {
    let name = el.localName()

    let structureType = structureElementName2type.get(name)
    if (structureType) {
      yield Token.structure(structureType, !entering, el.attributesObj())
      continue
    }

    if (entering) {
      switch (name) {
        case 'w_': {
          let t = $t(el)
          let interps = t.disambedOrDefiniteInterps()
          if (interps.length) {
            yield new Token().setForm(t.text())
              .addInterps(interps.map(x => MorphInterp.fromVesumStr(x.flags, x.lemma)))
          } else {
            yield new Token().setForm(t.text()).addInterp(MorphInterp.fromVesumStr('x', t.text()))
          }
          continue
        }
        case 'w': {
          let tok = new Token().setForm(el.text())
          if (el.attribute('ana')) {
            tok.addInterp(MorphInterp.fromVesumStr(el.attribute('ana'), el.attribute('lemma')))
          }
          yield tok
          continue
        }
        case 'pc':
          yield new Token().setForm(el.text()).addInterp(MorphInterp.fromVesumStr('punct', el.text()))
          continue
        case 'se':
          yield Token.structure('sentence', true)
          continue
        case 'g':
          yield Token.glue()
          continue
        default:
          continue
      }
    }
  }
}
