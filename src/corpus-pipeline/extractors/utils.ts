import { AbstractElement } from 'xmlapi'
import { mu } from '../../mu'



export const GENITIVE_UK_MON_MAP = new Map([
  ['січня', '01'],
  ['лютого', '02'],
  ['березня', '03'],
  ['квітня', '04'],
  ['травня', '05'],
  ['червня', '06'],
  ['липня', '07'],
  ['серпня', '08'],
  ['вересня', '09'],
  ['жовтня', '10'],
  ['листопада', '11'],
  ['грудня', '12'],
])


////////////////////////////////////////////////////////////////////////////////
export function canonical(root: AbstractElement) {
  return textOf(root, '/html/head/link[@rel="canonical"]/@href')
}

////////////////////////////////////////////////////////////////////////////////
export function metaProperty(root: AbstractElement, key: string) {
  return textOf(root, `//meta[@property="${key}"]/@content`)
}

////////////////////////////////////////////////////////////////////////////////
export function ogValue(root: AbstractElement, key: string) {
  return metaProperty(root, `og:${key}`)
}

////////////////////////////////////////////////////////////////////////////////
export function textOf(root: AbstractElement, xpath: string) {
  return root.evaluateString(`string(${xpath})`)
}

////////////////////////////////////////////////////////////////////////////////
export function textsOf(root: AbstractElement, xpath: string) {
  return mu(root.evaluateElements(xpath))
    .map(x => x.text())
    .toArray()
}
