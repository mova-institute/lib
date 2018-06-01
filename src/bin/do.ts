#!/usr/bin/env node --max-old-space-size=5120

import { ioArgs } from '../cli'
import { readTillEnd } from '../stream.node'
import { parseXml } from '../xml/utils.node'
import { BufferedBackpressWriter } from '../backpressing_writer'

const args = require('minimist')(process.argv.slice(2), {
  boolean: [
    'xml',
    'inplace',
    'v',
    'byline',
  ],
})

let [path, funcName, filename1, filename2] = args._
if (args.inplace) {
  filename2 = filename1
}

let moduleObj = require('../' + path)
let func = moduleObj[funcName]


ioArgs(filename1, filename2, async (input, output) => {
  let writer = new BufferedBackpressWriter(output, input)
  try {
    let inputStr: any = await readTillEnd(input)
    if (args.v) {
      console.error('doing')
    }
    if (args.byline) {
      inputStr = inputStr.split('\n')
    }

    if (args.xml) {
      let root = parseXml(inputStr)
      let res = func(root)
      if (typeof res === 'string') {
        output.write(res)
      } else {
        output.write((res || root)
          .document()
          .serialize(true))
      }
    } else {
      let res = func(inputStr)
      if (typeof res === 'object' && Symbol.iterator in res) {
        for (let line of res) {
          writer.write(line)
          // if (!args.byline) {
          writer.write('\n')
          // }
        }
      } else if (res) {
        output.write(res)
      }
    }
  } catch (e) {
    console.error(e.stack)
  }
})
