import {iterateDictCorpVizLines, expandVesumTag} from './nlp/vesum_utils';
import {MorphTag, mapVesumFlag} from './nlp/morph_tag';
import {rysin2multext} from './nlp/rysin2mulext';


const debug = require('debug')('testo');


////////////////////////////////////////////////////////////////////////////////
export function findDuplicateFeatures(fileStr: string) {
  let ret = new Set<string>();
  
  let skip = new Set(['&_adjp', '&_numr', 'v-u', 'dimin']);
  for (let {tag} of iterateDictCorpVizLines(fileStr.split('\n'))) {
    let features = new Set<string>();
    for (let flag of tag.split(':')) {
      if (skip.has(flag)) {
        continue;
      }
      let feature = mapVesumFlag(flag).featStr;
      if (features.has(feature)) {
        ret.add(feature);
      }
      features.add(feature);
    }
  }
  
  console.log(ret);
  return ret;
}


////////////////////////////////////////////////////////////////////////////////
export function testConverter(fileStr: string) {
  let lines = fileStr.split('\n');
  for (let {form, tag, lemma, lemmaTag, isLemma, lineNum} of iterateDictCorpVizLines(lines)) {
    try {
      try {
        var mte = rysin2multext(lemma, lemmaTag, form, tag)[0];
      }
      catch (e) {
        console.error(e);
        if (e.message.startsWith('Unma')) {
          console.error({ form, tag, lemma, lemmaTag, isLemma, mte, vesumBack, reMte, fromMte, lineNum });
        }
        continue;
      }

      if (mte) {
        var fromMte = MorphTag.fromMte(mte);
        var vesumBack = fromMte.toVesum().join(':');
        var reMte = rysin2multext(lemma, lemmaTag, form, vesumBack)[0];
        if (mte !== reMte) {
          throw new Error(`${mte} !== ${reMte}`);
        }
      }
    }
    catch (e) {
      console.error({ form, tag, lemma, lemmaTag, isLemma, mte, vesumBack, reMte, fromMte, lineNum });
      throw e;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function testFlagSorter(fileStr: string) {
  let lines = fileStr.split('\n');
  for (let {form, tag, lemma, lemmaTag, isLemma, lineNum} of iterateDictCorpVizLines(lines)) {
    try {
      let internal = MorphTag.fromVesumStr(tag);
      let backVesum = internal.toVesumStr();
      if (tag !== backVesum && !tag.includes(':xp') && !tag.includes('adj:')) {
        console.log({ form, befor: tag, after: backVesum, internal, lineNum });
        console.log('===========================');
      }
    }
    catch (e) {
      console.error({ form, tag, lemma, lemmaTag, isLemma, lineNum });
      throw e;
    }
  }
}