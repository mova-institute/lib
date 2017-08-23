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
      // throw new Error(`No xml file to adopt in: "${xmlFile}"`)
      console.error(`No xml file to adopt in: "${xmlFile}"`)
      continue
    }
    console.log(`adopting ${xmlFile}`)
    let root = parseXmlFileSync(xmlFile)

    let n2element = new Map(
      root.evaluateElements('//*[@id]')
        .map(x => [x.attribute('id'), x] as [string, AbstractElement]))

    for (let bratFile of bratFiles) {
      for (let span of parseBratFile(linesSync(bratFile))) {
        if (isString(span.annotations.N)) {
          let el = n2element.get(span.annotations.N)
          if (!el) {  // sometimes tokens are deleted in xml but remain in brat
            continue
          }
          el.setAttribute('comment', span.comment)
          let tags = new Array<string>()
          for (let tag of ['Promoted', 'Graft']) {
            if (span.annotations[tag]) {
              tags.push(tag.toLowerCase())
            }
          }
          if (tags.length) {
            el.setAttribute('tags', tags.join(' '))
          } else {
            el.removeAttribute('tags')
          }

          let dependencies = span.arcs
            .filter(x => isString(x.head.annotations.N))
            .map(({ relation, head }) => `${head.annotations.N}-${relation.replace('_', ':')}`)
            .join('|') || undefined
          el.setAttribute('dep', dependencies)
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
