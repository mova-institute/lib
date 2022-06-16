import { AbstractElement } from '../../xml/xmlapi/abstract_element'
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


export function canonical(root: AbstractElement) {
  return textOf(root, '/html/head/link[@rel="canonical"]/@href')
}

export function metaProperty(root: AbstractElement, key: string) {
  return textOf(root, `//meta[@property="${key}"]/@content`)
}

export function ogValue(root: AbstractElement, key: string) {
  return metaProperty(root, `og:${key}`)
}

export function textOf(root: AbstractElement, xpath: string) {
  return root.evaluateString(`string(${xpath})`)
}

export function textsOf(root: AbstractElement, xpath: string) {
  return mu(root.evaluateElements(xpath))
  .map(x => x.text())
  .toArray()
}

export function brbr2paragraphs(root: AbstractElement) {
  if (!root) {
    return []
  }
  let ret = new Array<string>()
  let nodes = root.evaluateNodes('.//text() | .//br').toArray()
  let buf = ''
  for (let node of nodes) {
    if (node.isText()) {
      buf += node.text().trim()
    } else if (node.isElement() && node.asElement().localName() === 'br') {
      buf = buf.trim()
      if (buf) {
        ret.push(buf)
        buf = ''
      }
    }
  }
  buf = buf.trim()
  if (buf) {
    ret.push(buf)
  }

  return ret
}
export function nameFromLoginAtDomain(login: string, domain: string) {
  return `${login} @ ${domain}`
}
