export function keyvalue2attributesNormalized(obj: any) {
  return Object.keys(obj)
    .filter((key) => key.trim() && obj[key] !== undefined && obj[key] !== null)
    .map((key) => {
      key = key.replace(/-/g, '_') // compilecorp doesn't accept dashes
      let value = obj[key]
        .toString()
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\\$/, '\\ ') // todo
        .replace(/\\"/g, '\\\\"') // compilecorp uses this escape, not entities
        .replace(/"/g, '\\"') // compilecorp uses this escape, not entities
      return `${key}="${value}"`
    })
    .join(' ')
}
