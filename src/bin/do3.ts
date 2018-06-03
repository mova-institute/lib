#!/usr/bin/env node --max-old-space-size=5120

import * as minimist from 'minimist'
import { getLibRootRelative } from '../lib_path.node'



const args = minimist(process.argv.slice(2))

let [path, funcName, ...funcArgs] = args._
args._ = funcArgs
let moduleObj = require(getLibRootRelative(path))

moduleObj[funcName](args)
