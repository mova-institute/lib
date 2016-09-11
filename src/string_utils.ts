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
