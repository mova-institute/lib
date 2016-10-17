import { iterateDictCorpVizLines } from './nlp/vesum_utils'
import { MorphInterp, mapVesumFlag } from './nlp/morph_interp'
import { isValidMteTag } from './nlp/mte_utils'

//const debug = require('debug')('testo')


////////////////////////////////////////////////////////////////////////////////
export function findDuplicateFeatures(fileStr: string) {
  let ret = new Set<string>()

  let skip = new Set(['&_adjp', '&_numr', 'v-u', 'dimin'])
  for (let { tag } of iterateDictCorpVizLines(fileStr.split('\n'))) {
    let features = new Set<string>()
    for (let flag of tag.split(':')) {
      if (skip.has(flag)) {
        continue
      }
      let feature = mapVesumFlag(flag).featStr
      if (features.has(feature)) {
        ret.add(feature)
      }
      features.add(feature)
    }
  }

  console.log(ret)
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function testMorphTag2Mte(fileStr: string) {
  let lines = fileStr.split('\n')
  for (let { form, tag, lemma, lemmaTag, lineIndex } of iterateDictCorpVizLines(lines)) {
    try {
      var morphTag = MorphInterp.fromVesumStr(tag, lemma)
      var lemmaMorphTag = MorphInterp.fromVesumStr(lemmaTag, lemma)
      var mte1 = morphTag.toMte(lemma, lemmaMorphTag)
      if (!isValidMteTag(mte1)) {
        console.log(`${form}\t${mte1}\t\t\t${tag}`)
      }

      // var morphTagBack = MorphTag.fromMte(mte1)
      // var mte2 = morphTagBack.toMte()
      // if (mte1 !== mte2) {
      //   console.error(`Error: "${mte1}" !== "${mte2}"`)
      // }
      morphTag = mte1 = undefined
    } catch (e) {
      console.error({ form, tag, mte1/*, mte2*/ })
      console.error(e.message)
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function testMte2Vesum(fileStr: string) {
  let lines = fileStr.split('\n')
  for (let { form, tag, lemma, lemmaTag, lineIndex } of iterateDictCorpVizLines(lines)) {
    if (
      tag.includes('insert')
      || tag.includes('predic')
      || tag.includes('bad')) {
      continue
    }

    let mte1
    let fromMte
    let vesum2
    let mte2
    try {
      // mte1 = rysin2multext(lemma, lemmaTag, form, tag)[0]
      fromMte = MorphInterp.fromMte(mte1)
      vesum2 = fromMte.toVesumStr()
      // mte2 = rysin2multext(lemma, lemmaTag, form, vesum2)[0]
      if (mte1 !== mte2) {
        // throw new Error(`${tag} !== ${toMte}`)
        console.error(`${tag}\n${vesum2}\n${mte1}\n${mte2}   for ${form} ${vesum2}\n`)
      }
      mte1 = fromMte = vesum2 = mte2 = null
    }
    catch (e) {
      console.error({ form, tag, mte1, vesum2, mte2, lineIndex })
      if (e.message.startsWith('Unma')) {
        throw e
        //continue
      }
      else {
        throw e
      }
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function testConverter(fileStr: string) {
  let lines = fileStr.split('\n')
  for (let { form, tag, lemma, lemmaTag, isLemma, lineIndex } of iterateDictCorpVizLines(lines)) {
    let mte
    let fromMte
    let vesumBack
    let reMte
    try {
      try {
        // mte = rysin2multext(lemma, lemmaTag, form, tag)[0]
      }
      catch (e) {
        console.error(e)
        if (e.message.startsWith('Unma')) {
          console.error({ form, tag, lemma, lemmaTag, isLemma, mte, lineIndex })
        }
        continue
      }

      if (mte) {
        fromMte = MorphInterp.fromMte(mte)
        vesumBack = fromMte.toVesum().join(':')
        // reMte = rysin2multext(lemma, lemmaTag, form, vesumBack)[0]
        if (mte !== reMte) {
          throw new Error(`${mte} !== ${reMte}`)
        }
      }
    }
    catch (e) {
      console.error({ form, tag, lemma, lemmaTag, isLemma, mte, vesumBack, reMte, fromMte, lineIndex })
      throw e
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function testFlagSorter(fileStr: string) {
  let lines = fileStr.split('\n')
  for (let { form, tag, lemma, lemmaTag, isLemma, lineIndex } of iterateDictCorpVizLines(lines)) {
    try {
      let internal = MorphInterp.fromVesumStr(tag)
      let backVesum = internal.toVesumStr()
      if (tag !== backVesum && !tag.includes(':xp') && !tag.includes('adj:')) {
        console.log({ form, befor: tag, after: backVesum, internal, lineIndex })
        console.log('===========================')
      }
    }
    catch (e) {
      console.error({ form, tag, lemma, lemmaTag, isLemma, lineIndex })
      throw e
    }
  }
}
