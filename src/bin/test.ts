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
import { sleep } from '../lang'
import { toUdString } from '../nlp/ud/tagset'
import { MorphInterp } from '../nlp/morph_interp'
import * as glob from 'glob'
import { parseUmolodaArticle } from '../nlp/parsers/umoloda'
import { parseDztArticle } from '../nlp/parsers/dzt'
import { parseDenArticle } from '../nlp/parsers/den'
import { fetchText } from '../nlp/grabbers/utils'
import { mu } from '../mu'
import *as _ from 'lodash'


// export const config: ClientConfig = {
//   host: 'localhost',
//   port: 5433,
//   database: 'mi_dev',
//   user: 'annotator',
//   password: '@nn0t@t0zh3',
// }


// testPerf()



main()

function main() {

  let articles = glob.sync('/Users/msklvsk/Developer/mova-institute/workspace/den/fetched_articles/*/**/*.html')

  for (let article of articles) {
    let content = readFileSync(article, 'utf8')
    try {
      var parsed = parseDenArticle(content, htmlDocCreator)
    } catch (e) {
      console.error(`errr ${article} ${e.message}`)
    }
    let { author, date, description, paragraphs, title, url} = parsed
    // let log = Object.keys(parsed).map(x => {
    //   let ret = `${x.substr(0,5)}="`
    //   if (!parsed[x].toString().trim()) {
    //     ret += '##############'
    //   } else if (x!=='paragraphs') {
    //     ret += parsed[x].toString().substr(0, 15)
    //   } else {
    //     ret += `${parsed[x].length}, ${parsed[x][0].substr(0, 20).replace(/\s+/g, ' ')}`
    //   }
    //   return ret + '"'
    // }).join(' | ')

    if (!title || !paragraphs.length) {
      console.log(parsed)
    }
    // let log = `${url.substr('http://day.kyiv.ua/uk/article/'.length)} ### ${title} ### ${paragraphs.length}`
    // console.log(log)
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









































































function testPerf() {
  let arr: number[] = []
  for (let i = 0; i < 10000000; ++i) {
    arr.push(Math.random())
  }
  console.log('starting')

  let sum = 0

  console.time('generator')
  // delete mu(arr).map(wrap).map(wrap).toArray()
  for (let i = 0; i < 10; ++i) {
    for (let x of arr) {
      sum += x
    }
  }
  console.timeEnd('generator')

  console.time('array')
  // var res = arr.map(wrap).map(wrap).map(wrap)
  for (let i = 0; i < 10; ++i) {
    for (let i = 0; i < arr.length; ++i) {
      sum += arr[i]
    }
  }
  console.timeEnd('array')

  console.time('forEach')
  for (let i = 0; i < 10; ++i) {
    arr.forEach(x => sum += x)
  }
  console.timeEnd('forEach')
}

function* generate(array: number[]) {
  for (let n of array) {
    if (n < 0.5) {
      yield [n, 'super'.repeat(n * 5) + n]
    } else {
      yield [n, n + 'super'.repeat(n * 10)]
    }
  }
}

function mapp(array: number[]) {
  let ret: [number, string][] = []
  for (let n of array) {
    if (n < 0.5) {
      ret.push([n, 'super'.repeat(n * 5) + n])
    } else {
      ret.push([n, n + 'super'.repeat(n * 10)])
    }
  }
  return ret
}

function wrap(v) {
  return {
    value: v
  }
}