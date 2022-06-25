export function hasProperties(object: Record<any, any>) {
  for (let _ in object) {
    return true
  }
  return false
}
