#!/usr/bin/env node --max-old-space-size=5120

import { mu } from '../mu'
import { isString } from 'util'
import { linesSync } from '../utils.node'

const args = require('minimist')(process.argv.slice(2))

let [path, funcName, ...funcArgsRaw] = args._
let moduleObj = require('../' + path)
let func = moduleObj[funcName]

let funcArgs = mu(funcArgsRaw).map((x) => {
  if (isString(x) && x.startsWith('lines:')) {
    return linesSync(x.substr('lines:'.length))
  }
  return x
})

func(...funcArgs)
