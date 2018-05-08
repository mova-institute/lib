import { LETTER_UK_UPPERCASE, LETTER_UK_LOWERCASE, WCHAR_UK, WCHAR_OTHER, WORDCHAR_UK_RE } from '../nlp/static'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { last, r } from '../lang'
import { tokenizeUkNew, tokenizeUk } from '../nlp/utils'

import { mu } from '../mu'
import { uniformSubarray2, uniformSubarray, deleteIndexes, numericCompare } from '../algo'
import * as he from 'he'
import { isTitlecase } from '../string_utils'


const lengthThreshold = 60000
const ukSpecLettersRe = /[ґїєі]/i
const ruSpecLettersRe = /[эёъы]/i
const beSpecLettersRe = /[ў]/i
const previewAbruptRe = /(…|\.{3,})[)\]]?\s*((читати|дізнатися) більше|\|\s*детальніше|(Читати|Показати) повністю)?\s*$/i
const caseCollisionRe = new RegExp(
  `[${LETTER_UK_UPPERCASE}A-Z] [${LETTER_UK_UPPERCASE}A-Z]{4}[${LETTER_UK_LOWERCASE}a-z]{2}`)
const spacedWordRe = new RegExp(`(^| )([a-z${WCHAR_UK}${WCHAR_OTHER}] ){4}`, 'i')

const regexesKillingParagraph: [RegExp, string][] = [
  [spacedWordRe, `long single-char word repeating`],
  [/([^0)])\1{4}/, `long char repeating`],
  [/Этот e-mail адрес защищен от спам-ботов|Переведено сервисом/, 'ru junk'],
  [caseCollisionRe, 'case collision'],
  [/\[\s*детальніше\s*\]/i, 'preview button'],
  [/\[\s*читати далі...\s*\]/i, 'preview button'],
  // [,],
]

const regexesKillingDoc: [RegExp, string][] = [
  [/[Ђћџ]/, `possible encoding error`],
  [/\[(\w+)\][^[]*\[\/\1\]/i, 'bb code'],
]

const wordsKillingDocRe = new RegExp(`^(${[
  'ьй',
  'ьм',
].join('')})$`, 'i')

const functionsKillingParagraph: [(p: string) => boolean, string][] = [
  [p => ruSpecLettersRe.test(p) && !ukSpecLettersRe.test(p), `ru but not uk`],
  [p => beSpecLettersRe.test(p) && !ukSpecLettersRe.test(p), `be but not uk`],
  // [p => ,],
]

const substringsKillingDoc = [
  'указанньїх',
  '�',
  '[quote="',
  'page={{',
  '[[Special:',
]

const substringsKillingParagrph = [
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
  // '',
].map(x => x.toLowerCase())

const titleRegsKillingDoc = [
  /^Перегляд вихідного коду сторінки/,
  /�/,
  /\\"/,
]

const urlsRegsKillingDoc = [
  /�/,
]

const urlsKillingDoc = new RegExp([
  r`http://om.net.ua/14/14_9/14_9006_J--motivatsionnie-sostoyaniya.html`,
].join('|'))

const defaultOptions = {
  filterPreviews: true,
}

////////////////////////////////////////////////////////////////////////////////
export function filterParagraphedDoc(
  pp: string[],
  meta: any,
  analyzer: MorphAnalyzer,
  options = defaultOptions,
) {
  if (meta) {
    if (meta.title) {
      for (let re of titleRegsKillingDoc) {
        if (re.test(meta.title)) {
          reportRmDoc(`killed by title regex: ${re.source}`)
          return { docValid: false, filteredIndexes: [] }
        }
      }
    }
    if (meta.url) {
      for (let re of urlsRegsKillingDoc) {
        if (re.test(meta.url)) {
          reportRmDoc(`killed by url regex: ${re.source}`)
          return { docValid: false, filteredIndexes: [] }
        }
      }
    }
    if (urlsKillingDoc.test(meta.url)) {
      return { docValid: false, filteredIndexes: [] }
    }
  }

  let filtered = new Array<number>()
  let internalHypens = new Array<string>()

  let before = pp.slice()
  ploop:
  for (let i = 0; i < pp.length; ++i) {
    let p = pp[i]

    for (let s of substringsKillingDoc) {
      if (p.includes(s)) {
        reportRmDoc(`killed by substring: ${s}`)
        return { docValid: false, filteredIndexes: filtered }
      }
    }

    for (let [re, message] of regexesKillingDoc) {
      if (re.test(p)) {
        reportRmDoc(message)
        return { docValid: false, filteredIndexes: filtered }
      }
    }

    let naiveSplit = mu(tokenizeUk(pp[i]))
      .map(x => x.token)
      .toArray()

    internalHypens.push(...findInternalHypenations(naiveSplit, analyzer))
    if (internalHypens.length > 1) {
      reportRmDoc(`Too many internal hypens ${internalHypens}`)
      return { docValid: false, filteredIndexes: filtered }
    }

    let stopword = naiveSplit.find(x => wordsKillingDocRe.test(x))
    if (stopword) {
      reportRmDoc(`met "${stopword}"`)
      return { docValid: false, filteredIndexes: filtered }
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

    for (let [re, message] of regexesKillingParagraph) {
      if (re.test(p)) {
        reportRmPar(i, p, message)
        filtered.push(i)
        continue ploop
      }
    }

    for (let substr of substringsKillingParagrph) {
      if (p.toLowerCase().includes(substr)) {
        reportRmPar(i, p, `killed by substring: ${substr}`)
        filtered.push(i)
        continue ploop
      }
    }

    let prepared = pp[i].replace(/&\s*(\S+)\s*;/g, '&$1;')
    let unescaped = he.unescape(prepared)
    if (unescaped.length != prepared.length) {
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

  return { docValid: true, filteredIndexes: filtered }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function reportRmPar(i: number, p: string, reason: string) {
  console.error(`✖️  ${i}\t ${reason} \t ∎ ${p}\n`)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function reportRmDoc(reason: string) {
  console.error(`👎 removing doc: ${reason}`)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function findInternalHypenations(tokens: string[], analyzer: MorphAnalyzer) {
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


////////////////////////////////////////////////////////////////////////////////
export function filterTokenizedParagraphs(pp: string[][], analyzer: MorphAnalyzer) {

}

////////////////////////////////////////////////////////////////////////////////
export function filterParagraphedDocExtra(
  paragraphs: string[],
  meta: any,
  analyzer: MorphAnalyzer,
  options = defaultOptions,
) {
  let filteredParagraphs = new Array<string>()
  let gapFollowerIndexes = new Array<number>()

  let { docValid, filteredIndexes } = filterParagraphedDoc(paragraphs, meta, analyzer, options)
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
