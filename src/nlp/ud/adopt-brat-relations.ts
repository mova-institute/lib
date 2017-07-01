#!/usr/bin/env node

import * as fs from 'fs'
// import { join } from 'path'
import { parseXmlFileSync } from '../../xml/utils.node'
import { linesSync } from '../../utils.node'
import { isString } from '../../lang'
import { firstMatch } from '../../string_utils'
import { serializeMiDocument } from '../../nlp/utils'
import { parseBratFile } from './utils'
import { AbstractElement } from 'xmlapi'
import { toSortableDatetime } from '../../date'

import * as glob from 'glob'
import * as minimist from 'minimist'
import groupby = require('lodash.groupby')



const bratPrefix2xmlFilename = {
  // 'babornia': 'laiuk__babornia',
  // 'dzhaz': 'polishchuk__dzhaz',
  // 'haz': 'zakon__metan',
  // 'pidslukhano': 'sotsmerezhi__pidslukhano_kma',
  // 'prokhasko': 'prokhasko__opovidannia',
  // 'shcherbachov': 'umoloda__shcherbachov',
  // 'tyhrolovy': 'bahrianyi__tyhrolovy',
  // 'vichnyk': 'sverstiuk__vichnyk',
  // 'zakon_tvaryny': 'zakon__tvaryny',
}

//------------------------------------------------------------------------------
function main() {
  const now = toSortableDatetime(new Date())

  const args = minimist(process.argv.slice(2), {
    boolean: [
      'depsrc',
    ]
  }) as any

  let [xmlFiles, allBratFiles] = args._.map(x => glob.sync(x)) as string[][]
  let bratFilesGrouped = groupby(allBratFiles, x => firstMatch(x, /\/([^/]+)\/\d+\.ann$/, 1))

  for (let [bratName, bratFiles] of Object.entries(bratFilesGrouped)) {
    let xmlFile = `${bratName}.xml`
    if (!fs.existsSync(xmlFile)) {
      xmlFile = bratPrefix2xmlFilename[bratName]
      if (!xmlFile) {
        console.error(`Skipping ${bratName} files`)
        continue
      }
      xmlFile = xmlFiles.find(x => x.endsWith(`${xmlFile}.xml`))
    }
    console.log(`adopting ${xmlFile}`)
    let root = parseXmlFileSync(xmlFile)

    let n2element = {} as { [key: string]: AbstractElement }
    root.evaluateElements('//*[@id]')
      .forEach(x => n2element[x.attribute('id')] = x)

    for (let bratFile of bratFiles) {
      for (let span of parseBratFile(linesSync(bratFile))) {
        if (isString(span.annotations.N)) {
          let el = n2element[span.annotations.N]
          if (!el) {  // sometimes tokens are deleted in xml but remain in brat
            continue
          }
          el.setAttribute('comment', span.comment)
          let promotedStr = span.annotations.Promoted && 'yes'
          let changed = (el.attribute('promoted') || '') !== (promotedStr || '')
          el.setAttribute('promoted', promotedStr)

          let dependencies = span.arcs
            .filter(x => isString(x.head.annotations.N))
            .map(({ relation, head }) => `${head.annotations.N}-${relation.replace('_', ':')}`)
            .join('|') || undefined
          changed = changed || (el.attribute('dep') || '') !== (dependencies || '')
          el.setAttribute('dep', dependencies)
          if (changed) {
            el.setAttribute('mtime-synt', now)
          }
          el.setAttribute('depsrc', args.depsrc && bratFile || undefined)

        }
      }
    }
    fs.writeFileSync(xmlFile, serializeMiDocument(root))
  }
}

if (require.main === module) {
  main()
}
