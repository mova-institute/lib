import { findIndexwiseDiff } from './algo'

export function markIndexwiseStringDiff(arr: Array<string>, spanClass: string) {
  let ret = new Array<string>(arr.length).fill('')
  let curIndex = 0
  for (let [diffIndex, diffLen] of findIndexwiseDiff(arr)) {
    for (let i = 0; i < ret.length; ++i) {
      ret[i] +=
        arr[i].substring(curIndex, diffIndex) +
        `<span class="${spanClass}">` +
        arr[i].substr(diffIndex, diffLen) +
        '</span>'
    }
    curIndex = diffIndex + diffLen
  }
  for (let i = 0; i < ret.length; ++i) {
    ret[i] += arr[i].substr(curIndex)
  }
  //console.log(ret)
  return ret
}
