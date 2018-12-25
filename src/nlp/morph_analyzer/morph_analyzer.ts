import * as flatten from 'lodash.flatten'

import { mu, Mu } from '../../mu'
import { Dictionary } from '../dictionary/dictionary'
import { MorphInterp } from '../morph_interp'
import { Case, Pos, Gender } from '../morph_features'
import {
  FOREIGN_RE, WCHAR_UK_UPPERCASE, ANY_PUNC_OR_DASH_RE, LETTER_UK_UPPERCASE,
  LETTER_UK_LOWERCASE, APOSTROPES_REPLACE_RE, URL_RE, ARABIC_NUMERAL_RE, ROMAN_NUMERAL_RE,
  SYMBOL_RE, EMAIL_RE, LITERAL_SMILE_RE, EMOJI_RE, SMILE_RE, INTERJECTION_RE,
  NUMERAL_PREFIXED_TOKEN_RE, DOMAIN_AS_NAME_RE,
} from '../static'

import { HashSet } from '../../data_structures'
import * as algo from '../../algo'
import { CachedValue } from '../../cached_value'
import { parseIntStrict } from '../../lang'
import * as stringUtils from '../../string'
import * as Lru from 'lru-cache'


const dictOverride = new Map([
  ['"', ['punct:quote:open', 'punct:quote:close']],
  ['«', ['punct:quote:open']],
  ['»', ['punct:quote:close']],
  ['“', ['punct:quote:open']],
  ['”', ['punct:quote:close']],
  ['…', ['punct:ellipsis']],
  ['...', ['punct:ellipsis']],
  ['-', ['punct:hyphen', 'punct:dash', 'punct:ndash']],
  ['–', ['punct:hyphen', 'punct:dash', 'punct:ndash']],
  ['—', ['punct:hyphen', 'punct:dash', 'punct:ndash']],
  // ['', ['']],
])
const adHocDict = new Map([
  ['ні', [['ні', 'verb:imperf:pres:neg']]],
  // ['', ['']],
])

const CASES = [
  'v_naz',
  'v_rod',
  'v_dav',
  'v_zna',
  'v_oru',
  'v_mis',
  'v_kly',
]

const INITIALS_INTERPS = [
  ...CASES.map(x => `noun:anim:m:${x}:prop:fname:nv:abbr`),
  ...CASES.map(x => `noun:anim:f:${x}:prop:fname:nv:abbr`),
  ...CASES.map(x => `noun:anim:m:${x}:prop:patr:nv:abbr`),
  ...CASES.map(x => `noun:anim:f:${x}:prop:patr:nv:abbr`),
]

const MASC_NONINFL_PARADIGM = CASES.map(x => `m:${x}:nv`)
// const MASC_NOUN_NONINFL_PARADIGM = CASES.map(x => `noun:inanim:m:${x}:nv`)
const FEM_NONINFL_PARADIGM = CASES.map(x => `f:${x}:nv`)
// const FEM_NOUN_NONINFL_PARADIGM = CASES.map(x => `noun:inanim:f:${x}:nv`)
const NEUT_NONINFL_PARADIGM = CASES.map(x => `n:${x}:nv`)
// const NEUT_NOUN_NONINFL_PARADIGM = CASES.map(x => `noun:inanim:n:${x}:nv`)
const PLUR_NONINFL_PARADIGM = CASES.map(x => `p:${x}:nv`)
// const PLUR_NOUN_NONINFL_PARADIGM = CASES.map(x => `noun:inanim:p:${x}:nv`)
const PLUR_TANTUM_NONINFL_PARADIGM = PLUR_NONINFL_PARADIGM.map(x => `${x}:ns`)



const NONINFL_PARADIGM = [
  ...MASC_NONINFL_PARADIGM,
  ...FEM_NONINFL_PARADIGM,
  ...NEUT_NONINFL_PARADIGM,
  ...PLUR_NONINFL_PARADIGM,
]

const NONIFL_NOUN_PARADIGM = NONINFL_PARADIGM.map(x => `noun:inanim:${x}`)
const NONIFL_ADJ_PARADIGM = NONINFL_PARADIGM.map(x => `adj:${x}`)

const NONIFL_ARABIC_CARDINAL_PARADIGM_1 = NONINFL_PARADIGM.map(x => `numr:${x}`)
const NONIFL_ARABIC_CARDINAL_PARADIGM_2 = [
  ...CASES.map(x => `numr:m:${x}:nv`),
  ...CASES.map(x => `numr:f:${x}:nv`),
  ...CASES.map(x => `numr:n:${x}:nv`),
]
const NONIFL_ARABIC_CARDINAL_PARADIGM_3_0 = CASES.map(x => `numr:${x}:nv`)

const NONIFL_ORDINAL_PARADIGM = NONIFL_ADJ_PARADIGM.map(x => `${x}:&numr`)
NONIFL_ORDINAL_PARADIGM.push(
  ...NONIFL_ORDINAL_PARADIGM.map(x => `${x}:&noun:inanim`),
  ...PLUR_TANTUM_NONINFL_PARADIGM.map(x => `adj:${x}:&noun:inanim`),
  // ...CASES.map(x => `adj:p:ns${x}:nv:&noun:inanim`)
)


const REGEX2TAG_IMMEDIATE = [
  [[URL_RE,
    EMAIL_RE,
    LITERAL_SMILE_RE], ['sym']],
  // trmp [12]
  [[/^[02-9]*[1]$/], [...NONIFL_ARABIC_CARDINAL_PARADIGM_1, ...NONIFL_ORDINAL_PARADIGM]],
  [[/^[02-9]*[2]$/], [...NONIFL_ARABIC_CARDINAL_PARADIGM_2, ...NONIFL_ORDINAL_PARADIGM]],
  [[ARABIC_NUMERAL_RE], [...NONIFL_ARABIC_CARDINAL_PARADIGM_3_0, ...NONIFL_ORDINAL_PARADIGM]],
  [[ANY_PUNC_OR_DASH_RE], ['punct']],
  [[URL_RE,
    new RegExp(`^(${EMOJI_RE.source})$`),
    SMILE_RE], ['sym']],
] as Array<[Array<RegExp>, Array<string>]>

const REGEX2TAG_ADDITIONAL_LC_LEMMA = [
  [[INTERJECTION_RE], ['intj']],
]

const REGEX2TAG_ADDITIONAL = [
  [[ROMAN_NUMERAL_RE], [...NONIFL_ORDINAL_PARADIGM]],
  [[SYMBOL_RE], ['sym']],
  // [[FOREIGN_RE], [
  //   // 'noun:foreign',
  //   // 'adj:foreign',
  //   // 'verb:foreign',
  //   'x:foreign',
  // ]],
] as Array<[Array<RegExp>, Array<string>]>

const gluedPrefixes = [
  'авіа',
  'авто',
  'агро',
  'аеро',
  'анти',
  'архі',
  'аудіо',
  'бензо',
  'бібліо',
  'біо',
  'вело',
  'вібро',
  'віце-',
  'водо',
  'газо',
  'геліо',
  'гео',
  'гідро',
  'гіпер',
  'давньо',
  'динаміко',
  'екзо',
  'еко',
  'екс-',
  'електро',
  'етно',
  'євро',
  'зоо',
  'ізо',
  'інтер',
  'квазі',
  'кібер',
  'кіно',
  'контр',
  'космо',
  'культ',
  'лакто',
  'лже',
  'макро',
  'максі',
  'мега',
  'мед',
  'медіа',
  'мета',
  'метео',
  'мікро',
  'міні',
  'моно',
  'мото',
  'мульти',
  'над',
  'нано',
  'нео',
  'ново',
  'пост-',
  'пост',
  'проти',
  'псевдо',
  'радіо',
  'спец',
  'стерео',
  'супер',
  'теле',
  'телерадіо',
  'транс',
  'турбо',
  'ультра',
  'фіз',
  'фото',
]
const INITIALS_RE = new RegExp(`^[${LETTER_UK_UPPERCASE}]$`)
const UK_LOWERCASE_RE = new RegExp(`^[${LETTER_UK_LOWERCASE}]$`)

const REPLACINGS = [
  ['лянд', 'ланд'],
]

//------------------------------------------------------------------------------
const PREFIX_SPECS = [
  {
    prefixesRegex: new RegExp(`^(${gluedPrefixes.join('|')})+`, 'g'),
    test: (x: MorphInterp) => x.isNoun() || x.isAdjective() || x.isAdverb(),
  },
  {
    prefixes: ['пре'],
    test: (x: MorphInterp) => x.isAdjective() && x.isComparable(),
  },
  {
    prefixes: ['напів', 'не', 'спів'],
    test: (x: MorphInterp) => x.isNoun(),
  },
  {
    prefixes: ['де', 'зне'],
    test: (x: MorphInterp) => x.isNoun()
      && ['ція', 'ння'].some(ending => x.lemma.endsWith(ending)),
  },
  {
    prefixes: ['за', 'не'],
    test: (x: MorphInterp) => x.isAdverb(),
  },
  {
    prefixes: ['не', 'між', 'недо', 'поза', 'пів', 'напів'],
    test: (x: MorphInterp) => x.isAdjective(),
  },
  {
    prefixes: ['обі', 'від', 'об', 'по', 'попо', 'роз', 'за', 'з', 'із', 'у', 'уві', 'пере', 'ви', 'на', 'пови', 'про', 'підо'],
    pretest: (x: string) => x.length > 4,
    test: (x: MorphInterp) => x.isVerbial2() && x.isImperfect(),
    postprocess: postrpocessPerfPrefixedVerb,
  },
  {
    prefixes: ['не'],
    pretest: (x: string) => x.length > 4,
    test: (x: MorphInterp) => x.isVerbial2(),
    postprocess(x: MorphInterp) { x.setIsNegative() }
  },
  {
    prefixes: ['за', 'пере'],
    pretest: (x: string) => x.length > 4,
    test: (x: MorphInterp) => x.isVerb(),
    postprocess: postrpocessPerfPrefixedVerb,
  },
]

//------------------------------------------------------------------------------
function postrpocessPerfPrefixedVerb(x: MorphInterp) {
  x.setIsPerfect()
  if (x.isPresent()) {
    x.setIsFuture()
  }
}

type NumeralMapObj = { digit: number, form: string, interp: MorphInterp, lemma: string }

////////////////////////////////////////////////////////////////////////////////
export class MorphAnalyzer {
  private numeralMap = new CachedValue<Array<NumeralMapObj>>(this.buildNumeralMap.bind(this))
  private pivInterps: Array<MorphInterp>
  private cache = new Lru<string, Array<MorphInterp>>({ max: 50000 })
  expandAdjectivesAsNouns = false
  keepN2adj = false
  keepParadigmOmonyms = false

  constructor(private dictionary: Dictionary) {
    this.buildNumeralMap()
    this.pivInterps = this.lookup('пів’яблука')
  }

  setExpandAdjectivesAsNouns(value = true) {
    this.expandAdjectivesAsNouns = value
    return this
  }

  setKeepN2adj(value = true) {
    this.keepN2adj = value
    return this
  }

  setKeepParadigmOmonyms(value = true) {
    this.keepParadigmOmonyms = value
    return this
  }

  getNumeralMap() {
    return this.numeralMap.get()
  }

  hasAnyCase(token: string) {
    return this.dictionary.hasAnyCase(token)
  }

  canBeToken(token: string, noAuto = false) {
    if (this.isCompoundAdjective(token)) {
      return false
    }
    let interps = this.tag(token)
    if (token.endsWith('.')) {
      return !interps.every(x => x.isAbbreviation())
    }
    if (noAuto) {
      interps = interps.filter(x => !x.isAuto())
    }

    return interps.length > 0
  }

  tag(token: string, nextToken?: string) {
    let cacheKey = token
    if (nextToken) {
      cacheKey += `\n${nextToken}`
    }

    let cached = this.cache.get(cacheKey)
    if (cached) {
      return cached.map(x => x.clone())
    }

    let interps = this.tagUncached(token, nextToken)
    this.cache.set(cacheKey, interps.map(x => x.clone()))

    return interps
  }

  tagUncached(token: string, nextToken?: string) {
    token = token.replace(/\u0301/g, '')  // kill stress
    if (!token.length) {
      return []
    }

    if (dictOverride.has(token)) {
      return dictOverride.get(token).map(x => MorphInterp.fromVesumStr(x, token))
    }

    // regexes returning immediately
    for (let [regexes, tagStrs] of REGEX2TAG_IMMEDIATE) {
      if (regexes.some(x => x.test(token))) {
        return tagStrs.map(x => {
          let ret = MorphInterp.fromVesumStr(x, token)
          if (ret.isCardinalNumeral() && /^[\d\s,]+$/.test(token)) {
            ret.lemma = ret.lemma.replace(/[\s,]+/g, '')  // todo
          }
          return ret
        })
      }
    }

    // try domain as names
    if (DOMAIN_AS_NAME_RE.test(token)) {
      return NONIFL_NOUN_PARADIGM.map(tag => MorphInterp.fromVesumStr(`${tag}:prop`, token))
    }

    // отримав (-ла)
    if (token === 'ла' /*&& prevToken === '-'*/) {  // todo
      return [MorphInterp.fromVesumStr('verb:perf:past:f', token)]
    }

    token = token.replace(APOSTROPES_REPLACE_RE, '’')  // normalize

    // dictionary
    let lookupees = varyLetterCases(token)
    let lowercase = lookupees[0]
    let titlecase = lowercase.split('-').map(stringUtils.titlecase).join('-')
    if (nextToken === '.') {
      lookupees.push(...lookupees.map(x => x + '.'))
    }

    let res = new HashSet(MorphInterp.hash, flatten(lookupees.map(x => this.lookup(x))))
    // add from regexes
    for (let [regexes, tagStrs] of REGEX2TAG_ADDITIONAL) {
      if (regexes.some(x => x.test(token))) {
        res.addAll(tagStrs.map(x => MorphInterp.fromVesumStr(x, token)))
      }
    }

    let presentInDict = res.size > 0

    // regexes that add interps
    for (let [regexes, tagStrs] of REGEX2TAG_ADDITIONAL) {
      if (regexes.some(x => x.test(token))) {
        let toadd = tagStrs.map(x => MorphInterp.fromVesumStr(x, token))
        if (toadd.length) {
          res.addAll(toadd)
        } else {
          // regexes that add interps with lowercase lemma
          for (let [regexes, tagStrs] of REGEX2TAG_ADDITIONAL) {
            if (regexes.some(x => x.test(token))) {
              let toadd = tagStrs.map(x => MorphInterp.fromVesumStr(x, token.toLowerCase()))
              res.addAll(toadd)
            }
          }
        }
      }
    }

    // try одробив is the same as відробив
    if (!presentInDict && lowercase.startsWith('од') && lowercase.length > 4) {
      res.addAll(this.lookup('від' + lowercase.substr(2))
        .filter(x => x.isVerb())
        .map(x => {
          x.lemma = 'од' + x.lemma!.substr(3)
          x.setIsAuto().setIsOdd()
          return x
        }))
    }

    // try prefixes
    if (!presentInDict) {
      res.addAll(this.fromPrefixes(lowercase, res))
    }

    // guess невідомосиній from невідомо- and синій
    if (!presentInDict) {
      let oIndex = lowercase.indexOf('о')
      if (oIndex > 2) {
        let left = lowercase.substring(0, oIndex + 1)
        if (this.lookup(left).some(x => x.isBeforeadj())) {
          let right = lowercase.substr(oIndex + 1)
          res.addAll(this.lookup(right).filter(x => x.isAdjective()).map(x => {
            x.lemma = left + x.lemma
            x.setIsAuto()
            return x
          }))
        }
      }
    }

    // try ґ→г
    if (!presentInDict) {
      res.addAll(this.fromGH(lookupees))
    }

    // ірод from Ірод
    if (!res.size) {
      let toadd = this.lookup(titlecase)
        .filter(x => !res.has(x))
        .map(x => x/*.unproper()*/.setIsAuto())
      res.addAll(toadd)
    }

    // try ґ→г [2]
    if (!presentInDict) {
      if (!res.size) {
        res.addAll(this.fromGH([titlecase]))
      }
    }

    // *річчя
    if (!presentInDict) {
      if (lowercase.endsWith('річчя')) {
        res.addAll(this.lookup('дворіччя').map(x => x.setIsAuto().setLemma(lowercase)))
      }
    }

    // Погода була *най*кепська
    if (!presentInDict && /^(що|як)?най/.test(lowercase)) {
      let match = lowercase.match(/^(що|як)?най/)
      if (match) {
        let toadd = this.lookup(lowercase.substr(match[0].length))
          .filter(x => x.isAdjective())
        // todo: remove !
        toadd.forEach(x => x.setLemma(match![0] + x.lemma).setIsAuto(true).setIsAbsolute())
        res.addAll(toadd)
      }
    }

    // по-*ськи, по-*:v_dav, по-дев’яте
    if (!presentInDict && lowercase.startsWith('по-')) {
      let right = lowercase.substr(3)
      let rightRes = this.lookup(right)
        .filter(x => x.isAdjective()
          && (x.isMasculine() && x.isDative()
            || x.isNeuter() && x.isNominative() && x.isOrdinalNumeral()
          )
        )
      if (rightRes.length || lowercase.endsWith('ськи') || lowercase.endsWith('цьки')) {
        res.add(MorphInterp.fromVesumStr('adv').setLemma(lowercase).setIsAuto())
      }
    }

    // дз from ДЗ
    if (!presentInDict) {
      res.addAll(this.lookup(lowercase.toUpperCase()).map(x => x.setIsAuto()))
    }

    // try ховаючися from ховаючись
    if (!presentInDict && lowercase.endsWith('ся')) {
      let sia = lowercase.slice(0, -1) + 'ь'
      let advps = this.lookup(sia).filter(x => x.isConverb())
      advps.forEach(x => {
        // x.lemma = x.lemma.slice(0, -1) + 'я'
        x.setIsAuto()
      })
      res.addAll(advps)
    }

    // try якнайстаранніш from якнайстаранніше
    if (!presentInDict
      && (lowercase.startsWith('най') || lowercase.startsWith('якнай'))
      && lowercase.endsWith('іш')) {
      let she = lowercase + 'е'
      let interps = this.lookup(she).filter(x => x.isAdverb()).map(x => x.setIsAuto())
      // todo: lemma?
      res.addAll(interps)
    }

    // initials
    if (INITIALS_RE.test(token) && nextToken === '.') {
      res.addAll(INITIALS_INTERPS.map(x => MorphInterp.fromVesumStr(x, `${token}.`)))
    }

    // list items, letter names
    if (token !== 'я' && INITIALS_RE.test(token.toUpperCase())) {
      res.add(MorphInterp.fromVesumStr('noun:inanim:m:v_naz:prop', `${token}`))
      // } else if (/^[A-Z]$/.test(token)) {
      //   res.add(MorphInterp.fromVesumStr('noun:inanim:prop:foreign', `${token}`))
    }

    // one-letter abbrs
    if (UK_LOWERCASE_RE.test(lowercase) && nextToken === '.' && lowercase !== 'я') {   // <–– todo
      res.add(MorphInterp.fromVesumStr('x:abbr', `${lowercase}.`))
    }

    // try 20-x, todo
    {
      let match = lowercase.match(/^(\d+)[-–—]?([^\d]+)$/)
      if (match) {
        // console.log(match)
        let [, digits, ending] = match
        let lastDigit = parseIntStrict(digits.slice(-1))
        if (digits.match(/^1\d$/)) {
          lastDigit = 0
        }

        let toadd = this.numeralMap.get()
          .filter(x => x.digit === lastDigit && x.form.endsWith(ending))
          .map(x => {
            let ret = x.interp.clone()
            if (ret.isOrdinalNumeral()) {
              ret.setLemma(`${digits}-${x.lemma.slice(-ending.length)}`)
            } else {
              ret.setLemma(digits)
            }
            return ret
          })

        res.addAll(toadd)

        if (this.expandAdjectivesAsNouns) {
          toadd = toadd.filter(x => x.isAdjective())
            .map(x => x.clone().setIsAdjectiveAsNoun().setIsAnimate(false))
          res.addAll(toadd)

          if (lastDigit === 0) {  // 90-ті
            toadd = toadd.filter(x => x.isPlural()).map(x => x.clone().setIsPluraleTantum())
            res.addAll(toadd)
          }
        }
      }
    }

    // try reverse from non-reverse
    if (!res.size && lowercase.length > 4) {
      let ending = lowercase.slice(-2)
      if (ending === 'ся' || ending === 'сь') {
        let toadd = this.lookup(lowercase.slice(0, -2))
          .filter(x => x.isVerbial2())
          .map(x => x.setIsReversive().setLemma(x.lemma + 'ся'))
        res.addAll(toadd)
      }
    }

    // О'Райлі from Райлі
    if (token.startsWith('О’')) {
      let toadd = this.lookup(token.substr(2))
        .filter(x => x.isLastname())
      toadd.forEach(x => x.setIsAuto().lemma = `О’${x.lemma}`)
      res.addAll(toadd)
    }

    // укр from укр.
    {
      let toadd = flatten(lookupees.map(x => this.lookup(`${x}.`)
        .filter(xx => !res.has(xx))
        .map(xx => xx.setIsAuto())))
      res.addAll(toadd)
    }

    // голяндець from голандець
    {
      for (let [find, replace] of REPLACINGS) {
        // let candidates =
      }
    }

    // 25-літній
    {
      let match = token.match(NUMERAL_PREFIXED_TOKEN_RE)
      if (match) {
        let toadd = mu(this.lookup(match[2]))
          .filter(x => x.isAdjective() && !x.isAbbreviation())
          .transform(x => x.setIsAuto().lemma = `${match[1]}-${x.lemma}`)
        res.addAll(toadd)
      }
    }

    // смашний from смачний
    if (!presentInDict) {
      let match = lowercase.match(/шн(.{2,4})$/)
      if (match) {
        let chnyi = `чн${match[1]}`
        chnyi = lowercase.slice(0, -chnyi.length) + chnyi
        let toadd = mu(this.lookup(chnyi))
          .filter(x => x.isAdjective() && !x.isAbbreviation())
          .transform(x => x.setIsOdd().setIsAuto())
        // todo: alter lemma?
        res.addAll(toadd)
      }
    }

    // todo: implement a proper dict interface
    let fromAdHocDict = adHocDict.get(lowercase)
    if (fromAdHocDict) {
      res.addAll(fromAdHocDict.map(([lemma, tag]) => MorphInterp.fromVesumStr(tag, lemma)))
    }

    // пів’ягняти from ягняти and пів’яйце from яйце
    if (!res.size) {
      let pivPrefix = stringUtils.firstMatch(lowercase, /^(пів[’\-]?)/)
      if (pivPrefix) {
        let base = token.substr(pivPrefix.length)
        let baseInterps = this.lookup(base)
        let baseInterp = baseInterps.filter(x => x.isGenitive() && x.isNoun())[0]
        if (baseInterp) {
          let toAdd = this.pivInterps.map(x => x.clone()
            .setFeature(Gender, baseInterp.getFeature(Gender))
            .setLemma(pivPrefix.toLowerCase() + base)
            .setIsAuto()
          )
          res.addAll(toAdd)
        }
        let toAdd = baseInterps.filter(x => x.isNoun())
          .map(x => x.setLemma(pivPrefix + x.lemma).setIsAuto())
        res.addAll(toAdd)
      }
    }



    //~~~~~~~~~~~~~~
    // expand/add
    for (let interp of res) {
      if (interp.isNoun() && interp.canBeOrdinalNumeral()) {
        // fix dict problem: create мільйон numr from мільйон noun
        interp.setIsOrdinalNumeral(false)
        let numeral = new MorphInterp()
          .setPos(Pos.cardinalNumeral)
          .setCase(interp.features.case)
          .setIsPlural()
          .setLemma(interp.lemma)
        res.add(numeral)
      } else if (interp.isNoun() && interp.isNominative() && interp.isPlural() && interp.isAnimate()) {
        // add inanimish accusative, e.g. додати в друзі
        let candidate = interp.clone().setCase(Case.accusative)
        if (!res.has(candidate) && !res.has(candidate.setGrammaticalAnimacy(false))) {
          res.add(candidate)
        }
      }
    }

    // filter and postprocess
    let ret = new Array<MorphInterp>()
    for (let interp of res) {
      if (!/^[−\-]$/.test(nextToken) && interp.isBeforeadj()) {
        // if (!mu(res.keys()).some(x => x.isAdverb())) {
        // ret.push(MorphInterp.fromVesumStr('adv', lowercase).setIsAuto())
        // }
        continue
      }

      // kill adv interps from аварійно-рятувальні
      // let hasBeforeadjish = mu(res).some(x => x.isBeforeadj())
      // let hasBeforeadjishOnly = hasBeforeadjish
      //   && mu(res).every(x => x.isBeforeadj() || x.isAdverb())
      // if (hasBeforeadjishOnly && !interp.isBeforeadj()) {
      //   continue
      // }

      if (!this.keepN2adj && interp.isN2Adj() && !interp.isProper()) {
        continue
      }
      // if (token.length === 1 && interp.isAbbreviation() && !interp.isProper() && !interp.isX()) {
      //   continue
      // }

      if (token.endsWith('.') && interp.isAbbreviation()) {
        interp.setIsUninflectable()
      }

      ret.push(interp)
    }

    return ret
  }

  tagOrX(token: string, nextToken?: string) {
    let ret = this.tag(token, nextToken)
    if (!ret.length) {
      ret = [MorphInterp.fromVesumStr('x', token)]
    }
    return ret
  }

  hasInterps(token: string, nextToken?: string) {
    return !!this.tag(token, nextToken).length
  }

  hasNonforeignInterps(token: string, nextToken?: string) {
    return this.tag(token, nextToken)
      .some(x => !x.isForeign())
  }

  private lookupRaw(token: string) {
    let ret = this.dictionary.lookup(token)
    if (this.expandAdjectivesAsNouns) {
      let a = ret.map(x => {
        return mu(expandInterp(this.expandAdjectivesAsNouns, x.flags, x.lemma))
          .map(flags => ({ flags, lemma: x.lemma }))
          .toArray()
      })
      ret = flatten(a) as any
    }

    return ret
  }

  private lookup(token: string) {
    let interps = this.lookupRaw(token)
      .map(x => MorphInterp.fromVesumStr(x.flags, x.lemma, x.lemmaFlags))
    if (!this.keepParadigmOmonyms) {
      interps.forEach(x => x.features.paradigmOmonym = undefined)
    }
    return interps
  }

  private isCompoundAdjective(token: string) {
    if (token.includes('-')) {
      for (let tok of varyLetterCases(token)) {
        let [last, ...prevs] = tok.split('-').reverse()
        return this.lookup(last).some(x => x.isAdjective())
          && prevs.every(x => this.lookup(x).some(xx => xx.isBeforeadj()))
      }
    }
    return false
  }

  private *fromPrefixes(lowercase: string, fromDict: HashSet<any>) {
    for (let { prefixes, prefixesRegex, pretest, test, postprocess } of PREFIX_SPECS) {
      if (pretest && !pretest(lowercase)) {
        continue
      }

      let matchedPrefixes: Array<string> = []
      if (prefixesRegex) {
        let match = lowercase.match(prefixesRegex)
        if (match) {
          matchedPrefixes = [match[0]]
        }
      } else {
        matchedPrefixes = prefixes.filter(x => lowercase.startsWith(x))
      }
      // console.error(matchedPrefixes)

      for (let prefix of matchedPrefixes) {
        for (let interp of this.lookup(lowercase.substr(prefix.length))) {
          if (!test || test(interp)) {
            interp.lemma = prefix + interp.lemma
            if (postprocess) {
              postprocess(interp)
            }
            if (!fromDict.has(interp)) {
              interp.setIsAuto()
              yield interp
            }
          }
        }
      }
    }
  }

  private fromGH(lookupees: Iterable<string>) {
    let ret = mu<MorphInterp>()
    for (let lookupee of lookupees) {
      let fricativized = lookupee.replace(/ґ/g, 'г').replace(/Ґ/g, 'Г')
      let diffs = algo.findStringDiffIndexes(lookupee, fricativized)
      if (diffs.length) {
        ret = Mu.chain(ret, this.lookup(fricativized)
          .filter(interp => diffs.every(i => /г/gi.test(interp.lemma!.charAt(i))))
          .map(x => {
            let chars = [...x.lemma!]
            diffs.forEach(i => chars[i] = stringUtils.replaceCaseAware(chars[i], /г/gi, 'ґ'))
            x.lemma = chars.join('')
            return x.setIsAuto()
          }))
      }
    }
    return ret
  }

  private buildNumeralMap() {
    let supermap = [
      [1, 'перший'],
      [2, 'другий'],
      [3, 'третій'],
      [4, 'четвертий'],
      [5, 'п’ятий'],
      [6, 'шостий'],
      [7, 'сьомий'],
      [8, 'восьмий'],
      [9, 'дев’ятий'],
      [0, 'десятий'],

      [1, 'один'],
      [2, 'два'],
      [3, 'три'],
      [4, 'чотири'],
      [5, 'п’ять'],
      [6, 'шість'],
      [7, 'сім'],
      [8, 'вісім'],
      [9, 'дев’ять'],
      [0, 'десять'],
      [0, 'двадцять'],
    ] as Array<[number, string]>

    let ret = new Array<NumeralMapObj>()
    for (let [digit, lemma] of supermap) {
      let lexemes = this.dictionary.lookupLexemesByLemma(lemma)
      for (let lexeme of lexemes) {
        for (let { form, flags } of lexeme) {
          let interp = MorphInterp.fromVesumStr(flags)
          if (!interp.isPronominal() && (interp.isOrdinalNumeral() || interp.isCardinalNumeral())) {
            interp.features.degree = undefined
            ret.push({ digit, form, interp, lemma })
          }
        }
      }
    }

    return ret
  }
}



//------------------------------------------------------------------------------
const allUkUppercaseWchar = new RegExp(`^[${WCHAR_UK_UPPERCASE}]+$`)
function varyLetterCases(value: string) {
  let lowercase = value.toLowerCase()
  let ret = [lowercase]
  if (lowercase !== value) {
    ret.push(value)
    if (value.length > 1 && allUkUppercaseWchar.test(value)) {
      ret.push(capitalizeFirst(lowercase))
    }
  }

  return ret
}

//------------------------------------------------------------------------------
const ignoreLemmas = new Set(['ввесь', 'його', 'її', 'весь', 'увесь', 'який'])
function* expandInterp(expandAdjectivesAsNouns: boolean, flags: string, lemma: string) {
  yield flags
  if (expandAdjectivesAsNouns && flags.includes('adj:') && !flags.includes('beforeadj')) {
    if (!ignoreLemmas.has(lemma)) {
      let suffixes = flags.includes(':p:')
        ? ['anim:m', 'anim:f', 'anim:n', 'anim:ns', 'inanim:m', 'inanim:f', 'inanim:n', 'inanim:ns']
        : ['anim', 'inanim']
      yield* suffixes.map(x => flags + ':&noun:' + x)
    } else if (['весь', 'увесь'].includes(lemma) && flags.includes(':p:')) {
      yield flags + ':&noun:anim:ns'
    }
  }
}

//------------------------------------------------------------------------------
function capitalizeFirst(value: string) {
  return value.charAt(0).toLocaleUpperCase() + value.slice(1)
}
