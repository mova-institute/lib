import { JsonCompareMap, NumeratedSet } from '../../data_structures'
import { longestCommonSubstring } from '../../algo'

export const PARADIGM_PREFIXES = NumeratedSet.fromUniqueArray([''].sort()) // todo
export const COMPARATOR = new Intl.Collator('uk-UA').compare

export function compileDict(lexemes: Array<Array<[string, string]>>) {
  let allTags = new NumeratedSet<string>()
  let allWords = new Array<[string, number, number]>()
  let paradigmPopularity = new Array<number>()

  let paradigmIds = new JsonCompareMap<any, number>() // todo: type
  let paradigms = new Array<any>()
  let suffixBag = new Set<string>()

  for (let lexeme of lexemes) {
    let { forms, paradigm } = extractParadigm(lexeme, PARADIGM_PREFIXES.ids)
    let { prefixes, suffixes, tags } = paradigm

    allTags.add(...tags)
    suffixes.forEach((x) => suffixBag.add(x))

    if (!paradigmIds.has(paradigm)) {
      paradigmIds.set(
        paradigm,
        paradigms.push({
          prefixes: prefixes.map((x) => PARADIGM_PREFIXES.id(x)),
          suffixes,
          tags: paradigm.tags.map((x) => allTags.id(x)),
        }) - 1,
      )
    }
    let paradigmId = paradigmIds.get(paradigm)
    paradigmPopularity[paradigmId] = paradigmPopularity[paradigmId] + 1 || 1

    for (let i = 0; i < forms.length; ++i) {
      allWords.push([forms[i], paradigmId, i])
      /*let topush = [...miEncode(forms[i]), 1,
       ...b64encode([...num2Uint16BytesBE(paradigmId), ...num2Uint16BytesBE(i)])]
       allWords.push(topush)
       //console.log(topush);*/
    }
  }

  let allSuffixes = NumeratedSet.fromUniqueArray(
    [...suffixBag].sort(COMPARATOR),
  )

  for (let par of paradigms) {
    par.suffixes = par.suffixes.map((x) => allSuffixes.id(x))
  }

  let linearizedParadigms = paradigms.map(linearizeParadigm)

  return {
    words: allWords,
    paradigmPopularity,
    tags: allTags.values,
    paradigms: linearizedParadigms,
    suffixes: allSuffixes.values,
    //paradigmPrefixes: allParadigmPrefixes.values
  }
}

export function* lexemes(lines: Array<string>) {
  if (!lines.length) {
    return []
  }
  if (lines[0].startsWith(' ')) {
    throw new Error('First line should be a lemma')
  }

  let curLexeme = [lines[0].split(' ')]
  for (let i = 1; i < lines.length; ++i) {
    if (!lines[i].startsWith(' ')) {
      yield curLexeme
      curLexeme = []
    }
    curLexeme.push(lines[i].trim().split(' '))
  }
  yield curLexeme
}

function extractParadigm(lexeme: Array<[string, string]>, knownPrefixes) {
  let forms = lexeme.map((x) => x[0])
  let stem = longestCommonSubstring(forms)
  let prefixes = forms.map((x) => x.substring(0, x.indexOf(stem)))
  if (prefixes.some((x) => !knownPrefixes.has(x))) {
    prefixes.fill('')
    stem = ''
  }
  let suffixes = forms.map((x) => x.substr(x.indexOf(stem) + stem.length))
  let tags = lexeme.map((x) => x[1])

  return { stem, forms, paradigm: { prefixes, suffixes, tags } }
}

function linearizeParadigm(paradigm) {
  // todo: type
  let ret = new Uint16Array(3 * paradigm.prefixes.length)
  let wiew = new DataView(ret.buffer)
  let i = 0
  for (let prop of ['suffixes', 'tags', 'prefixes']) {
    for (let n of paradigm[prop]) {
      wiew.setUint16(Uint16Array.BYTES_PER_ELEMENT * i++, n, true)
    }
  }

  return ret
}
