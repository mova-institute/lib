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
export function trimExtension(filename: string) {
  let dotIndex = filename.lastIndexOf('.')
  return dotIndex < 0 ? filename : filename.substr(0, dotIndex)
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
