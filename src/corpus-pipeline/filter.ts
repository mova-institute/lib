import { LETTER_UK_UPPERCASE, LETTER_UK_LOWERCASE, WCHAR_UK, WCHAR_OTHER, WORDCHAR_UK_RE } from "../nlp/static"
import { MorphAnalyzer } from "../nlp/morph_analyzer/morph_analyzer"
import { last } from "../lang"
import { tokenizeUkNew, tokenizeUk } from "../nlp/utils"

import { mu } from "../mu"
import { uniformSubarray2, uniformSubarray, deleteIndexes, numericCompare } from "../algo"
import * as he from "he";


const lengthThreshold = 60000
const ukSpecLettersRe = /[ґїєі]/i
const ruSpecLettersRe = /[эёъы]/i
const beSpecLettersRe = /[ў]/i
const previewAbruptRe = /(…|\.{3,})[)\]]?\s*(читати більше|\|\s*детальніше)?\s*$/i
const caseCollisionRe = new RegExp(
  `[${LETTER_UK_UPPERCASE}A-Z] [${LETTER_UK_UPPERCASE}A-Z]{4}[${LETTER_UK_LOWERCASE}a-z]{2}`)
const spacedWordRe = new RegExp(`(^| )([a-z${WCHAR_UK}${WCHAR_OTHER}] ){4}`, 'i')

const regexesKillingParagraph: [RegExp, string][] = [
  [spacedWordRe, `long single-char word repeating`],
  [/([^0)])\1{4}/, `long char repeating`],
  [/Этот e-mail адрес защищен от спам-ботов|Переведено сервисом/, 'ru junk'],
  [caseCollisionRe, 'case collision'],
  // [,],
]
const regexesKillingDoc: [RegExp, string][] = [
  [/[Ђћџ]/, `possible encoding error`],
]
const functionsKillingParagraph: [(p: string) => boolean, string][] = [
  [p => ruSpecLettersRe.test(p) && !ukSpecLettersRe.test(p), `ru but not uk`],
  [p => beSpecLettersRe.test(p) && !ukSpecLettersRe.test(p), `be but not uk`],
  // [p => ,],
]

const substringsKillingParagrph = [
  'електронна адреса захищена від спам-ботів. вам потрібно увімкнути JavaScript',
  'Этот e-mail адрес защищен от спам-ботов',
  'Переведено сервисом'
].map(x => x.toLowerCase())

const defaultOptions = {
  filterPreviews: true,
}

////////////////////////////////////////////////////////////////////////////////
export function filterPlainParagraphs(
  pp: string[],
  analyzer: MorphAnalyzer,
  options = defaultOptions,
) {
  let filtered = new Array<number>()

  let before = pp.slice()
  ploop:
  for (let i = 0; i < pp.length; ++i) {
    let p = pp[i]

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

    for (let [re, message] of regexesKillingParagraph) {
      if (re.test(p)) {
        reportRmPar(i, p, message)
        filtered.push(i)
        continue ploop
      }
    }

    for (let substr of substringsKillingParagrph) {
      if (p.toLowerCase().includes(substr)) {
        reportRmPar(i, p, 'substring trigger')
        filtered.push(i)
        continue ploop
      }
    }

    for (let [re, message] of regexesKillingDoc) {
      if (re.test(p)) {
        reportRmDoc(i, p, message)
        return { docValid: false, filteredIndexes: filtered }
      }
    }

    let unescaped = he.unescape(pp[i])
    if (unescaped.length != pp[i].length) {
      reportRmPar(i, p, 'html markup')
      filtered.push(i)
      continue ploop
    }


    let naiveSplit = mu(tokenizeUk(pp[i]))
      .map(x => x.token)
      .toArray()
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

  return { docValid: true, filteredIndexes: filtered }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function reportRmPar(i: number, p: string, reason: string) {
  console.error(`✖️  ${i}\t ${reason} \t ∎ ${p}\n`)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function reportRmDoc(i: number, p: string, reason: string) {
  console.error(`👎 removing doc ${i}: ${reason.toUpperCase()}`)
  console.error(`\t${p/* .substr(0, 100) */}`)
}


////////////////////////////////////////////////////////////////////////////////
export function filterTokenizedParagraphs(pp: string[][], analyzer: MorphAnalyzer) {

}

////////////////////////////////////////////////////////////////////////////////
export function filterPlainParagraphsExtra(
  paragraphs: string[],
  analyzer: MorphAnalyzer,
  options = defaultOptions,
) {
  let filteredParagraphs = new Array<string>()
  let gapFollowerIndexes = new Array<number>()

  let { docValid, filteredIndexes } = filterPlainParagraphs(paragraphs, analyzer, options)
  if (!docValid) {
    return { docValid, filteredIndexes, filteredParagraphs, gapFollowerIndexes }
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

  return { docValid, filteredIndexes, filteredParagraphs, gapFollowerIndexes }
}
