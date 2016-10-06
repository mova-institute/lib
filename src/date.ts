import { zerofill } from './string_utils'


////////////////////////////////////////////////////////////////////////////////
export function toSortableDate(date: Date) {
  return `${date.getFullYear()}-${zerofill(date.getMonth(), 2)}-${zerofill(date.getDate(), 2)}`
}
