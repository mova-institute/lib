import { readFileSync } from 'fs'
import { parseHtmlString } from 'libxmljs'
import { LibxmljsDocument } from './xmlapi-libxmljs/libxmljs_document'
import { LibxmljsElement } from './xmlapi-libxmljs/libxmljs_element'



////////////////////////////////////////////////////////////////////////////////
export function parseXml(xmlstr: string) {  // todo: kill
  return LibxmljsDocument.parse(xmlstr).root()
}

////////////////////////////////////////////////////////////////////////////////
export function parseHtml(html: string) {
  return new LibxmljsDocument(parseHtmlString(html)).root()
}

////////////////////////////////////////////////////////////////////////////////
export function tryParseHtml(html: string) {
  try {
    return parseHtml(html)
  } catch (e) {
    return
  }
}

////////////////////////////////////////////////////////////////////////////////
export function parseXmlFileSync(path: string) {
  let xmlstr = readFileSync(path, 'utf8')
  return parseXml(xmlstr)
}

////////////////////////////////////////////////////////////////////////////////
export function parseHtmlFileSync(path: string) {
  let xmlstr = readFileSync(path, 'utf8')
  return new LibxmljsDocument(parseHtmlString(xmlstr)).root()
}
