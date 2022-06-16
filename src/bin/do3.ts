#!/usr/bin/env node --max-old-space-size=5120

import minimist from 'minimist'
import { getLibRootRelative } from '../lib_path.node'
import { exitOnStdoutPipeError } from '../utils.node'

exitOnStdoutPipeError()
const args = minimist(process.argv.slice(2))

let [address, ...funcArgs] = args._
let [, path, funcName] = address.match(/(.*)\/([^/]*)$/)
let moduleObj = require(getLibRootRelative(path))
moduleObj[funcName || 'main'](...funcArgs)
