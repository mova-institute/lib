/* tslint:disable:no-unused-variable no-unused-imports */

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
import { mu } from '../mu'
import * as _ from 'lodash'
import { CatStream } from '../cat_stream'
import { execSync, spawnSync, spawn, exec } from 'child_process'
import { StreamDataIterator } from '../lib/nextify/stream_data_iterator'

// export const config: ClientConfig = {
//   host: 'localhost',
//   port: 5433,
//   database: 'mi_dev',
//   user: 'annotator',
//   password: '@nn0t@t0zh3',
// }


// testPerf()




async function main() {
  for await (let chunk of new StreamDataIterator<Buffer>(process.stdin)) {
    console.log(chunk.byteLength)
  }
}



main()






































































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
