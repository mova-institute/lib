#!/usr/bin/env node

import { logErrAndExit } from '../utils.node'
import { allMatches } from '../string'
import { mu } from '../mu'

import * as glob from 'glob'

import * as fs from 'fs'

async function main() {
  let [pyGlob, poFilePath] = process.argv.slice(2)

  let pyFiles = glob.sync(pyGlob)
  let allPy = pyFiles.map((x) => fs.readFileSync(x, 'utf8')).join('\n')

  let po = fs.readFileSync(poFilePath, 'utf8')
  let keys = new Set<string>()
  let out = po.replace(
    /(?:#[^\n]*\n)*msgid "([^\n]*)"\nmsgstr "([^\n]*)"\n*/gm,
    (match, key, transl) => {
      keys.add(key)
      if (![`'${key}'`, `"${key}"`].some((x) => allPy.includes(x))) {
        return ''
      }
      return match
    },
  )

  let matchStream = mu(allMatches(allPy, /\b_\('([^']+)'\)/g)).map((x) => x[1])
  let keysToAdd = new Set<string>()
  for (let keyInPy of matchStream) {
    if (!keys.has(keyInPy)) {
      keysToAdd.add(keyInPy)
    }
  }
  out += mu(keysToAdd.values())
    .map((x) => `\nmsgid "${x}"\nmsgstr ""`)
    .join('\n')
  // fs.writeFileSync(`${poFilePath}.bak`, po)
  fs.writeFileSync(poFilePath, out)
}

if (require.main === module) {
  main().catch(logErrAndExit)
}
