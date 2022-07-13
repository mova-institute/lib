import { URL } from 'node:url'
import { differenceInYears, parseISO } from 'date-fns'

export interface DocumentAttributes {
  id: string
  title: string
  source: string
  src?: string
  genre?: string
  authors?: Array<string>
  date?: string
  author?: string
  attribution?: string
  'src-is-origin': string // todo
}

export function urlAttributionNeeded({
  src,
  'src-is-origin': srcIsOrigin,
}: DocumentAttributes) {
  if (!src || srcIsOrigin === 'false') {
    return false
  }
  let { hostname } = new URL(src)

  if (['chtyvo.org.ua'].some((x) => x === hostname)) {
    return false
  }
  return true
}

export function authorAttributionNeeded({ src, author }: DocumentAttributes) {
  if (!author) {
    return false
  }
  if (src) {
    if (author.startsWith('[')) {
      return false
    }
  }
  return true
}

export function buildAttribution({ author, title, src }: DocumentAttributes) {
  if (src) {
    let url = new URL(src)
    if (url.hostname.endsWith('pravda.com.ua')) {
      author ||= 'Українська Правда'
    }
    if (url.hostname.endsWith('.wikipedia.org')) {
      author = 'Вікіпедія'
    }
  }
  if (title) {
    title = `“${title}”`
  }
  return [author, title, src].filter((x) => x).join(', ')
}

export function moreLikelyIsPublicDomain(doc: DocumentAttributes) {
  if (['нормативно-правовий акт', 'граматичний приклад'].includes(doc.genre)) {
    return true
  }
  if (doc.date) {
    if (differenceInYears(new Date(), parseISO(doc.date)) >= 70 + 50) {
      // todo
      return true
    }
  }
}

export function isAttributionChecked(doc: DocumentAttributes) {
  if (moreLikelyIsPublicDomain(doc) || doc.author === '[народ]') {
    return true
  }

  if (doc.src) {
    let url = new URL(doc.src)
    if (
      [
        'tereveni.org',
        'www.pravda.com.ua',
        'uk.wikipedia.org',
        'tyzhden.ua',
        'www.president.gov.ua',
        'www.mil.gov.ua',
        'www.bbc.com',
        'umoloda.kiev.ua',
        '2008.plazerazzi.org',
        'zaxid.net',
        'wz.lviv.ua',
        'nv.ua',
        'tabloid.pravda.com.ua',
        'vch-uman.in.ua',
      ].some((x) => x === url.hostname)
    ) {
      return true
    }
  }

  return false
}
