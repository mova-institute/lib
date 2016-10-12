import { readFileSync } from 'fs'
import { parseHtmlString } from 'libxmljs'
import { LibxmljsDocument, LibxmljsElement } from 'xmlapi-libxmljs'



////////////////////////////////////////////////////////////////////////////////
export function parseXml(xmlstr: string) {  // todo: kill
  return LibxmljsDocument.parse(xmlstr).root()
}

////////////////////////////////////////////////////////////////////////////////
export function parseHtml(html: string) {
  return new LibxmljsDocument(parseHtmlString(html)).root()
}


////////////////////////////////////////////////////////////////////////////////
export function parseXmlFileSync(filename: string) {
  let xmlstr = readFileSync(filename, 'utf8')
  return parseXml(xmlstr)
}