import {
  LETTER_UK_UPPERCASE, LETTER_UK_LOWERCASE, WCHAR_UK,
  WCHAR_OTHER, WORDCHAR_UK_RE
} from '../nlp/static'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { last, r } from '../lang'
import { tokenizeUk } from '../nlp/utils'

import { mu } from '../mu'
import { uniformSubarray, numericCompare } from '../algo'
import * as he from 'he'
import { isTitlecase, anyReLiteral } from '../string'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { Dawg } from 'dawgjs'



//------------------------------------------------------------------------------
const lengthThreshold = 60000
const ukSpecLettersRe = /[ґїєі]/i
const ruSpecLettersRe = /[эёъы]/i
const beSpecLettersRe = /[ў]/i
const previewAbruptRe = /(…|\.{3,})[)\]]?\s*((читати|дізнатися) більше|\|\s*детальніше|(Читати|Показати) повністю)?\s*$/i
const caseCollisionRe = new RegExp(
  `[${LETTER_UK_UPPERCASE}A-Z] [${LETTER_UK_UPPERCASE}A-Z]{4}[${LETTER_UK_LOWERCASE}a-z]{2}`)
const spacedWordRe = new RegExp(`(^| )([a-z${WCHAR_UK}${WCHAR_OTHER}] ){4}`, 'i')

//------------------------------------------------------------------------------
const regsRejectingParagraph: Array<[RegExp, string]> = [
  [spacedWordRe, `long single-char word repeating`],
  [/([^0)])\1{4}/, `long char repeating`],
  [/Этот e-mail адрес защищен от спам-ботов|Переведено сервисом/, 'ru junk'],
  [caseCollisionRe, 'case collision'],
  [/\[\s*детальніше\s*\]/i, 'preview button'],
  [/\[\s*читати далі...\s*\]/i, 'preview button'],
  // [,],
]

//------------------------------------------------------------------------------
const regsRejectingDoc: Array<[RegExp, string]> = [
  [/[Ђћџ]/, `possible encoding error`],
  [/\[(\w+)\][^[]*\[\/\1\]/i, 'bb code'],
  [/\[\[\s*{{\w+:[^}]*}}\s*:\s*.*\]\]/, 'wiki code'],
]

//------------------------------------------------------------------------------
const wordsRejectingDocRe = new RegExp(`^(${[
  'ьй',
  'ьм',
].join('')})$`, 'i')

//------------------------------------------------------------------------------
const functionsKillingParagraph: Array<[(p: string) => boolean, string]> = [
  [p => ruSpecLettersRe.test(p) && !ukSpecLettersRe.test(p), `ru but not uk`],
  [p => beSpecLettersRe.test(p) && !ukSpecLettersRe.test(p), `be but not uk`],
  // [p => ,],
]

//------------------------------------------------------------------------------
const stringsRejectingDocRe = anyReLiteral([
  'указанньїх',
  '�',
  '[quote="',
  'page={{',
  '[[Special:',
  '',
  'ĖĊ',
  'в҆я',
])

//------------------------------------------------------------------------------
const stringsRejectingParagraph = [
  'електронна адреса захищена від спам-ботів. вам потрібно увімкнути JavaScript',
  'Потрібно включити	javascript',
  'Ця сторінка використовує	JavaScript',
  'Этот e-mail адрес защищен от спам-ботов',
  'Переведено сервисом',
  'Ваш броузер застарів',
  // 'головна :: про автора',
  ' :: ',
  '</embed></object>',
  '',
  'class="wikitable"',
  '[[File:',
  '[[Media:',
  'Текстовый документ',
  'скажите пожалуйста',
  // '',
].map(x => x.toLowerCase())

//------------------------------------------------------------------------------
const titleRegsRejectingDoc = [
  /^Перегляд вихідного коду сторінки/,
  /�/,
  /\\"/,
]

//------------------------------------------------------------------------------
const urlRegsRejectingDoc = [
  /�/,
]

//------------------------------------------------------------------------------
const urlsRejectingDoc = anyReLiteral([
  r`http://om.net.ua/14/14_9/14_9006_J--motivatsionnie-sostoyaniya.html`,
])

//------------------------------------------------------------------------------
const defaultOptions = {
  filterPreviews: true,
}

////////////////////////////////////////////////////////////////////////////////
export class ZvisusilDocFilter {
  private ruLexicon: Dawg<string>

  constructor(
    private analyzer = createMorphAnalyzerSync(),
    private options = defaultOptions,
  ) {
  }

  setRuLexicon(ruLexicon: Dawg<string>) {
    this.ruLexicon = ruLexicon
    return this
  }

  setOptions(options = defaultOptions) {
    this.options = options
    return this
  }

  filter(
    paragraphs: Array<string>,
    meta: any,
  ) {
    let filteredParagraphs = new Array<string>()
    let gapFollowerIndexes = new Array<number>()

    let { docValid, filteredIndexes, message } = filterParagraphedDoc(
      paragraphs, meta, this.analyzer, this.options)

    if (!docValid) {
      return { docValid, filteredIndexes, filteredParagraphs, gapFollowerIndexes, message }
    }

    let ii = 0
    filteredIndexes.sort(numericCompare)
    for (let i = 0; i < paragraphs.length; ++i) {
      if (i === filteredIndexes[ii]) {
        if (!gapFollowerIndexes.length
          || last(gapFollowerIndexes) !== filteredParagraphs.length
        ) {
          gapFollowerIndexes.push(filteredParagraphs.length)
        }
        ++ii
        continue
      }
      filteredParagraphs.push(paragraphs[i])
    }

    return { docValid, filteredIndexes, filteredParagraphs, gapFollowerIndexes, message }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function filterParagraphedDoc(
  pp: Array<string>,
  meta: any,
  analyzer: MorphAnalyzer,
  options = defaultOptions,
) {
  if (meta) {
    if (meta.title) {
      for (let re of titleRegsRejectingDoc) {
        if (re.test(meta.title)) {
          return invalidDoc(`killed by title regex: ${re.source}`)
        }
      }
    }
    if (meta.url) {
      for (let re of urlRegsRejectingDoc) {
        if (re.test(meta.url)) {
          return invalidDoc(`killed by url regex: ${re.source}`)
        }
      }
      var match = meta.url.match(urlsRejectingDoc)
      if (match) {
        return invalidDoc(`killed by url regex: ${match[0]}`)
      }
    }
  }

  let filtered = new Array<number>()
  let internalHypens = new Array<string>()

  ploop:
  for (let i = 0; i < pp.length; ++i) {
    let p = pp[i]

    // reject by substr
    match = p.match(stringsRejectingDocRe)
    if (match) {
      return invalidDoc(`doc rejected by substring: ${match[0]}`, filtered)
    }

    // reject by regex
    for (let [re, message] of regsRejectingDoc) {
      if (re.test(p)) {
        return invalidDoc(message, filtered)
      }
    }

    let naiveSplit = tokenizeUk(pp[i]).map(x => x.token)
    internalHypens.push(...findInternalHypenations(naiveSplit, analyzer))
    if (internalHypens.length > 1) {
      return invalidDoc(`Too many internal hypens ${internalHypens}`, filtered)
    }

    let stopword = naiveSplit.find(x => wordsRejectingDocRe.test(x))
    if (stopword) {
      return invalidDoc(`met stopword "${stopword}"`, filtered)
    }

    if (p.length > lengthThreshold) {
      reportRmPar(i, pp[i], `longer than ${lengthThreshold} chars (${p.length})`)
      filtered.push(i)
      continue ploop
    }

    if (options.filterPreviews && i + 3 < pp.length) {
      if ([p, pp[i + 1], pp[i + 2]].every(x => previewAbruptRe.test(x))) {
        for (let i2 = i; i2 < pp.length && previewAbruptRe.test(pp[i2]); ++i2) {
          reportRmPar(i, pp[i2], `preview`)
          filtered.push(i2)
          ++i
        }
        continue ploop
      }
    }

    for (let [f, message] of functionsKillingParagraph) {
      if (f(pp[i])) {
        reportRmPar(i, pp[i], message)
        filtered.push(i)
        continue ploop
      }
    }

    for (let [re, message] of regsRejectingParagraph) {
      if (re.test(p)) {
        reportRmPar(i, p, message)
        filtered.push(i)
        continue ploop
      }
    }

    for (let substr of stringsRejectingParagraph) {
      if (p.toLowerCase().includes(substr)) {
        reportRmPar(i, p, `killed by substring: ${substr}`)
        filtered.push(i)
        continue ploop
      }
    }

    let prepared = pp[i].replace(/&\s*(\S+)\s*;/g, '&$1;')
    let unescaped = he.unescape(prepared)
    if (unescaped.length !== prepared.length) {
      reportRmPar(i, p, 'html markup')
      filtered.push(i)
      continue ploop
    }

    let isSuspicious = [ruSpecLettersRe, /[ђњџћүө¤≥]/].some(x => x.test(pp[i]))
    if (isSuspicious) {
      let numNondict = mu(naiveSplit).count(x => !analyzer.tag(x).length)
      if (numNondict / naiveSplit.length > 0.06) {
        reportRmPar(i, pp[i], `out-of-dict threshold: ${numNondict}/${naiveSplit.length}`)
        filtered.push(i)
        continue ploop
      }
    } else {
      let sample = uniformSubarray(naiveSplit, 0.1)
      let numNondict = mu(sample).count(x => !analyzer.tag(x).length)
      if (numNondict / sample.length > 0.23) {
        let unknowns = mu(naiveSplit).filter(x => !analyzer.tag(x).length).toArray()
        if (unknowns.length / naiveSplit.length > 0.23) {
          let unknownsOfUkLetters = unknowns.filter(x => WORDCHAR_UK_RE.test(x))
          if (unknownsOfUkLetters.length / unknowns.length < 0.9) {
            reportRmPar(i, pp[i], `out-of-dict soft threshold`)
            filtered.push(i)
            continue ploop
          }
        }
      }
    }
  }

  return { docValid: true, filteredIndexes: filtered, message: 'ok' }
}

//------------------------------------------------------------------------------
function invalidDoc(message: string, filteredIndexes: Array<number> = []) {
  return {
    docValid: false,
    filteredIndexes,
    message,
  }
}

//------------------------------------------------------------------------------
function reportRmPar(i: number, p: string, reason: string) {
  // console.error(`✖️  ${i}\t ${reason} \t ∎ ${p}\n`)
}

//------------------------------------------------------------------------------
function reportRmDoc(reason: string) {
  // console.error(`👎 removing doc: ${reason}`)
}

//------------------------------------------------------------------------------
function findInternalHypenations(tokens: Array<string>, analyzer: MorphAnalyzer) {
  return mu(tokens).window(3).filter(([l, m, r]) =>
    (m === '-' || m === '¬')
    && l
    && r
    && l.toLowerCase() !== r.toLowerCase()
    && !(isTitlecase(l) && isTitlecase(r))
    && !analyzer.hasInterps(l + m + r)
    && !['улю-лю', 'ку-рі', 'кіо-кушинкай', 'офф-лайн'].includes((l + m + r).toLowerCase())
    && !analyzer.hasInterps(l)
    && !analyzer.hasInterps(r)
    && analyzer.hasInterps(l + r)
  ).map(x => x.join(''))
}
