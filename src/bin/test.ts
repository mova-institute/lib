// import {INode, IElement, IDocument} from 'xmlapi'
import { LibxmljsDocument, LibxmljsElement } from 'xmlapi-libxmljs'
import { readFileSync } from 'fs'
import * as fs from 'fs'
// import {dirname} from 'path'
import * as libxmljs from 'libxmljs'
// const libxmljs = require('libxmljs')
// import {traverseDepth} from '../xml/utils'
// import {PgClient} from '../postrges'
// import {parseXmlString} from 'libxmljs'
// import { ClientConfig } from 'pg'
// import {sleep} from '../lang'
import { toUdString } from '../nlp/ud/tagset'
import { MorphInterp } from '../nlp/morph_interp'
import * as glob from 'glob'
import { parseUmolodaArticle } from '../nlp/parsers/umoloda'
import { parseDztArticle } from '../nlp/parsers/dzt'
import { fetchText } from '../nlp/grabbers/utils'

// export const config: ClientConfig = {
//   host: 'localhost',
//   port: 5433,
//   database: 'mi_dev',
//   user: 'annotator',
//   password: '@nn0t@t0zh3',
// }

// let s = fs.createWriteStream('/Users/msklvsk/Downloads/doo.txt')
// let fl = s.write('doodle'.repeat(100000))
// // s.end()
// console.log(fl)
// console.log(s.bytesWritten)
// process.exit(0)


main()

function main() {

  let articles = glob.sync('/Users/msklvsk/Developer/mova-institute/workspace/dzt/fetched_articles/**/*.html')

  for (let article of articles) {
    let content = readFileSync(article, 'utf8')
    let a = parseDztArticle(content, htmlDocCreator)
    console.log(a)
    // if (!a.paragraphs.length) {
    //   console.log(a)
    //   console.log(article)
    // }
    // a.content = a.content.substr(0, 30)
    // if ('<p class="content"></p>\n' === a.content) {
    // console.log(article)
    // if (!a.title.length || ! a.date.length/* || !a.author.length*/) {
      // console.log(article)
      // console.log(a.content)
      // docCreator(a.content)
      // console.log('\n\n\n\n')
    // }
    // console.log(a.title)
    // }
  }
}

function docCreator(xmlstr: string) {
  return new LibxmljsDocument(libxmljs.parseXmlString(xmlstr))
}

function htmlDocCreator(xmlstr: string) {
  return new LibxmljsDocument(libxmljs.parseHtml(xmlstr))
}
