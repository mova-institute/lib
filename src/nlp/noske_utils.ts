////////////////////////////////////////////////////////////////////////////////
export function keyvalue2attributesNormalized(obj: any) {
  return Object.keys(obj)
    .filter(key => key.trim() && obj[key] !== undefined && obj[key] !== null /* todo: wut? */)
    .map(key => {
      let value = obj[key].toString().replace(/\s+/g, ' ').trim()
      value = value.replace(/"/g, '\\"')
      return `${key}="${value}"`
    })
    .join(' ')
}
