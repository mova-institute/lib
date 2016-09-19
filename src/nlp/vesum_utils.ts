import { tryMapVesumFlag, tryMapVesumFlagToFeature, MorphInterp, FEATURE_ORDER,
  RequiredCase, PronominalType, ConjunctionType, compareTags, Voice, Aspect } from './morph_interp'
import { groupTableBy, arr2indexMap, combinations, stableSort, unique } from '../algo'
import { IStringMorphInterp } from './interfaces'

const wu: Wu.WuStatic = require('wu')




const collator = new Intl.Collator('uk-UA')
const NONLEMMA_PADDING = '  '
// const expandableFeatures = new Set([RequiredCase, PronominalType, ConjunctionType])


//------------------------------------------------------------------------------
// function groupExpandableFlags(flags: string[]) {
//   if (!flags.length) {
//     return []
//   }

//   let ret = [[flags[0]]]
//   for (let i = 1; i < flags.length; ++i) {
//     let feature = tryMapVesumFlagToFeature(flags[i])
//     if (expandableFeatures.has(feature)) {
//       let prev = ret[ret.length - 1]
//       if (tryMapVesumFlagToFeature(prev[0]) === feature) {
//         prev.push(flags[i])
//       }
//       else {
//         ret.push([flags[i]])
//       }
//     }
//     else {
//       ret.push([flags[i]])
//     }
//   }

//   return ret
// }

////////////////////////////////////////////////////////////////////////////////
export function* iterateDictCorpVizLines(lines: Iterable<string>) {
  let lineIndex = -1
  let lemma
  let lemmaTag
  for (let line of lines) {
    ++lineIndex
    let isLemma = !line.startsWith(' ')
    let l = line.trim()
    if (l) {
      l = l.replace(/'/g, '’');  // fix apostrophe
      let [form, tag] = l.split(' ')
      if (isLemma) {
        lemma = form
        lemmaTag = tag
      }
      yield { form, tag, lemma, lemmaTag, isLemma, line, lineIndex }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
// export function* iterateDictCorpVizLexemeLines(lines: Iterable<DictCorpVizLine>) {
//   let accum = new Array<DictCorpVizLine>()
//   for (let line of lines) {
//     if (line.isLemma && accum.length) {
//       yield accum
//       accum = []
//     }
//     accum.push(line)
//   }
//   if (accum.length) {
//     yield accum
//   }
// }

////////////////////////////////////////////////////////////////////////////////
// export let dummyReturnVal = null && iterateDictCorpVizLines([]).next().value;  // todo: wait for https://github.com/Microsoft/TypeScript/issues/6606
// export type DictCorpVizForm = typeof dummyReturnVal
// export function* iterateDictCorpVizLexemes(lines: Iterable<string>) {
//   let accum = new Array<DictCorpVizLine>()
//   for (let line of iterateDictCorpVizLines(lines)) {
//     if (accum.length && line.isLemma) {
//       yield accum
//       accum = []
//     }
//     accum.push(line)
//   }
//   if (accum.length) {
//     yield accum
//   }
// }

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

////////////////////////////////////////////////////////////////////////////////
let expandableFlags = [
  /:pers|:refl|:dem|:int|:rel|:neg|:ind|:gen|:emph/g,
  /:rv_rod|:rv_dav|:rv_zna|:rv_oru|:rv_mis/g,
  /:subord|:coord/g,
]
export function* expandDictCorpViz(lines: Iterable<string>) {
  lines = wu(lines).map(x => {
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
          yield* wu(lexeme).map(x => x.replace(regexp, '') + flag)
        }
        continue lexemeLoop
      }
    }
    yield* lexeme
  }
}

//------------------------------------------------------------------------------
// function* expandLexeme(lexeme: Wu.WuIterable<string>) {
//   let lemmaLine = lexeme.next()
//   if (!lemmaLine.done) {
//     yield lemmaLine.value
//     if (lemmaLine.value.includes(' adj:')) {
//       let first = true
//       for (let line of wu.chain([NONLEMMA_PADDING + lemmaLine.value], lexeme)) {
//         if (!first) {
//           yield line
//         }
//         if (line.includes(':p')) {
//           yield* [':&noun:anim:m', ':&noun:anim:f', ':&noun:inanim:m', ':&noun:inanim:f'].map(x => line + x)
//         }
//         else {
//           yield* [':&noun:anim', ':&noun:inanim'].map(x => line + x)
//         }
//         first = false
//       }
//     }
//     else {
//       yield* lexeme
//     }
//   }
// }

////////////////////////////////////////////////////////////////////////////////
export function domesticateDictCorpViz(fileStr: string) {
  let lines = wu(fileStr.split('\n'))
    .filter(x => !/^\s*$/.test(x))
    .map(x => x.replace(/'/g, '’'))

  return wu(iterateDictCorpVizLines(expandDictCorpViz(lines))).map(x => {
    let tag = MorphInterp.fromVesumStr(x.tag, x.lemma, x.lemmaTag).toVesumStr()
    return (x.isLemma ? '' : NONLEMMA_PADDING) + x.form + ' ' + tag
  })
}

////////////////////////////////////////////////////////////////////////////////
// export function expandDictCorpViz(lines: Iterable<string>) {
//   let ret = new Array<string>()

//   for (let lexeme of iterateDictCorpVizLexemes(lines)) {
//     let main = []
//     let alt = []
//     let lemmaTag = expandAndSortVesumTag(lexeme[0].tag.replace('&_', '&'))[0]
//     for (let { form, tag } of lexeme) {
//       let [mainFlagsStr, altFlagsStr] = splitMainAltFlags(tag)
//       main.push(...expandAndSortVesumTag(mainFlagsStr, lemmaTag).map(x => NONLEMMA_PADDING + form + ' ' + x.join(':')))
//       if (altFlagsStr) {
//         alt.push(...expandAndSortVesumTag(tag.replace('&_', '&'), lemmaTag).map(x => NONLEMMA_PADDING + form + ' ' + x.join(':')))
//       }
//     }
//     main = unique(main)
//     alt = unique(alt)
//     main[0] = main[0].substr(NONLEMMA_PADDING.length)
//     if (alt.length) {
//       alt[0] = alt[0].substr(NONLEMMA_PADDING.length)
//     }

//     ret.push(...main, ...alt)
//   }

//   return ret.join('\n')
// }

//------------------------------------------------------------------------------
// function splitMainAltFlags(tag: string) {
//   let [main, alt] = tag.split(/:&_|:&(?=adjp)/)
//   if (alt) {
//     let altArr = alt.split(':')
//     let xp1Index = altArr.findIndex(x => /^x[pv]\d+$/.test(x));  // todo: one place
//     if (xp1Index >= 0) {
//       main += ':' + altArr[xp1Index]
//       altArr.splice(xp1Index, 1)
//     }
//     alt = altArr.join(':')
//   }

//   return [main, alt]
// }

//------------------------------------------------------------------------------
// function expandAndSortVesumTag(tag: string, lemmaFlags?: string[]) {
//   let ret = combinations(groupExpandableFlags(tag.split(':')))
//   ret = ret.map(x => MorphTag.fromVesum(x, lemmaFlags).toVesum())

//   return ret
// }

////////////////////////////////////////////////////////////////////////////////
export function test(fileStr: string) {
  for (let { lemmaTag, tag } of iterateDictCorpVizLines(fileStr.split('\n'))) {
    MorphInterp.fromVesumStr(tag, undefined, lemmaTag)
  }
}

////////////////////////////////////////////////////////////////////////////////
export function presentTagsForDisamb(interps: IStringMorphInterp[]) {
  let mainTags = new Array<IStringMorphInterp>()
  let auxTags = new Array<IStringMorphInterp>()
  interps.forEach(x => (isAdditionalTag(x.flags) ? auxTags : mainTags).push(x))
  return {
    main: presentTagsForDisambOneBlock(mainTags),
    aux: presentTagsForDisambOneBlock(auxTags),
  }
}

////////////////////////////////////////////////////////////////////////////////
export function presentTagsForDisambOneBlock(interps: IStringMorphInterp[]) {
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

//------------------------------------------------------------------------------
function alignTagList(flags: string[][]) {
  let ret = new Array<Array<Array<string>>>();  // [pos][tag][flag]

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
    let pos = tryMapVesumFlag(posAgg[0][0]).vesum
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
        }
        else {
          flagsOfUnknownFeature.push(flag)
        }
      }
      tagAligned.push(...flagsOfUnknownFeature)
    }
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
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

////////////////////////////////////////////////////////////////////////////////
// export async function findOmoLemmas(fileStr: string) {
//   let set = new Set<string>()
//   for (let { tag, form, isLemma } of iterateDictCorpVizLines(fileStr.split('\n'))) {
//     if (isLemma) {
//       let xv = tag.match(/:x[pv]\d/)

//       let key = form
//       if (xv) {
//         key += ' ' + xv[0]
//       }
//       if (set.has(key)) {
//         console.log(key)
//       }
//       set.add(key)
//     }
//   }
// }

////////////////////////////////////////////////////////////////////////////////
const paradigmExplanations = new Map([
  [/</, 'істота'],
  [/\+/, 'прізвище'],
  [/\.a\b/, 'родовий на -а'],
])

function xpNumber(line: string) {
  return Number.parseInt(line.match(/:xp([1-9])/)[1])
}
export function* gatherXps(fileStrs: Iterable<string>) {
  let lines = wu(fileStrs)
    .map(x => x.split('\n'))
    .flatten()
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

//------------------------------------------------------------------------------
function isAdditionalTag(flags: string) {
  return /:&noun|:v_znao|:v_znar/.test(flags)
}
