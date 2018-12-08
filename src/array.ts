import { last } from './lang'



////////////////////////////////////////////////////////////////////////////////
export function flatten2d<T>(array: Iterable<Array<T>>) {
  return ([] as Array<T>).concat(...array)
}

////////////////////////////////////////////////////////////////////////////////
export function trimBack<T>(array: Array<T>, pred = x => x) {
  while (pred(last(array))) {
    array.pop()
  }
}
