import {mapVesumFlag, mapVesumFlagToFeature, MorphTag, FEATURE_ORDER} from './morph_tag';
import {groupTableBy, arr2indexMap} from '../algo';


const FORM_PADDING = '  ';


// Expands dict_corp_viz.txt tag into an array of unambiguous morph interpretations
////////////////////////////////////////////////////////////////////////////////
export function expandVesumTag(value: string) {
  let [mainFlagsStr, altFlagsStr] = value.split(/:&_|:&(?=adjp)/);  // adj:m:v_zna:rinanim:&adjp:pasv:imperf

  let mainFlagsArray = mainFlagsStr.split(':');
  let mainFlags = new Set(mainFlagsArray);
  let arrayFeature = [];
  for (let flag of mainFlagsArray) {
    if (mapVesumFlag(flag)) {
      let feature = mapVesumFlag(flag).featStr;
      if (mainFlagsArray[0] === 'prep' && feature === 'requiredCase' || feature === 'pronounType') {
        arrayFeature.push(flag);
        mainFlags.delete(flag);
      }
    }
  }

  let res = new Array<Array<string>>();
  if (arrayFeature.length) {
    let base = Array.from(mainFlags);
    for (let flag of arrayFeature) {
      res.push([...base, flag]);
    }
  }
  else {
    res.push(mainFlagsArray);
  }

  if (altFlagsStr) {
    let altFlagArray = altFlagsStr.split(':');
    for (let i = 0, length = res.length; i < length; ++i) {
      res.push([...res[i], '&' + altFlagArray[0], ...altFlagArray.slice(1)]);
    }
  }

  let ret = res.map(x => MorphTag.fromVesum(x).toVesumStr());  // sort flags

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function* iterateDictCorpViz(lines: string[]) {
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
  for (let {form, tag, isLemma} of iterateDictCorpViz(fileStr.split('\n'))) {
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
  for (let {form, tag, isLemma} of iterateDictCorpViz(fileStr.split('\n'))) {
    MorphTag.fromVesumStr(tag, form);
  }
}

////////////////////////////////////////////////////////////////////////////////
export function presentTagsForDisamb(tags: string[]) {
  let res = tags.map(x => new Array<string>());
  let shift = 0;

  for (let posAgg of alignTagList(tags)) {
    let maxNumFlags = Math.max(...posAgg.map(x => x.length));
    for (let j = 0; j < maxNumFlags; ++j) {
      let areAllEqual = posAgg.every(x => x[j] === posAgg[0][j]);
      let maxFlagLen = Math.max(...posAgg.map(x => x[j] ? x[j].length : 0));
      for (let i = 0; i < posAgg.length; ++i) {
        let cur = posAgg[i][j] || '';
        cur += '&nbsp;'.repeat(maxFlagLen - cur.length);
        if (!areAllEqual) {
          cur = '<b>' + cur + '</b>';
        }
        res[shift + i].push(cur);
      }
    }
    shift += posAgg.length;
  }

  let ret = res.map(x => x.join(' '));
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
        let feature = mapVesumFlagToFeature(flag);
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
        let feature = mapVesumFlagToFeature(flag);
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