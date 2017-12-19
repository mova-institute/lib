////////////////////////////////////////////////////////////////////////////////
export function singleMatchOrThrow(str: string, regexp: RegExp, groupIndex = 0) {
  regexp = cloneWithGlobal(regexp)
  let match = regexp.exec(str)
  if (!match) {
    return undefined
  }

  let ret = match[groupIndex]

  if (regexp.exec(str)) {
    throw new Error(`More than one match`)
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function cloneWithGlobal(regexp: RegExp) {
  return new RegExp(regexp.source, `${regexp.flags}g`)
}

////////////////////////////////////////////////////////////////////////////////
export function firstMatch(str: string, regex: RegExp, groupIndex = 0) {
  let match = str.match(regex)
  if (match) {
    return match[groupIndex]
  }
}

////////////////////////////////////////////////////////////////////////////////
export function allcaps2TitlecaseDirty(str: string) {
  return str.split(/\s+/).map(word => {
    if (isAllcaps(word)) {
      return titlecaseToken(word)
    }
    return word
  }).join(' ')
}

////////////////////////////////////////////////////////////////////////////////
export function isAllcaps(str: string) {
  return str === str.toUpperCase()
}

////////////////////////////////////////////////////////////////////////////////
export function isAllLower(str: string) {
  return str === str.toLowerCase()
}

////////////////////////////////////////////////////////////////////////////////
export function trimAfterFirst(toBeTrimmed: string, substring: string) {
  let index = toBeTrimmed.indexOf(substring)
  return index < 0 ? toBeTrimmed : toBeTrimmed.substr(0, index)
}

////////////////////////////////////////////////////////////////////////////////
export function trimBeforeFirst(toBeTrimmed: string, substring: string) {
  let index = toBeTrimmed.indexOf(substring)
  return index < 0 ? toBeTrimmed : toBeTrimmed.substr(index+1)
}

////////////////////////////////////////////////////////////////////////////////
export function trimAfterLast(toBeTrimmed: string, substring: string) {
  let index = toBeTrimmed.lastIndexOf(substring)
  return index < 0 ? toBeTrimmed : toBeTrimmed.substr(0, index)
}

////////////////////////////////////////////////////////////////////////////////
export function trimBeforeLast(toBeTrimmed: string, substring: string) {
  let index = toBeTrimmed.lastIndexOf(substring)
  return index < 0 ? toBeTrimmed : toBeTrimmed.substr(index+1)
}

////////////////////////////////////////////////////////////////////////////////
export function trimExtension(filename: string) {
  return trimAfterLast(filename, '.')
}

////////////////////////////////////////////////////////////////////////////////
export function trimExtensions(path: string) {
  let lastSlashIndex = path.lastIndexOf('/')
  let dotIndex = path.indexOf('.', lastSlashIndex)
  return path.substr(0, dotIndex)
}

////////////////////////////////////////////////////////////////////////////////
export function titlecaseToken(str: string) {
  return str[0].toUpperCase() + str.substr(1).toLowerCase()
}

////////////////////////////////////////////////////////////////////////////////
export function titlecase(str: string, splitter = /[\s\-]\S/g) {
  let chars = [...str]
  if (chars.length) {
    chars[0] = chars[0].toUpperCase()
  }
  regexMatchIndexes(str, splitter).forEach(i => chars[i + 1] = chars[i + 1].toUpperCase())
  return chars.join('')
}

////////////////////////////////////////////////////////////////////////////////
export function regexMatchIndexes(str: string, regex: RegExp) {
  let ret = new Array<number>()
  let match: RegExpExecArray | null
  while (match = regex.exec(str)) {
    ret.push(match.index)
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
/** replaceCaseAware('ГагаГа', /г/ig, 'ґ') === 'ҐаґаҐа' */
export function replaceCaseAware(str: string, substr: string | RegExp, newSubStr: string) {
  return str.replace(substr as any, (match) => {  // todo
    if (match.length !== newSubStr.length) {
      throw new Error(`Replace string length mismatch: ${match} ~ ${newSubStr}`)
    }
    let mask = uppercaseMask(match)
    return applyUppercaseMask(newSubStr, mask)
  })
}

////////////////////////////////////////////////////////////////////////////////
export function replaceLoop(str: string, pattern: RegExp | string, replacer: string) {
  let ret: string
  while ((ret = str.replace(pattern, replacer)) !== str) {
    str = ret
  }
  return ret
}


////////////////////////////////////////////////////////////////////////////////
export function uppercaseMask(str: string) {
  let uppercase = str.toUpperCase()
  return [...uppercase].map((x, i) => x === str.charAt(i))
}

////////////////////////////////////////////////////////////////////////////////
export function applyUppercaseMask(str: string, mask: boolean[]) {
  return [...str].map((x, i) => mask[i] ? x.toUpperCase() : x.toLowerCase()).join('')
}

////////////////////////////////////////////////////////////////////////////////
export function startsWithCapital(str: string) {
  return str && str.charAt(0).toLowerCase() !== str.charAt(0)
}

////////////////////////////////////////////////////////////////////////////////
export function capitalizeFirst(str: string) {
  return str[0].toUpperCase() + str.substr(1)
}

////////////////////////////////////////////////////////////////////////////////
export function numDigits(integer: number) {
  if (integer === 0) {
    return 1
  }
  return Math.floor(Math.log10(integer)) + 1
}

////////////////////////////////////////////////////////////////////////////////
export function zerofill(n: number, width: number) {
  let numZeroes = width - numDigits(n)
  if (numZeroes > 0) {
    return '0'.repeat(numZeroes) + n
  }
  return n.toString()
}

////////////////////////////////////////////////////////////////////////////////
export function zerofillMax(n: number, max: number) {
  return zerofill(n, numDigits(max))
}

////////////////////////////////////////////////////////////////////////////////
export function isDeceimalInt(str: string) {
  return /^\d+$/.test(str)
}

////////////////////////////////////////////////////////////////////////////////
export function findAllIndexes(str: string, char: string) {
  let ret = new Array<number>()
  for (var i = 0; i < str.length; ++i) {
    if (str[i] === char) {
      ret.push(i)
    }
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function insertAtIndexes(str: string, indexes: number[], what: string) {
  if (!indexes.length) {
    return str
  }

  let ret = ''
  let j = 0
  for (let i = 0; i < str.length; ++i) {
    ret += str[i]
    if (j < indexes.length && i === indexes[j]) {
      ret += what
      ++j
    }
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function toPercent(nominator: number, denominator: number, aftercomma = 0) {
  return ((nominator / denominator) * 100).toFixed(aftercomma)
}

////////////////////////////////////////////////////////////////////////////////
export function toFloorPercent(nominator: number, denominator: number, aftercomma = 0) {
  let exp = 10 ** aftercomma
  return (Math.floor(nominator / denominator * exp * 100) / exp).toFixed(aftercomma)
}

////////////////////////////////////////////////////////////////////////////////
export function joinAsRe(parts: string[], flags = '') {
  return new RegExp(parts.join('|'), flags)
}
////////////////////////////////////////////////////////////////////////////////
export function isTitlecase(str: string) {
  return isAllcaps(str[0]) && isAllLower(str.substr(1))
}
