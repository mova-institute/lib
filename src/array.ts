import { last } from './lang'



export function flatten2d<T>(array: Iterable<Array<T>>) {
  return ([] as Array<T>).concat(...array)
}

export function trimBack<T>(array: Array<T>, trimPred = x => !x) {
  while (array.length && trimPred(last(array))) {
    array.pop()
  }
}

export function trimFront<T>(array: Array<T>, trimPred = x => !x) {
  array.splice(0, array.findIndex(x => !trimPred(x)))
}

export function trim<T>(array: Array<T>, trimPred = x => !x) {
  trimBack(array, trimPred)
  trimFront(array, trimPred)
}

export function appendLast(array: Array<string>, what: string) {
  array[array.length - 1] += what
}

export function pushTruthy<T>(array: Array<T>, value: T) {
  if (value) {
    array.push(value)
  }
}
