#!/usr/bin/env node --max-old-space-size=5120


const args = require('minimist')(process.argv.slice(2))

let [path, funcName] = args._
let moduleObj = require('../' + path)
let func = moduleObj[funcName]

args._ = args._.slice(2)
func(args)
