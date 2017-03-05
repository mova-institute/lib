/* tslint:disable:no-unused-variable no-unused-imports */

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
import { parseUmolodaArticle } from '../corpus-workflow/parsers/umoloda'
import { parseDztArticle } from '../corpus-workflow/parsers/dzt'
import { parseDenArticle } from '../corpus-workflow/parsers/den'
import { parseZbrucArticle } from '../corpus-workflow/parsers/zbruc'
import { parseTyzhdenArticle } from '../corpus-workflow/parsers/tyzhden'
import { fetchText } from '../corpus-workflow/grabbers/utils'
import { mu } from '../mu'
import * as _ from 'lodash'
import { CatStream } from '../cat_stream'
import { execSync, spawnSync, spawn, exec } from 'child_process'

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
  let files = glob.sync('/Users/msklvsk/Downloads/*.alignment.xml')
  let s = new CatStream(files)
  // let ws = fs.createWriteStream('/Users/msklvsk/Downloads/test1.txt')
  // s.pipe(process.stdout)
  let cp = exec('wc -l')
  cp.on('close', (code) => {
    console.log(`grep process exited with code ${code}`);
  })
  cp.stdout.pipe(process.stdout)
  s.pipe(cp.stdin)
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
    value: v,
  }
}
