import { AbstractElement } from 'xmlapi'
import { mu } from '../../mu'
import * as nlpUtils from '../../nlp/utils'



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
  return root.evaluateString('string(/html/head/link[@rel="canonical"]/@href)').trim()
}

////////////////////////////////////////////////////////////////////////////////
export function ogValue(root: AbstractElement, key: string) {
  return root.evaluateString(`string(//meta[@property="og:${key}"]/@content)`).trim()
}

////////////////////////////////////////////////////////////////////////////////
export function textOf(root: AbstractElement, xpath: string) {
  return root.evaluateString(`string(${xpath})`).trim()
}

////////////////////////////////////////////////////////////////////////////////
export function normalizedTextsOf(root: AbstractElement, xpath: string) {
  return mu(root.evaluateElements(xpath))
    .map(x => normalizeWebText(x.text()))
    .toArray()
}

////////////////////////////////////////////////////////////////////////////////
export function normalizeWebText(value: string) {
  return nlpUtils.removeInvisibles(value)
    .replace(/\s+/g, ' ')
    .replace(/\u00AD/g, '')
    .trim()
}
