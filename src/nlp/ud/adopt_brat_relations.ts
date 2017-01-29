#!/usr/bin/env node

import * as fs from 'fs'
// import { join } from 'path'
import { parseXmlFileSync } from '../../xml/utils.node'
import { linesSync } from '../../utils.node'
import { firstMatch } from '../../string_utils'
import { extractInfoFromBrat } from '../../nlp/utils'

import * as glob from 'glob'
import * as minimist from 'minimist'
import groupby = require('lodash.groupby')



const bratPrefix2xmlFilename = {
  'babornia': 'laiuk__babornia',
  'dzhaz': 'polishchuk__dzhaz',
  'haz': 'zakon__metan',
  'pidslukhano': 'sotsmerezhi__pidslukhano_kma',
  'prokhasko': 'prokhasko__opovidannia',
  'shcherbachov': 'umoloda__shcherbachov',
  'tyhrolovy': 'bahrianyi__tyhrolovy',
  'vichnyk': 'sverstiuk__vichnyk',
  'zakon_tvaryny': 'zakon__tvaryny',
}

function main() {
  const args = minimist(process.argv.slice(2)) as any

  let [xmlFiles, allBratFiles] = args._.map(x => glob.sync(x)) as string[][]
  let bratFilesGrouped = groupby(allBratFiles, x => firstMatch(x, /\/([^/]+)_\d+\.ann$/, 1))

  for (let [bratName, bratFiles] of Object.entries(bratFilesGrouped)) {
    let xmlFile = `${bratName}.xml`
    if (!fs.existsSync(xmlFile)) {
      xmlFile = bratPrefix2xmlFilename[bratName]
      if (!xmlFile) {
        // console.log(`dddd ${xmlFile}`)
        console.error(`Skipping ${bratName} files`)
        continue
      }
      xmlFile = xmlFiles.find(x => x.endsWith(`${xmlFile}.xml`))
    }
    let root = parseXmlFileSync(xmlFile)

    let n2element = {} as any
    root.evaluateElements('//*[@n]')
      .forEach(x => n2element[x.attribute('n')] = x)

    for (let bratFile of bratFiles) {
      extractInfoFromBrat(n2element, linesSync(bratFile), bratFile)
    }
    fs.writeFileSync(xmlFile, root.serialize())
  }
}

if (require.main === module) {
  main()
}
