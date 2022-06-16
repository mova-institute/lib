import { zerofill } from './string'

export const ukMonthMap = new Map([
  ['січня', 0],
  ['лютого', 1],
  ['березня', 2],
  ['квітня', 3],
  ['травня', 4],
  ['червня', 5],
  ['липня', 6],
  ['серпня', 7],
  ['вересня', 8],
  ['жовтня', 9],
  ['листопада', 10],
  ['грудня', 11],
])

const dayUkMonthCommaYearRe = /^(\d+)\s+([^,]+),\s+(\d{4})/
const dayUkMonthYearRe = /^(\d+)\s+(\S+)\s+(\d{4})/
const dayUkMonthYearTimeRe = /^(\d+)\s+(\S+)\s+(\d{4}) (\d\d):(\d\d):(\d\d)/

export function fromUnixStr(timestamp: string) {
  return new Date(Number(timestamp) * 1000)
}

export function toSortableDatetime(date: Date) {
  let hh = zerofill(date.getHours(), 2)
  let mm = zerofill(date.getMinutes(), 2)
  let ss = zerofill(date.getSeconds(), 2)

  return `${toSortableDate(date)} ${hh}:${mm}:${ss}`
}

export function toSortableDateParts(date: Date) {
  return [
    date.getFullYear(),
    zerofill(date.getMonth() + 1, 2),
    zerofill(date.getDate(), 2),
  ]
}

export function toSortableDate(date: Date) {
  let [y, m, d] = toSortableDateParts(date)
  return `${y}-${m}-${d}`
}

export function nowSortableDatetime() {
  return toSortableDatetime(new Date())
}

export function isDayUkMonthCommaYear(value: string) {
  return dayUkMonthCommaYearRe.test(value)
}

// '20 жовтня, 1998' —> Date
export function dayUkmonthCommaYear2date(value: string) {
  let [, d, m, y] = value.match(dayUkMonthCommaYearRe)
  return new Date(Number(y), ukMonthMap.get(m), Number(d))
}

// '20 жовтня 1998' —> Date
export function dayUkmonthYear2date(value: string) {
  let [, d, m, y] = value.match(dayUkMonthYearRe)
  return new Date(Number(y), ukMonthMap.get(m), Number(d))
}

// '20 жовтня 1998 14:30:43' —> Date
export function dayUkmonthYearTime2date(value: string) {
  let [, day, month, year, hour, min, sec] = value.match(dayUkMonthYearTimeRe)
  return new Date(
    Number(year),
    ukMonthMap.get(month),
    Number(day),
    Number(hour),
    Number(min),
    Number(sec),
  )
}

export function dayUkmonth2date(value: string) {
  let [, d, m] = value.match(/^(\d+)\s+([^,]+)/)
  return new Date(null, ukMonthMap.get(m), Number(d))
}
