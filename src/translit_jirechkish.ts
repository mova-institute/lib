import { last } from './lang'
import { capitalizeFirst } from './string';
import { APOSTROPHES_COMMON } from './nlp/static'



//------------------------------------------------------------------------------
const palatalizationMap = new Map([
  ['д', 'ď'],
  ['з', 'ź'],
  ['л', 'ľ'],
  ['н', 'ń'],
  ['р', 'ŕ'],
  ['с', 'ś'],
  ['т', 'ť'],
  ['ц', 'ć'],
])

//------------------------------------------------------------------------------
const palatalIotations = new Map([
  ['ю', 'u'],
  ['я', 'а'],
  ['є', 'е'],
])

//------------------------------------------------------------------------------
const iotations = new Set([
  ...palatalIotations.keys(),
  'ї'
])

//------------------------------------------------------------------------------
const cyrToLatMap = new Map([
  ['ї', 'ji'],
  ['ю', 'ju'],
  ['я', 'ja'],
  ['є', 'je'],


  ['а', 'a'],
  ['б', 'b'],
  ['в', 'v'],
  ['г', 'h'],
  ['ґ', 'g'],
  ['д', 'd'],
  ['е', 'e'],
  ['є', 'ě'],
  ['ж', 'ž'],
  ['з', 'z'],
  ['и', 'y'],
  ['і', 'i'],
  ['й', 'j'],
  ['к', 'k'],
  ['л', 'l'],
  ['м', 'm'],
  ['н', 'n'],
  ['о', 'o'],
  ['п', 'p'],
  ['р', 'r'],
  ['с', 's'],
  ['т', 't'],
  ['у', 'u'],
  ['ф', 'f'],
  ['х', 'ch'],
  ['ц', 'c'],
  ['ч', 'č'],
  ['ш', 'š'],
  ['щ', 'šč'],
])

//------------------------------------------------------------------------------
const consonants = new Set([
  'б',
  'г',
  'ґ',
  'д',
  'ж',
  'з',
  'к',
  'л',
  'м',
  'н',
  'п',
  'р',
  'с',
  'т',
  'х',
  'ц',
  'ч',  // todo
  'ш',
])

////////////////////////////////////////////////////////////////////////////////
export function cyrToJirechekish(cyrStr: string) {
  // todo: НАКАЗУЮ
  // todo: budžetiv

  let cyr = [...cyrStr]
  let ret = ''

  let i = 0
  for (let max = cyr.length - 1; i < max; ++i) {
    let lc = cyr[i].toLowerCase()
    let isUpper = lc !== cyr[i]
    let nextLc = cyr[i + 1].toLowerCase()

    if (nextLc === 'ь') {
      let palatalizedLat = palatalizationMap.get(lc)
      if (palatalizedLat !== undefined) {
        ret += toCapitalizedIf(palatalizedLat, isUpper)
        ++i
      }
    } else if (palatalIotations.has(nextLc) && consonants.has(lc)) {
      let lat = palatalizationMap.get(lc) || cyrToLatMap.get(lc)
      if (lat !== undefined) {
        ret += toCapitalizedIf(lat, isUpper)
        ret += toCapitalizedIf(palatalIotations.get(nextLc), cyr[i + 1] !== nextLc)
        ++i
      }
    } else if (APOSTROPHES_COMMON.includes(lc) && iotations.has(nextLc)) {
      continue  // todo: test
    } else {
      ret += convertSingle(cyr[i])
    }
  }

  if (i < cyr.length) {
    ret += convertSingle(last(cyr))
  }

  return ret
}

//------------------------------------------------------------------------------
function convertSingle(cyr: string) {
  let lc = cyr.toLowerCase()
  let isUpper = lc !== cyr
  let lat = cyrToLatMap.get(lc)
  if (lat !== undefined) {
    return toCapitalizedIf(lat, isUpper)
  } else {
    return cyr
  }
}

//------------------------------------------------------------------------------
function toCapitalizedIf(what: string, when: boolean) {
  if (when) {
    return capitalizeFirst(what)
  }

  return what
}
