import {MAP_VESUM, MorphTag} from './morph_tag';


const FORM_PADDING = '  ';


// Expands dict_corp_viz.txt tag into an array of unambiguous morph interpretations
////////////////////////////////////////////////////////////////////////////////
export function expandVesumTag(value: string) {
  let [mainFlagsStr, altFlagsStr] = value.split(/:&_|:&(?=adjp)/);  // adj:m:v_zna:rinanim:&adjp:pasv:imperf

  let mainFlagsArray = mainFlagsStr.split(':');
  let mainFlags = new Set(mainFlagsArray);
  let arrayFeature = [];
  for (let flag of mainFlagsArray) {
    if (MAP_VESUM.has(flag)) {
      let feature = MAP_VESUM.get(flag).featStr;
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
      yield {form, tag, lemma, lemmaTag, isLemma, line, lineNum};
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