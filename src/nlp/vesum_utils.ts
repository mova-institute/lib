import {tryMapVesumFlag, tryMapVesumFlagToFeature, MorphTag, FEATURE_ORDER,
  RequiredCase, PronominalType, ConjunctionType, compareTags, } from './morph_tag';
import {groupTableBy, arr2indexMap, combinations, stableSort, unique} from '../algo';
import {IMorphInterp} from './interfaces';


const FORM_PADDING = '  ';


const expandableFeatures = new Set([RequiredCase, PronominalType, ConjunctionType]);


//------------------------------------------------------------------------------
function groupExpandableFlags(flags: string[]) {
  if (!flags.length) {
    return [];
  }

  let ret = [[flags[0]]];
  for (let i = 1; i < flags.length; ++i) {
    let feature = tryMapVesumFlagToFeature(flags[i]);
    if (expandableFeatures.has(feature)) {
      let prev = ret[ret.length - 1];
      if (tryMapVesumFlagToFeature(prev[0]) === feature) {
        prev.push(flags[i]);
      }
      else {
        ret.push([flags[i]]);
      }
    }
    else {
      ret.push([flags[i]]);
    }
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function* iterateDictCorpVizLines(lines: string[]) {
  let lineNum = -1;
  for (let line of lines) {
    ++lineNum;
    let isLemma = !line.startsWith(' ');
    line = line.trim();
    if (line) {
      line = line.replace(/'/g, '’');  // fix apostrophe
      let [form, tag] = line.split(' ');
      let lemma;
      let lemmaTag;
      if (isLemma) {
        lemma = form;
        lemmaTag = tag;
      }
      yield { form, tag, lemma, lemmaTag, isLemma, line, lineNum };
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export let dummyReturnVal = null && iterateDictCorpVizLines([]).next().value;  // todo: wait for https://github.com/Microsoft/TypeScript/issues/6606
export type DictCorpVizLine = typeof dummyReturnVal;
export function* iterateDictCorpVizLexemes(lines: string[]) {
  let accum = new Array<DictCorpVizLine>();
  for (let line of iterateDictCorpVizLines(lines)) {
    if (accum.length && line.isLemma) {
      yield accum;
      accum = [];
    }
    accum.push(line);
  }
}

////////////////////////////////////////////////////////////////////////////////
export function expandDictCorpViz(fileStr: string) {
  let ret = new Array<string>();

  for (let lexeme of iterateDictCorpVizLexemes(fileStr.split('\n'))) {
    let main = [];
    let alt = [];
    let lemmaTag = expandAndSortVesumTag(lexeme[0].tag.replace('&_', '&'))[0];
    for (let {form, tag} of lexeme) {
      let [mainFlagsStr, altFlagsStr] = splitMainAltFlags(tag);
      main.push(...expandAndSortVesumTag(mainFlagsStr, lemmaTag).map(x => FORM_PADDING + form + ' ' + x.join(':')));
      if (altFlagsStr) {
        alt.push(...expandAndSortVesumTag(tag.replace('&_', '&'), lemmaTag).map(x => FORM_PADDING + form + ' ' + x.join(':')));
      }
    }
    main = unique(main);
    alt = unique(alt);
    main[0] = main[0].substr(FORM_PADDING.length);
    if (alt.length) {
      alt[0] = alt[0].substr(FORM_PADDING.length);
    }

    ret.push(...main, ...alt);
  }

  return ret.join('\n');
}

//------------------------------------------------------------------------------
function splitMainAltFlags(tag: string) {
  let [main, alt] = tag.split(/:&_|:&(?=adjp)/);
  if (alt) {
    let altArr = alt.split(':');
    let xp1Index = altArr.findIndex(x => /^x[pv]\d+$/.test(x));  // todo: one place
    if (xp1Index >= 0) {
      main += ':' + altArr[xp1Index];
      altArr.splice(xp1Index, 1);
    }
    alt = altArr.join(':');
  }

  return [main, alt];
}

//------------------------------------------------------------------------------
function expandAndSortVesumTag(tag: string, lemmaFlags?: string[]) {
  let ret = combinations(groupExpandableFlags(tag.split(':')));
  ret = ret.map(x => MorphTag.fromVesum(x, lemmaFlags).toVesum());

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function test(fileStr: string) {
  for (let {lemmaTag, tag} of iterateDictCorpVizLines(fileStr.split('\n'))) {
    MorphTag.fromVesumStr(tag, lemmaTag);
  }
}

////////////////////////////////////////////////////////////////////////////////
export function presentTagsForDisamb(interps: IMorphInterp[]) {
  let splitted = interps.map((x, index) => ({ index, lemma: x.lemma, flags: x.tag.split(':') }));
  let sorted = stableSort(splitted, (a, b) => compareTags(MorphTag.fromVesum(a.flags), MorphTag.fromVesum(b.flags)));

  let aligned = alignTagList(sorted.map(x => x.flags));
  let flags = aligned.map(x => x.map(xx => []));

  for (let [i, posAgg] of aligned.entries()) {
    let maxNumFlags = Math.max(...posAgg.map(x => x.length));
    for (let k = 0; k < maxNumFlags; ++k) {
      let areAllEqual = posAgg.every(x => x[k] === posAgg[0][k]);
      for (let j = 0; j < posAgg.length; ++j) {
        flags[i][j].push({
          content: posAgg[j][k] || '',
          isMarked: !areAllEqual,
        });
      }
    }
  }

  let ret = [];
  let shift = 0;
  for (let posAgg of flags) {
    ret.push(posAgg.map((x, i) => ({
      flags: x,
      lemma: sorted[shift + i].lemma,
      index: sorted[shift + i].index,
    })));
    shift += posAgg.length;
  }
  return ret;
}

//------------------------------------------------------------------------------
function alignTagList(flags: string[][]) {
  let ret = new Array<Array<Array<string>>>();  // [pos][tag][flag]

  let poses = groupTableBy(flags, 0);
  for (let posAgg of poses.values()) {
    let features = new Set();
    for (let flagss of posAgg) {
      for (let flag of flagss) {
        let feature = tryMapVesumFlagToFeature(flag);
        if (feature) {
          features.add(feature);
        }
      }
    }
    let pos = tryMapVesumFlag(posAgg[0][0]).vesum;
    let featureOrderMap = arr2indexMap((FEATURE_ORDER[pos] || FEATURE_ORDER.other).filter(x => features.has(x)));

    let posAligned = new Array<Array<string>>();
    ret.push(posAligned);
    for (let flagss of posAgg) {
      let tagAligned = new Array<string>();
      posAligned.push(tagAligned);
      let flagsOfUnknownFeature = new Array<string>();
      for (let flag of flagss) {
        let feature = tryMapVesumFlagToFeature(flag);
        if (feature) {
          let featureIndex = featureOrderMap.get(feature);
          tagAligned[featureIndex] = flag;
        }
        else {
          flagsOfUnknownFeature.push(flag);
        }
      }
      tagAligned.push(...flagsOfUnknownFeature);
    }
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function findUnidentifiableRows(fileStr: string) {
  let set = new Set<string>();
  for (let {form, tag, lemma} of iterateDictCorpVizLines(fileStr.split('\n'))) {
    let key = `${form} ${tag} ${lemma}`;
    if (set.has(key)) {
      console.log(key);
    }
    set.add(key);
  }
}
