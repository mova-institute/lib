import {
  tryMapVesumFlag, tryMapVesumFlagToFeature, MorphInterp, FEATURE_ORDER,
  compareTags,
} from './morph_interp'
import * as f from './morph_features'
import { groupTableBy, arr2indexMap, stableSort } from '../algo'
import { IStringMorphInterp } from './interfaces'
import { setTenseIfConverb } from './ud/uk_grammar'
import { mu } from '../mu'



const collator = new Intl.Collator('uk-UA')
const NONLEMMA_PADDING = '  '

export class DictCorpVizIterator {
  private lineIndex = -1
  private lemma: string
  private lemmaTag: string

  feedLine(line: string) {
    ++this.lineIndex
    let isLemma = !line.startsWith(' ')
    let l = line.trim()
    if (l) {
      l = l.replace(/'/g, '’')  // fix apostrophe
      let [form, tag] = l.split(' ')
      if (isLemma) {
        this.lemma = form
        this.lemmaTag = tag
      }
      return {
        form,
        tag,
        lemma: this.lemma,
        lemmaTag: this.lemmaTag,
        isLemma,
        line,
        lineIndex: this.lineIndex
      }
    }
  }
}

export function* iterateDictCorpVizLines(lines: Iterable<string>) {
  let iterator = new DictCorpVizIterator()
  for (let line of lines) {
    yield iterator.feedLine(line)
  }
}

function* chunkLexemes(lines: Iterable<string>) {
  let accum = new Array<string>()
  for (let line of lines) {
    if (!line.startsWith(NONLEMMA_PADDING) && accum.length) {
      yield accum
      accum = []
    }
    accum.push(line)
  }
  if (accum.length) {
    yield accum
  }
}

let expandableFlags = [
  /:pers|:refl|:dem|:int|:rel|:neg|:ind|:gen|:emph/g,
  /:rv_rod|:rv_dav|:rv_zna|:rv_oru|:rv_mis/g,
  /:subord|:coord/g,
]
export function* expandDictCorpViz(lines: Iterable<string>) {
  lines = mu(lines).map(x => {
    let beforeadj = x.match(/^.* adj:beforeadj/)
    if (beforeadj) {
      return beforeadj[0]
    }
    return x.replace('&_adjp', '&adjp')
  })
  lexemeLoop:
  for (let lexeme of chunkLexemes(lines)) {
    for (let regexp of expandableFlags) {
      let match = lexeme[0].match(regexp)
      if (match && match.length > 1) {
        for (let flag of match) {
          yield lexeme.map(x => x.replace(regexp, '') + flag)
        }
        continue lexemeLoop
      }
    }
    yield lexeme
  }
}

export function* domesticateDictCorpViz(fileStr: string) {
  let lines = mu(fileStr.split('\n'))
    .filter(x => !/^\s*$/.test(x))
    .map(x => x.replace(/'/g, '’'))

  let prevLemma: string

  lexeme:
  for (let lexeme of expandDictCorpViz(lines)) {
    let mustDropNumber = /\snumr:/.test(lexeme[0])
      && lexeme.some(x => /\s.*\b:p\b/.test(x))
      && !lexeme.some(x => !/\s.*\b:p\b/.test(x))

    for (let { form, tag, lemma, lemmaTag, isLemma } of iterateDictCorpVizLines(lexeme)) {

      // remove dashed repeats
      if (lexeme.length === 1 && form !== '-') {
        let split = form.split('-')
        if (split.length > 1) {
          if (split.every(x => x === split[0])) {
            form = split[0]
            lemma = split[0]
            if (prevLemma === lemma) {
              continue lexeme
            }
          }
        }
      }
      prevLemma = lemma

      let interp = MorphInterp.fromVesumStr(tag, lemma, lemmaTag)

      if (mustDropNumber) {
        interp.dropFeature(f.MorphNumber)
      }

      setTenseIfConverb(interp, form)

      let lineStart = (isLemma ? '' : NONLEMMA_PADDING) + form + ' '
      yield lineStart + interp.toVesumStr()

      if (interp.lemma === 'бути' && interp.isVerb()) {
        interp.setIsAuxillary()  // ??
        yield lineStart + interp.toVesumStr()
      }
    }
  }
}

export function test(fileStr: string) {
  for (let { lemmaTag, tag } of iterateDictCorpVizLines(fileStr.split('\n'))) {
    MorphInterp.fromVesumStr(tag, undefined, lemmaTag)
  }
}

export function presentTagsForDisamb(interps: Array<IStringMorphInterp>) {
  let mainTags = new Array<IStringMorphInterp>()
  let auxTags = new Array<IStringMorphInterp>()
  interps.forEach(x => (isAdditionalTag(x.flags) ? auxTags : mainTags).push(x))
  return {
    main: presentTagsForDisambOneBlock(mainTags),
    aux: presentTagsForDisambOneBlock(auxTags),
  }
}

export function presentTagsForDisambOneBlock(interps: Array<IStringMorphInterp>) {
  let splitted = interps.map((x, index) => ({ index, lemma: x.lemma, flags: x.flags.split(':') }))
  let sorted = stableSort(splitted, (a, b) => compareTags(MorphInterp.fromVesum(a.flags), MorphInterp.fromVesum(b.flags)))

  let aligned = alignTagList(sorted.map(x => x.flags))
  let flags = aligned.map(x => x.map(xx => new Array<{ content: string, isMarked: boolean }>()))

  for (let [i, posAgg] of aligned.entries()) {
    let maxNumFlags = Math.max(...posAgg.map(x => x.length))
    for (let k = 0; k < maxNumFlags; ++k) {
      let areAllEqual = posAgg.every(x => x[k] === posAgg[0][k])
      for (let j = 0; j < posAgg.length; ++j) {
        flags[i][j].push({
          content: posAgg[j][k] || '',
          isMarked: !areAllEqual,
        })
      }
    }
  }

  let ret = []
  let shift = 0
  for (let posAgg of flags) {
    ret.push(posAgg.map((x, i) => ({
      flags: x,
      lemma: sorted[shift + i].lemma,
      index: sorted[shift + i].index,
      flagsStr: interps[sorted[shift + i].index].flags,
    })))
    shift += posAgg.length
  }
  return ret
}

function alignTagList(flags: Array<Array<string>>) {
  let ret = new Array<Array<Array<string>>>()  // [pos][tag][flag]

  let poses = groupTableBy(flags, 0)
  for (let posAgg of poses.values()) {
    let features = new Set()
    for (let flagss of posAgg) {
      for (let flag of flagss) {
        let feature = tryMapVesumFlagToFeature(flag)
        if (feature) {
          features.add(feature)
        }
      }
    }

    let pos = tryMapVesumFlag(posAgg[0][0].toLowerCase())
    pos = pos ? pos.vesum : ''
    let featureOrderMap = arr2indexMap((FEATURE_ORDER[pos] || FEATURE_ORDER.other).filter(x => features.has(x)))

    let posAligned = new Array<Array<string>>()
    ret.push(posAligned)
    for (let flagss of posAgg) {
      let tagAligned = new Array<string>()
      posAligned.push(tagAligned)
      let flagsOfUnknownFeature = new Array<string>()
      for (let flag of flagss) {
        let feature = tryMapVesumFlagToFeature(flag)
        if (feature) {
          let featureIndex = featureOrderMap.get(feature)
          tagAligned[featureIndex] = flag
        } else {
          flagsOfUnknownFeature.push(flag)
        }
      }
      tagAligned.push(...flagsOfUnknownFeature)
    }
  }

  return ret
}

export function findUnidentifiableRows(fileStr: string) {
  let set = new Set<string>()
  for (let { form, tag, lemma } of iterateDictCorpVizLines(fileStr.split('\n'))) {
    let key = `${form} ${tag} ${lemma}`
    if (set.has(key)) {
      console.log(key)
    }
    set.add(key)
  }
}

const paradigmExplanations = new Map([
  [/</, 'істота'],
  [/\+/, 'прізвище'],
  [/\.a\b/, 'родовий на -а'],
])

function xpNumber(line: string) {
  return Number(line.match(/:xp([1-9])/)[1])
}
export function* gatherXps(lines: Iterable<string>) {
  lines = mu(lines)
    .map(x => x.trim())
    .filter((x: string) => /:xp[1-9]/.test(x))
    .toArray()
    .sort((a: string, b: string) =>
      collator.compare(a.match(/^\S+/)[0], b.match(/^\S+/)[0]) || (xpNumber(a) - xpNumber(b))
    )

  let currentWord
  for (let line of lines) {
    let word = line.match(/^\S+/)[0]
    let paradigm = (line.match(/\/\S+/) || [])[0] || ''
    let flags = line.match(/:\S+/)[0]
    let comment = (line.match(/#\s*(.*)/) || [])[1] || ''
    if (currentWord && currentWord !== word) {
      yield ''
    }
    currentWord = word

    comment = comment.trim()
    let comments = comment.length ? [comment] : []
    for (let [regex, explanation] of paradigmExplanations) {
      if (regex.test(paradigm)) {
        comments.push(explanation)
      }
    }

    yield `${word} ${flags}    ${comments.join(', ')}`
  }
}

function isAdditionalTag(flags: string) {
  return /:&noun|:(in)?animish/.test(flags)
}
