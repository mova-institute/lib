#!/usr/bin/env node --max-old-space-size=5120

import * as minimist from 'minimist'



const args = minimist(process.argv.slice(2))

let [path, funcName, ...funcArgs] = args._
args._ = funcArgs
let moduleObj = require('../' + path)

moduleObj[funcName](args)
