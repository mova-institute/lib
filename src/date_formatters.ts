import { zerofill } from './string'

export function formatSpanHhMmSs(msec: number) {
  let seconds = Math.floor(msec / 1000)
  let ss = seconds % 60
  let hh = Math.floor(seconds / 3600)
  let mm = Math.floor((seconds % 3600) / 60)

  return [hh, mm, ss].map((x) => zerofill(x, 2)).join(':')
}

export function formatSpanMmSs(msec: number) {
  let seconds = Math.floor(msec / 1000)
  let ss = seconds % 60
  let mm = Math.floor(seconds / 60)

  return [mm, ss].map((x) => zerofill(x, 2)).join(':')
}
