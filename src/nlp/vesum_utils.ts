import {tryMapVesumFlag, tryMapVesumFlagToFeature, MorphTag, FEATURE_ORDER, FEAT_MAP_STRING,
  RequiredCase, PronominalType, Aspect, ConjunctionType, compareTags} from './morph_tag';
import {groupTableBy, arr2indexMap, combinations, stableSort} from '../algo';
import {MorphInterp} from './interfaces';


const FORM_PADDING = '  ';


const expandableFeatures = new Set([RequiredCase, PronominalType, ConjunctionType]);

// Expands dict_corp_viz.txt tag into an array of unambiguous morph interpretations
////////////////////////////////////////////////////////////////////////////////
export function expandAndSortVesumTag(value: string) {
  let [mainFlagsStr, altFlagsStr] = value.split(/:&_|:&(?=adjp)/);  // consider &adjp as omohnymy
  
  let ret = combinations(groupExpandableFlags(mainFlagsStr.split(':')));
  if (altFlagsStr) {
    let altFlagArray = altFlagsStr.split(':');
    altFlagArray[0] = '&' + altFlagArray[0];
    for (let x of [...ret]) {
      ret.push([...x, ...altFlagArray]);
    }
  }
  
  ret = ret.map(x => MorphTag.fromVesum(x).toVesum());
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
      line = line.replace(/'/g, '’');  // fix apostrophe
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
    ret.push(...expandAndSortVesumTag(tag).map(x => padd + form + ' ' + x.join(':')));
  }

  return ret.join('\n');
}

////////////////////////////////////////////////////////////////////////////////
export function test(fileStr: string) {
  for (let {form, tag, isLemma} of iterateDictCorpVizLines(fileStr.split('\n'))) {
    MorphTag.fromVesumStr(tag, form);
  }
}

////////////////////////////////////////////////////////////////////////////////
export function presentTagsForDisamb(interps: MorphInterp[]) {
  let splitted = interps.map((x, index) => ({index, lemma: x.lemma, flags:x.tag.split(':')}));
  let sorted = stableSort(splitted, (a, b) => compareTags(MorphTag.fromVesum(a.flags), MorphTag.fromVesum(b.flags)));
  
  let aligned = alignTagList(sorted.map(x => x.flags));
  let flags = aligned.map(x => x.map(x => []));

  for (let [i, posAgg] of aligned.entries()) {
    let maxNumFlags = Math.max(...posAgg.map(x => x.length));
    for (let k = 0; k < maxNumFlags; ++k) {
      let areAllEqual = posAgg.every(x => x[k] === posAgg[0][k]);
      for (let j = 0; j < posAgg.length; ++j) {
        flags[i][j].push({
          content: posAgg[j][k] || '',
          isMarked: !areAllEqual
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
      index: sorted[shift + i].index
    })));
    shift += posAgg.length;
  };
  return ret;
}

//------------------------------------------------------------------------------
function alignTagList(flags: string[][]) {
  let ret = new Array<Array<Array<string>>>();  // [pos][tag][flag]

  let poses = groupTableBy(flags, 0);
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
    let pos = tryMapVesumFlag(posAgg[0][0]).vesum;
    let featureOrderMap = arr2indexMap((FEATURE_ORDER[pos] || FEATURE_ORDER.other).filter(x => features.has(x)));

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