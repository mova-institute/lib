import { zerofill } from './string_utils'



const ukMonthMap = new Map([
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

////////////////////////////////////////////////////////////////////////////////
export function toSortableDate(date: Date) {
  return `${date.getFullYear()}-${zerofill(date.getMonth() + 1, 2)}-${zerofill(date.getDate(), 2)}`
}

////////////////////////////////////////////////////////////////////////////////
export function isDayUkMonthCommaYear(value: string) {
  return dayUkMonthCommaYearRe.test(value)
}


////////////////////////////////////////////////////////////////////////////////
// '20 жовтня, 1998' —> Date
export function dayUkmonthCommaYear2date(value: string) {
  let [, d, m, y] = value.match(dayUkMonthCommaYearRe)
  return new Date(Number(y), ukMonthMap.get(m), Number(d))
}

////////////////////////////////////////////////////////////////////////////////
export function dayUkmonth2date(value: string) {
  let [, d, m] = value.match(/^(\d+)\s+([^,]+)/)
  return new Date(null, ukMonthMap.get(m), Number(d))
}
