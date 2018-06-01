#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import * as algo from '../../algo'
import { parseXmlFileSync } from '../../xml/utils.node'
import { linesSync, write2jsonFile } from '../../utils.node'
import { isString, last } from '../../lang'
import { trimExtension } from '../../string_utils'
import { firstMatch } from '../../string_utils'
import { serializeMiDocument } from '../../nlp/utils'
import { parseBratFile } from './utils'
import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { toSortableDatetime } from '../../date'

import * as glob from 'glob'
import * as minimist from 'minimist'
import groupby = require('lodash.groupby')



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  const now = toSortableDatetime(new Date())

  const args = minimist(process.argv.slice(2), {
    boolean: [
    ],
  }) as any

  let [goldenDir, bratGlob] = args._
  let allBratFiles = glob.sync(bratGlob)
  let bratFilesRoot = algo.commonPrefix(allBratFiles[0], last(allBratFiles))
  let bratFilesGrouped = groupby(allBratFiles, x => firstMatch(x, /\/([^/]+)\/\d+\.ann$/, 1))

  let id2bratPath = {} as any
  for (let [bratName, bratFiles] of Object.entries(bratFilesGrouped)) {
    let xmlFile = path.join(goldenDir, `${bratName}.xml`)
    if (!fs.existsSync(xmlFile)) {
      // throw new Error(`No xml file to adopt in: "${xmlFile}"`)
      console.error(`No xml file to adopt in: "${xmlFile}"`)
      continue
    }
    console.log(`adopting ${path.basename(xmlFile)}`)
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
          id2bratPath[span.annotations.N] = trimExtension(path.relative(bratFilesRoot, bratFile))
        }
      }
    }
    fs.writeFileSync(xmlFile, serializeMiDocument(root))
    if (args.id2bratPath) {
      write2jsonFile(args.id2bratPath, id2bratPath)
    }
  }
}

if (require.main === module) {
  main()
}
