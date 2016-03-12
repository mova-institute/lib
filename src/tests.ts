import {iterateDictCorpViz} from './nlp/vesum_utils';
import {MorphTag} from './nlp/morph_tag';
import {rysin2multext} from './nlp/rysin2mulext';


const debug = require('debug')('testo');


////////////////////////////////////////////////////////////////////////////////
export function testConverter(fileStr: string) {
  let lines = fileStr.split('\n');
  for (let {form, tag, lemma, lemmaTag, isLemma, lineNum} of iterateDictCorpViz(lines)) {
    try {
      try {
        var mte = rysin2multext(lemma, lemmaTag, form, tag)[0];
      }
      catch (e) {
        console.error(e);
        if (e.message.startsWith('Unma')) {
          console.error({form, tag, lemma, lemmaTag, isLemma, mte, vesumBack, reMte, fromMte, lineNum});
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
      console.error({form, tag, lemma, lemmaTag, isLemma, mte, vesumBack, reMte, fromMte, lineNum});
      throw e;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function testSorter(fileStr: string) {
  let lines = fileStr.split('\n');
  for (let {form, tag, lemma, lemmaTag, isLemma, lineNum} of iterateDictCorpViz(lines)) {
    try {
      let internal = MorphTag.fromVesumStr(tag);
      let backVesum = internal.toVesumStr();
      if (tag !== backVesum && !tag.includes(':xp')) {
        console.log({form, tagO: tag, tagM: backVesum, internal, lineNum});
        console.log('===========================');
      }
    }
    catch (e) {
      console.error({form, tag, lemma, lemmaTag, isLemma, lineNum});
      throw e;
    }
  }
}