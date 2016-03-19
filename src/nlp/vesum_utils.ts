import {tryMapVesumFlag, tryMapVesumFlagToFeature, MorphTag, FEATURE_ORDER, FEAT_MAP_STRING,
  RequiredCase, PronominalType, Aspect, ConjunctionType} from './morph_tag';
import {groupTableBy, arr2indexMap, combinations} from '../algo';


const FORM_PADDING = '  ';


const expandableFeatures = new Set([RequiredCase, PronominalType, Aspect, ConjunctionType]);

// Expands dict_corp_viz.txt tag into an array of unambiguous morph interpretations
////////////////////////////////////////////////////////////////////////////////
export function expandVesumTag(value: string) {
  let [mainFlagsStr, altFlagsStr] = value.split(/:&_|:&(?=adjp)/);  // consider &adjp as omohnymy
  
  let ret = combinations(groupExpandableFlags(mainFlagsStr.split(':')));
  if (altFlagsStr) {
    let altFlagArray = altFlagsStr.split(':');
    altFlagArray[0] = '&' + altFlagArray[0];
    for (let x of [...ret]) {
      ret.push([...x, ...altFlagArray]);
    }
  }
  
  return ret;
}

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
      let [form, tag] = line.split(' ');
      if (isLemma) {
        var lemma = form;
        var lemmaTag = tag;
      }
      yield { form, tag, lemma, lemmaTag, isLemma, line, lineNum };
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function expandDictCorpViz(fileStr: string) {
  let ret = new Array<string>();
  for (let {form, tag, isLemma} of iterateDictCorpVizLines(fileStr.split('\n'))) {
    let padd = isLemma ? '' : FORM_PADDING;
    ret.push(...expandVesumTag(tag).map(x => padd + form + ' ' + x));
  }

  return ret.join('\n');
}

////////////////////////////////////////////////////////////////////////////////
export function sortVesumFlags(flags: string[]) {

}

////////////////////////////////////////////////////////////////////////////////
export function test(fileStr: string) {
  for (let {form, tag, isLemma} of iterateDictCorpVizLines(fileStr.split('\n'))) {
    MorphTag.fromVesumStr(tag, form);
  }
}

////////////////////////////////////////////////////////////////////////////////
export function presentTagsForDisamb(tags: string[]) {
  let aligned = alignTagList(tags);
  let ret = aligned.map(x => x.map(x => []));

  for (let [i, posAgg] of aligned.entries()) {
    let maxNumFlags = Math.max(...posAgg.map(x => x.length));
    for (let k = 0; k < maxNumFlags; ++k) {
      let areAllEqual = posAgg.every(x => x[k] === posAgg[0][k]);
      for (let j = 0; j < posAgg.length; ++j) {
        ret[i][j].push({
          content: posAgg[j][k] || '',
          isMarked: !areAllEqual
        });
      }
    }
  }

  return ret;
}

//------------------------------------------------------------------------------
function alignTagList(tags: string[]) {
  let ret = new Array<Array<Array<string>>>();  // [pos][tag][flag]

  let flagsArr = tags.map(x => x.split(':')).sort((a, b) => a[0].localeCompare(b[0]));
  let poses = groupTableBy(flagsArr, 0);
  for (let posAgg of poses.values()) {
    let features = new Set();
    for (let flags of posAgg) {
      for (let flag of flags) {
        let feature = tryMapVesumFlagToFeature(flag);
        if (feature) {
          features.add(feature);
        }
      }
    }
    let featureOrderMap = arr2indexMap(FEATURE_ORDER.filter(x => features.has(x)));

    let posAligned = new Array<Array<string>>();
    ret.push(posAligned);
    for (let flags of posAgg) {
      let tagAligned = new Array<string>();
      posAligned.push(tagAligned);
      let flagsOfUnknownFeature = new Array<string>();
      for (let flag of flags) {
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