import {
  NS, nameNs, traverseDepth, traverseDepthEl, sortChildElements,
  traverseDepthGen2,
} from '../xml/utils'
import * as xmlutils from '../xml/utils'
import { W, W_, PC, SE, P } from './common_elements'
import * as elementNames from './common_elements'
import { r, makeObject, last } from '../lang'
import { uniqueSmall as unique, uniqueJson, arr2indexObj, rfind, clusterize } from '../algo'
import { MorphAnalyzer } from './morph_analyzer/morph_analyzer'
import { $t } from './text_token'
import { IStringMorphInterp } from './interfaces'
import { MorphInterp, compareTags } from './morph_interp'
import {
  WORDCHAR, PUNC_SPACING, ANY_PUNC, ANY_PUNC_OR_DASH_RE, cyrToLat,
  INVISIBLES_RE, latMixins, latToCyr,
  APOSTROPHES_COMMON, cyrMixins, LETTER_CYR, LETTER_LAT_EXCLUSIVE, LETTER_CYR_EXCLUSIVE,
} from './static'
import { $d } from './mi_tei_document'
import { mu, Mu } from '../mu'
import { startsWithCapital, loopReplace } from '../string'
import { Token, TokenTag, Structure, CoreferenceType } from './token'
import { interp2udVertFeatures, mergeAmbiguityFeaturewise } from './ud/utils'
import { keyvalue2attributesNormalized } from './noske'
import { XmlFormatter } from '../xml/xml_formatter'

import * as uniq from 'lodash.uniq'
import * as sortedUniq from 'lodash.sorteduniq'
import { GraphNode } from '../graph'
import { AbstractElement } from '../xml/xmlapi/abstract_element'
import { AbstractDocument } from '../xml/xmlapi/abstract_document'
import { HELPER_RELATIONS } from './ud/uk_grammar'



////////////////////////////////////////////////////////////////////////////////
export const ELEMS_BREAKING_SENTENCE_NS = new Set([
  nameNs(NS.tei, 'p'),
  nameNs(NS.tei, 'body'),
  nameNs(NS.tei, 'text'),
])

//------------------------------------------------------------------------------
const WORD_TAGS = new Set([W, W_])

//------------------------------------------------------------------------------
// todo: more grace with apostrophes

const latMixinsGentleReLeft = new RegExp(
  r`([${latMixins}])([${APOSTROPHES_COMMON}]?[${LETTER_CYR_EXCLUSIVE}])`, 'g')
const latMixinsGentleReRight = new RegExp(
  r`([${LETTER_CYR_EXCLUSIVE}][${APOSTROPHES_COMMON}]?)([${latMixins}])`, 'g')
// const latMixinsRudeReLeft = new RegExp(
//   r`([${latMixins}])([${APOSTROPHES_COMMON}]?[${LETTER_CYR}])`, 'g')
// const latMixinsRudeReRight = new RegExp(
//   r`([${LETTER_CYR_EXCLUSIVE}][${APOSTROPHES_COMMON}]?)([${latMixins}])`, 'g')
const latMixinsReLeft = new RegExp(
  r`([${latMixins}])([${APOSTROPHES_COMMON}]?[${LETTER_CYR}])`, 'g')
const latMixinsReRight = new RegExp(
  r`([${LETTER_CYR}][${APOSTROPHES_COMMON}]?)([${latMixins}])`, 'g')
const cyrMixinsReLeft = new RegExp(
  r`([${cyrMixins}])([${APOSTROPHES_COMMON}]?[${LETTER_LAT_EXCLUSIVE}])`, 'g')
const cyrMixinsReRight = new RegExp(
  r`([${LETTER_LAT_EXCLUSIVE}][${APOSTROPHES_COMMON}]?)([${cyrMixins}])`, 'g')

////////////////////////////////////////////////////////////////////////////////
export function fixLatinMixinGentle(text: string) {
  text = text.replace(latMixinsGentleReLeft, (match, lat, cyr) =>
    latToCyr[lat] + cyr)

  text = text.replace(latMixinsGentleReRight, (match, cyr, lat) =>
    cyr + latToCyr[lat])

  return text
}

////////////////////////////////////////////////////////////////////////////////
export function fixCyrillicMixinGentle(text: string) {
  text = text.replace(cyrMixinsReLeft, (match, cyr, lat) =>
    cyrToLat[cyr] + lat)

  text = text.replace(cyrMixinsReRight, (match, lat, cyr) =>
    lat + cyrToLat[cyr])

  return text
}

////////////////////////////////////////////////////////////////////////////////
export function hasLatCyrMix(text: string) {
  return latMixinsReLeft.test(text) || latMixinsReRight.test(text)
}

//------------------------------------------------------------------------------
const latMixinRe = new RegExp(`[${latMixins}]`, 'g')
////////////////////////////////////////////////////////////////////////////////
export function fixLatinMixinDict(token: string, analyzer: MorphAnalyzer) {
  if (hasLatCyrMix(token)) {
    let replaced = token.replace(latMixinRe, match => latToCyr[match])
    if (analyzer.hasInterps(replaced)) {
      return replaced
    }
  }
  return token
}

////////////////////////////////////////////////////////////////////////////////
export function fixRomanNumeralCyrMixin(text: string) {
  text = loopReplace(text, /([XVI])([ХІ])/g, (match, lat, cyr) => lat + cyrToLat[cyr])
  text = loopReplace(text, /([ХІ])([XVI])/g, (match, cyr, lat) => cyrToLat[cyr] + lat)

  return text
}

////////////////////////////////////////////////////////////////////////////////
export function removeRenderedHypenation(str: string, analyzer: MorphAnalyzer) {
  let re = new RegExp(r`(^|[^${WORDCHAR}])([${WORDCHAR}]+)[\u00AD\-]\s+([${WORDCHAR}]+|$)`, 'g')
  return str.replace(re, (match, beforeLeft, left, right) => {
    // if (right === 'і') {
    //   return beforeLeft + left + right
    // }
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
export function removeInvisibles(value: string) {
  return value.replace(INVISIBLES_RE, '')
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeZvidusilParaNondestructive(value: string) {
  value = removeInvisibles(value)
  value = value.replace(/[\s\n\r]+/g, ' ')
  value = removeSoftHypen(value)
  value = normalizeDiacritics(value)
  value = value.trim()

  return value
}

////////////////////////////////////////////////////////////////////////////////
// expects normalizeZvidusilParaNondestructive() upstream
export function normalizeZvidusilParaAggressive(
  para: string,
  analyzer: MorphAnalyzer,
) {
  para = removeCombiningAccent(para)
  para = fixRomanNumeralCyrMixin(para)
  para = fixLatinMixinGentle(para)
  para = fixCyrillicMixinGentle(para)
  para = fixApostrophes(para)

  para = mu(tokenizeUkNew(para, analyzer)).map(([token, glued]) => {
    token = normalizeDash(token, analyzer)
    token = fixLatinMixinDict(token, analyzer)

    if (!glued) {
      token = ` ${token}`
    }

    return token
  }).join('')

  para = para.trim()

  return para
}

//------------------------------------------------------------------------------
const autofixApostrophesRe = /([бпвмфгґкхжчшр])([“᾽ˈי»᾿ʹ\uF0A2\u0313”´΄ʾ᾽‘´`*'’ʼ\"])([єїюя])/gi
const autofixApostrophesEndRe = /^([а-яєіїґ]+)([“᾽ˈי»᾿ʹ\uF0A2\u0313”´΄ʾ᾽‘´`*'’ʼ\"])(?:\s|$)/gi
////////////////////////////////////////////////////////////////////////////////
export function fixApostrophes(token: string, to = '’') {
  token = token.replace(autofixApostrophesRe, (match, left, apos, right) =>
    `${left}${to}${right}`)
  token = token.replace(autofixApostrophesEndRe, (match, word, apos) =>
    `${word}${to}`)

  return token
}

////////////////////////////////////////////////////////////////////////////////
export function plaintext2paragraphsTrimmed(plaintext: string) {
  return plaintext.trim().split(/(?:\s*\n+\s*)+/g)
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeApostrophes(val: string, to = '’') {
  return val.replace(/['’`]/g, to)
}

////////////////////////////////////////////////////////////////////////////////
export function removeCombiningAccent(val: string) {
  return val.replace(/\u0301/g, '')
}

////////////////////////////////////////////////////////////////////////////////
export function removeSoftHypen(val: string) {
  return val.replace(/\u00AD/g, '')
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeDiacritics(str: string) {
  return str
    .replace(/і\u{308}/gui, x => startsWithCapital(x) ? 'Ї' : 'ї')
    .replace(/и\u{306}/gui, x => startsWithCapital(x) ? 'Й' : 'й')
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeDash(form: string, analyzer: MorphAnalyzer) {
  let replaced = form.replace(/[–—―־‑]/g, '-')
  if (replaced !== form && replaced.length === form.length) {
    let interps = analyzer.tag(replaced)
    if (interps.length && !interps.some(x => x.isPunctuation())) {
      return replaced
    }
  }
  return form
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

//------------------------------------------------------------------------------
const SPLIT_REGEX = new RegExp(`(${ANY_PUNC}|[^${WORDCHAR}])`)
////////////////////////////////////////////////////////////////////////////////
export function tokenizeUk(val: string, analyzer?: MorphAnalyzer) {
  let ret: Array<{ token: string, glue: boolean }> = []
  let toks = val.trim().split(SPLIT_REGEX)
  let glue = false
  for (let i = 0; i < toks.length; ++i) {
    let token = toks[i]
    if (!/^\s*$/.test(token)) {
      if (token.includes('-') && (!analyzer || !analyzer.canBeToken(token))) {
        ret.push(...token.split(/(-)/).filter(x => x).map((t, j) => ({ token: t, glue: glue || j !== 0 || false })))
      } else {
        ret.push({ token, glue })
      }
      glue = true
    } else if (/^\s+$/.test(token)) {
      glue = false
    }
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenizeUkNew(val: string, analyzer: MorphAnalyzer) {
  for (let chunk of val.trim().split(/\s+/g)) {
    if (chunk) {
      yield* splitNospace(chunk, analyzer)
    }
  }
}

//------------------------------------------------------------------------------
// let rrr = new Regex(`(${ANY_PUNC})`)
function* splitNospace(val: string, analyzer: MorphAnalyzer) {
  if (analyzer.canBeToken(val)) {
    yield [val, false] as [string, boolean]
  } else {
    // console.log(val)
    yield* tokenizeUk(val, analyzer)
      .map(({ token, glue }) => [token, glue]) as Array<[string, boolean]>
  }
}

////////////////////////////////////////////////////////////////////////////////
export function string2tokenStream(val: string, analyzer: MorphAnalyzer) {
  return mu((function* () {
    let tokens = [...tokenizeUkNew(val, analyzer)]
    for (let i = 0; i < tokens.length; ++i) {
      let [token, glue] = tokens[i]
      if (glue) {
        yield Token.glue()
      }
      if (ANY_PUNC_OR_DASH_RE.test(token)) {  // todo
        yield Token.word(token, [MorphInterp.fromVesumStr('punct').setLemma(token)])
        continue
      }
      let next = tokens[i + 1] && tokens[i + 1][0]
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
    let ret = token.toString() + ' '
    let interps = token.interps.map(x => `${x.lemma}[${tagSerializer(x)}]`)
    if (mte) {
      interps = uniq(interps)
    }
    ret += interps.join('|')

    return ret
  })
}

//------------------------------------------------------------------------------
const TOSKIP = new Set(['w', 'mi:w_', 'w_', 'abbr', 'mi:sb', 'sb'])

////////////////////////////////////////////////////////////////////////////////
export function tokenizeMixml(root: AbstractElement, tagger: MorphAnalyzer) {
  let subroots = root.evaluateNodes('//tei:title|//tei:text', NS).toArray()
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
        let lang = node.parent().attributeUp('lang')
        if (lang && lang !== 'uk') {
          // return
        }
        let text = node.text()
        let cursor = node.document().createElement('cursor')
        node.replace(cursor)

        for (let [token, glue] of tokenizeUkNew(text, tagger)) {
          if (glue) {
            cursor.insertBefore(doc.createElement('g'))
          }
          cursor.insertBefore(elementFromToken(token, doc))
        }

        cursor.remove()
      }
    })
  }

  return root
}

////////////////////////////////////////////////////////////////////////////////
export function elementFromToken(token: string, document: AbstractDocument) {
  let ret = document.createElement('w'/*, NS.tei*/)
  ret.text(token)

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function createMultitokenElement(
  doc: AbstractDocument,
  surfaceForm: string,
  subtokens: Array<[string, Array<MorphInterp>]>,
) {
  let ret = doc.createElement('multitoken')
    .setAttribute('form', surfaceForm)
  subtokens.forEach(([form, interps]) => ret.appendChild(
    createTokenElement(doc, form, interps.map(x => x.toVesumStrMorphInterp()))
  ))

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function createTokenElement(
  doc: AbstractDocument,
  form: string,
  morphTags: Iterable<IStringMorphInterp>,
  useNs = false
) {
  let ret = doc.createElement('w_', useNs ? NS.mi : undefined)
  fillInterpElement(ret, form, morphTags)

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
  let miw = createTokenElement(
    el.document(),
    el.text(),
    morphTags,
    true
  )
  el.replace(miw)
  return miw
}

//------------------------------------------------------------------------------
function tagOrXVesum(interps: Array<MorphInterp>) {
  return interps.map(x => x.toVesumStrMorphInterp())
}

//------------------------------------------------------------------------------
function tagOrXMte(interps: Array<MorphInterp>) {
  let res = interps.map(x => x.toMteMorphInterp())
  return uniqueJson(res)
}

////////////////////////////////////////////////////////////////////////////////
export function isRegularizedFlowElement(el: AbstractElement) {
  let ret = !(el.localName() === 'orig' && el.parent() && el.parent().localName() === 'choice')
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function iterateCorpusTokens(
  root: AbstractElement,
  elementsOfInterest = new Set(
    ['w_', 'w', 'p', 'lg', 'l', 's', 'div', 'g',
      'sb', 'doc', 'gap', 'coref-split', 'multitoken'])
) {
  return mu((function* () {
    let iterator = traverseDepthGen2(root)
    let pointer = iterator.next()
    while (!pointer.done) {
      let { node, entering } = pointer.value
      if (node.isElement()) {
        let el = node.asElement()
        let name = el.localName()
        if (entering && (name === 'w_' || !isRegularizedFlowElement(el))) {
          // let lang = el.attributeUp('lang')
          // if (lang && lang !== 'uk') {
          //   continue
          // }
          if (name === 'w_') {
            yield { el, entering }
          }
          pointer = iterator.next('skip')
          continue
        }
        if (elementsOfInterest.has(name)) {  // todo
          yield { el, entering }
        }
      }
      pointer = iterator.next()
    }
  })())
}

//------------------------------------------------------------------------------
function findNextToken(el: AbstractElement) {
  return el.nextElementSiblings().find(x => x.localName() === 'w')
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

      let name = el.localName()
      if (name === 'w_' || !isRegularizedFlowElement(el)) {
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
          } else {
            let next = findNextToken(el)
            let [tagAsLemma, tagAsForm] = (el.attribute('as') || '').split('/')  // todo
            let interps = analyzer.tagOrX(tagAsForm || el.attribute('correct') || el.text(), next && next.text())
            if (tagAsLemma) {
              interps.forEach(x => x.lemma = tagAsLemma)
            }
            miw = tagWord(el, tagFunction(interps))
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
function orX(form: string, interps: Array<MorphInterp>) {  // todo
  if (!interps.length) {
    interps = [MorphInterp.fromVesumStr('x', form)]
  }
  return interps
}

////////////////////////////////////////////////////////////////////////////////
export function morphReinterpret(words: Array<AbstractElement>, analyzer: MorphAnalyzer) {
  // let stream = mu(words.map(x => $t(x))).window(3)
  for (let el of words) {
    let token = $t(el)
    let form = token.text()
    let lang = token.elem.lang()
    if (lang && lang !== 'uk') {
      token.onlyInterpAs('x:foreign', form)
    } else {
      let interps = token.getDisambedInterps()
      let next = token.nextToken() && token.nextToken()!.text()

      let curDictInterps: Array<MorphInterp>
      let correctedForm = el.attribute('correct')
      if (correctedForm) {
        curDictInterps = analyzer.tag(correctedForm, next)
        curDictInterps.forEach(x => x.setIsTypo())
      } else {
        curDictInterps = analyzer.tag(form, next)
      }

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
export function morphReinterpretGently(root: AbstractElement, analyzer: MorphAnalyzer) {
  // console.log([...root.evaluateElements('//mi:w_', NS)])
  let tokens = root.evaluateElements('//mi:w_', NS).map(x => $t(x))
  for (let token of tokens) {
    let form = token.text()
    // console.log(form)
    let next = token.nextToken() && token.nextToken()!.text()
    analyzer.tag(form, next).forEach(x => token.assureHasInterp(x.toVesumStr(), x.lemma))
  }
}

////////////////////////////////////////////////////////////////////////////////
export function enumerateWords(root: AbstractElement, attributeName = 'n', idGen = 0) {
  root.evaluateElements('//mi:w_|//w_', NS)  // todo: NS bug
    .forEach(x => x.setAttribute(attributeName, (idGen++).toString()))
  return idGen
}

////////////////////////////////////////////////////////////////////////////////
export function numerateTokensGently(root: AbstractElement, attributeName = 'n') {
  let numbers = mu(root.evaluateAttributes(`//@${attributeName}`))
    .map(x => x.value())
    .filter(x => /^\d+$/.test(x))
    .map(x => Number.parseInt(x))
    .toArray()

  let idGen = Math.max(-1, ...numbers)
  mu(root.evaluateElements('//mi:w_|//w_', NS))  // todo: NS bug
    .toArray()
    .filter(x => x.attribute(attributeName) === undefined || !/^\d+$/.test(x.attribute(attributeName)))
    .forEach(x => x.setAttribute(attributeName, (++idGen).toString()))

  return idGen
}

////////////////////////////////////////////////////////////////////////////////
export function newline2paragraph(root: AbstractElement) {
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
  return !/\s/.test(value)
  // return new RegExp(`^[${WCHAR_UK}]+\.?$`).test(value) || /^\d+$/.test(value)
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
  let wordPairs = Mu.zip(mine.evaluateElements('//mi:w_', NS), theirs.evaluateElements('//mi:w_', NS))
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
  let words = from.evaluateElements(`(//mi:w_)[position() <= ${n}]`, NS)
    .map(x => x.firstElementChild().text())
    .toArray()  //todo
  return words
}

////////////////////////////////////////////////////////////////////////////////
export function sortInterps(root: AbstractElement) {
  for (let miw of root.evaluateElements('//mi:w_', NS).toArray()) {

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
      miw.setAttribute('disamb', miw.elementChildren().toArray().indexOf(disambElem))
    }
  }

  return root
}

////////////////////////////////////////////////////////////////////////////////
export function untag(root: AbstractElement) {
  let doc = root.document()
  for (let miw of root.evaluateElements('//mi:w_', NS).toArray()) {
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
  // let stream = mixml2tokenStream(sourceRoot)
  let attr = !!sourceRoot.evaluateElement(`//mi:w_[@n]`, NS) ? 'n' : 'nn'
  // console.error(`attr`, attr)
  for (let miwSource of sourceRoot.evaluateElements('//mi:w_', NS)) {
    let n = miwSource.attribute(attr)
    let miwDest = destRoot.evaluateElement(`//mi:w_[@${attr}="${n}"]`, NS)
    if (!miwDest) {
      throw new Error('Words are not numerated')
    }
    miwDest.clear()
    let tokenSource = $t(miwSource)
    for (let { lemma, flags } of tokenSource.getDisambedInterps()) {
      let w = miwSource.document().createElement('w').setAttributes({
        ana: flags,
        lemma,
      })
      w.text(tokenSource.text())
      miwDest.appendChild(w)
    }
    // let tokenSource = $t(miwSource).getDisambedInterps()
    // let tokenDest = $t(miwDest)
    // tokenDest.also
    // tokenSource.getDisambedInterps().forEach(({lemma, flags}) => {

    // })

  }
}

////////////////////////////////////////////////////////////////////////////////
export function keepDisambedOnly(root: AbstractElement) {
  root.evaluateElements('//mi:w_', NS).forEach(x => $t(x).keepOnlyDisambed())
}

////////////////////////////////////////////////////////////////////////////////
export function autofixDirtyText(value: string, analyzer?: MorphAnalyzer) {
  let ret = removeInvisibles(value)
    // .replace(/[\xa0]/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/(\s*)\n\s*\n(\s*)/g, '$1\n$2')

  ret = fixLatinMixinGentle(ret)
  if (analyzer) {
    ret = fixLatinMixinDict(ret, analyzer)
  }
  ret = normalizeDiacritics(ret)
  if (analyzer) {
    ret = removeRenderedHypenation(ret, analyzer)
  }
  ret = ret.trim()

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
    } else if (removeElems.has(el.localName())) {
      el.remove()
    } else if (el.localName() === 'em') {
      let box = el.document().createElement('emph').setAttribute('rend', 'italic')
      el.rewrap(box)
    }
  })

  for (let textNode of root.evaluateNodes('//text()', NS)) {
    let res = autofixDirtyText(textNode.text(), analyzer)
    if (res) {
      textNode.replace(doc.createTextNode(res))
    }
  }

  // todo:
  // if orig has >2 words
  // invisible spaces, libxmljs set entities
}

////////////////////////////////////////////////////////////////////////////////
const MULTISEP = '|'
const teiStructuresToCopy = makeObject(['s', 'p', 'l', 'lg', 'div']
  .map(x => [x, x] as [string, string]))
// todo: fix namespace problem
function element2sketchVertical(el: AbstractElement, entering: boolean, interps?: Array<MorphInterp>) {
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
      let ud = mergeAmbiguityFeaturewise(token.interps.map(x => interp2udVertFeatures(x)))
      return tsvLine(token.form, lemmas, mteTags, mivesumFlagss, ...ud)
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
    let attributes = token.getAttributes()
    if (attributes) {
      return `<${tagName} ${keyvalue2attributesNormalized(attributes)}>`
    }
    return `<${tagName}>`
  }
  throw new Error('Unknown token')
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenizedMixml2sketchVertical(
  root: AbstractElement, analyzer: MorphAnalyzer, meta: any = {}) {

  yield `<doc ${xmlutils.keyvalue2attributesNormalized(meta)}>`

  for (let { el, entering } of iterateCorpusTokens(root)) {
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
  yield* mu(mixml2tokenStream(root)).map(x => token2sketchVertical(x))
  yield `</doc>`
}

////////////////////////////////////////////////////////////////////////////////
export function* interpretedTeiDoc2sketchVerticalTokens(root: AbstractElement) {
  for (let { el, entering } of iterateCorpusTokens(root)) {
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
function tsvLine(...values: Array<string>) {
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
export function oldMteDisamb2mivesum(root: AbstractElement) {
  for (let w of root.evaluateElements('//tei:w', NS)) {
    let form = w.text()
    let mte = w.attribute('ana')
    let vesum = MorphInterp.fromMte(mte, form).toVesumStr()
    w.setAttribute('ana', vesum)
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

const structureElementName2type = new Map<string, Structure>([
  ['doc', 'document'],
  ['div', 'div'],
  ['p', 'paragraph'],
  ['lg', 'stanza'],
  ['l', 'line'],
  ['gap', 'gap'],
  ['coref-split', 'coref-split'],
  ['multitoken', 'multitoken'],
  // ['', ''],
])

////////////////////////////////////////////////////////////////////////////////
export function* mixml2tokenStream(root: AbstractElement, sentenceSetSchema?: string) {
  for (let { el, entering } of iterateCorpusTokens(root)) {
    let name = el.localName()

    let structureType = structureElementName2type.get(name)
    if (structureType) {
      yield Token.structure(structureType, !entering, el.attributesObj())
      continue
    }

    if (entering) {
      let tok: Token
      switch (name) {
        case 'w_': {
          let t = $t(el)
          let interps = t.disambedOrDefiniteInterps()
          tok = new Token().setAttributes(el.attributesObj())

          if (interps.length) {
            tok.setForm(t.text())
              .addInterps(interps.map(x => MorphInterp.fromVesumStr(x.flags, x.lemma)))
          } else {
            tok.setForm(t.text())
              .addInterp(MorphInterp.fromVesumStr('x', t.text()))
          }
          break
        }
        case 'w': {
          tok = new Token().setForm(el.text())
          if (el.attribute('ana')) {
            tok.addInterp(
              MorphInterp.fromVesumStr(el.attribute('ana'), el.attribute('lemma')))
          }
          break
        }
        case 's':  // todo
        case 'sb':  // todo
          tok = Token.structure('sentence', true)
          let attributes = el.attributesObj()
          if (sentenceSetSchema === '') {
            // attributes.set = el.attributeUp('dataset')
          } else if (sentenceSetSchema) {
            // let attrName = `dataset-${sentenceSetSchema}`
            // attributes.set = el.attributeUp(attrName)
          }
          tok.setAttributes(attributes)
          break
        case 'g':
          yield Token.glue()
          continue
        default:
          continue
      }

      let id = el.attribute('id')
      // console.log(id)
      if (id) {
        tok.id = id
      }

      if (name === 'w_') {
        let depsStr = el.attribute('dep')
        if (depsStr) {
          clusterize(parseDepStr(depsStr), x => HELPER_RELATIONS.has(x.relation), [tok.deps, tok.helperDeps])
        }

        let edepsStr = el.attribute('edep')
        if (edepsStr) {
          tok.edeps = parseDepStr(edepsStr)
        }

        let corefStr = el.attribute('coref')
        if (corefStr) {
          tok.corefs = corefStr.split('|')
            .map(x => x.split('-'))
            .map(([head, type]) => ({
              headId: head,
              type: type as CoreferenceType,
            }))
        }

        tok.tags.addAll((el.attribute('tags') || '')
          .split(/\s+/g).filter(x => x) as Iterable<TokenTag>)
        tok.tags.addAll((el.attribute('comment') || '')
          .split(/\s+/g)
          .filter(x => x.startsWith('#'))
          .map(x => x.substr(1)) as Iterable<TokenTag>)

        // todo: attributeDefault
      }

      yield tok
    }
  }
}

//------------------------------------------------------------------------------
function parseDepStr(value: string) {
  return value.split('|')
    .map(x => x.split('-'))
    .map(([headId, relation]) => ({ headId, relation }))
}

////////////////////////////////////////////////////////////////////////////////
export function* splitNSentences(stream: Iterable<Token>, n: number) {
  let i = 0
  let buf = new Array<Token>()
  let wasSentEnt = false
  for (let token of stream) {
    buf.push(token)
    if (!wasSentEnt && token.isSentenceBoundary()) {
      if (++i >= n) {
        yield buf
        buf = []
        i = 0
      }
      wasSentEnt = true
    } else {
      if (token.isWord()) {
        wasSentEnt = false
      }
    }
  }
  if (buf.length) {
    yield buf
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2cg(stream: Iterable<Token>) {
  for (let tok of stream) {
    if (tok.isWord()) {
      yield `"<${tok.form}>"\n`
        + tok.interps.map(x => `\t"${x.lemma}" ${x.toVesum().join(' ')}\n`).join('')
    } else if (tok.isStructure()) {
      if (tok.isSentenceBoundary()) {
        yield `"<$>"\n\n`
      }
      // yield tok.toString()
    } else {
      // console.log(tok)
      // throw new Error(`Not possible`)
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2plaintext(
  stream: Iterable<Token>,
  multitokens: Array<MultitokenDescriptor> = [],
  corrected = true
) {
  let space = ''
  let multitokenI = 0
  for (let [i, token] of mu(stream).entries()) {
    if (token.isGlue()) {
      space = ''
    } else if (token.getStructureName() === 'paragraph') {  // todo
      space = '\n'
    } else if (token.isWord()) {
      if (multitokenI < multitokens.length) {
        let mt = multitokens[multitokenI]
        if (i < mt.startIndex) {
          yield space + token.getForm(corrected)
        } else {
          if (i === mt.startIndex + mt.spanLength - 1) {
            ++multitokenI
          }
          if (i === mt.startIndex) {
            yield space + mt.form
          }
        }
      } else {
        yield space + token.getForm(corrected)
      }
      space = token.gluedNext ? '' : ' '
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function tokenStream2plaintextString(stream: Iterable<Token>) {
  return mu(tokenStream2plaintext(stream)).join('')
}

////////////////////////////////////////////////////////////////////////////////
export interface MultitokenDescriptor {
  form: string
  startIndex: number
  spanLength: number
}
////////////////////////////////////////////////////////////////////////////////
export function* tokenStream2sentences(stream: Iterable<Token>) {
  let buf = new Array<Token>()
  let multitokens = new Array<MultitokenDescriptor>()
  let curDoc: Token
  let curPar: Token
  let nextPar: Token
  let sentenceId: string
  let dataset: string

  let opensParagraph = false
  let followsGap = false
  let skip = false  // todo: gap

  const makeYield = () => {
    initLocalHeadIndexes(buf, sentenceId)
    let nodes = sentenceArray2treeNodes(buf)
    let ret = {
      sentenceId,
      tokens: buf,
      multitokens,
      nodes,
      dataset,
      document: curDoc,
      paragraph: curPar,
    }

    buf = []
    multitokens = []
    followsGap = false
    skip = false

    return ret
  }

  for (let token of stream) {
    if (token.getStructureName() === 'paragraph') {
      if (!token.isClosing()) {
        nextPar = token
        opensParagraph = true
      }
    } else if (token.getStructureName() === 'document') {
      if (token.isClosing() && buf.length && !skip) {
        yield makeYield()
        // throw new Error(`No sentence boundary at the end of document ${currenctDocument.id}`)
      }
      if (!token.isClosing()) {
        curDoc = token
      }
    } else if (token.getStructureName() === 'multitoken') {
      if (token.isClosing()) {
        last(multitokens).spanLength = buf.length - last(multitokens).startIndex
      } else {
        multitokens.push({
          form: token.getAttribute('form'),
          startIndex: buf.length,
          spanLength: 0,
        })
      }
    } else if (token.isSentenceBoundary()) {
      if (token.hasTag('skip' as any)) {
        skip = true
      }

      if (buf.length && !skip) {
        yield makeYield()
      }
      sentenceId = token.id
      dataset = token.getAttribute('set') || dataset
    } else if (token.isWord()) {
      token.getAttributes()
      token.opensParagraph = opensParagraph
      opensParagraph = false
      curPar = nextPar
      buf.push(token)
    } else if (token.isGlue() && buf.length) {
      rfind(buf, x => !x.isElided()).gluedNext = true
    } else if (token.getStructureName() === 'gap') {
      followsGap = true
    }
  }

  if (buf.length && !skip) {
    yield makeYield()
  }
}

//------------------------------------------------------------------------------
function initLocalHeadIndexes(sentence: Array<Token>, sentenceId: string) {
  let id2i = new Map(sentence.map<[string, number]>((x, i) => [x.id, i]))
  for (let [i, token] of sentence.entries()) {
    token.index = i
    for (let deps of [token.deps, token.edeps]) {
      for (let dep of deps) {
        dep.headIndex = id2i.get(dep.headId)
        if (dep.headIndex === undefined) {
          throw new Error(`head outside a sentence #${sentenceId} token #${token.getAttribute('id')}`)
        }
      }
    }
  }
}

//------------------------------------------------------------------------------
function sentenceArray2treeNodes(sentence: Array<Token>) {
  let nodeArray = sentence.map(x => new GraphNode(x))
  for (let i = 0; i < nodeArray.length; ++i) {
    for (let { headIndex } of sentence[i].deps) {
      nodeArray[i].parents.push(nodeArray[headIndex])
      nodeArray[headIndex].children.push(nodeArray[i])
    }
  }

  return nodeArray
}

////////////////////////////////////////////////////////////////////////////////
const miXmlFormatter = new XmlFormatter({
  preferSpaces: true,
  tabSize: 2,
})

export function serializeMiDocument(root: AbstractElement, prettify = false) {
  root.evaluateElements('//*').forEach(x => sortAttributes(x))

  let ret = root.serialize()
  if (prettify) {
    ret = miXmlFormatter.format(ret)
  }
  ret += '\n'

  return ret
}


//------------------------------------------------------------------------------
const ATTR_ORDER = arr2indexObj(['id', 'dep', 'tags', 'lemma', 'anna', 'mark'], 1)
function sortAttributes(element: AbstractElement) {
  let attributes = Object.entries(element.attributesObj()).sort(([a], [b]) => {
    return (ATTR_ORDER[a] || 100) - (ATTR_ORDER[b] || 100) || a.localeCompare(b)
  })
  attributes.forEach(([key]) => element.removeAttribute(key))
  attributes.forEach(([key, value]) => element.setAttribute(key, value))
}
