#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import * as algo from '../../algo'
import { parseXmlFileSync } from '../../xml/utils.node'
import { linesSync, writeTojsonFile } from '../../utils.node'
import { isString } from '../../lang'
import { trimExtension } from '../../string'
import { firstMatch } from '../../string'
import { serializeMiDocument } from '../utils'
import { parseBratFile, BratArrow } from './utils'
import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { HELPER_RELATIONS } from './uk_grammar'
import { Dict } from '../../types'

import * as glob from 'glob'
import * as minimist from 'minimist'
import groupby = require('lodash.groupby')



//------------------------------------------------------------------------------
function main() {
  // const now = toSortableDatetime(new Date())

  const args = minimist(process.argv.slice(2), {
    boolean: [
    ],
  })

  let [goldenDir, bratGlob] = args._
  let allBratFiles = glob.sync(bratGlob)
  let bratFilesRoot = algo.commonPrefix(allBratFiles).slice(0, -1)
  let allSyntBratFiles = allBratFiles.filter(x => x.substr(bratFilesRoot.length).startsWith('/ud/'))
  let allCorefBratFiles = allBratFiles.filter(x => x.substr(bratFilesRoot.length).startsWith('/coref/'))
  let syntBratFilesGrouped = groupby(allSyntBratFiles, x => firstMatch(x, /\/([^/]+)\/\d+\.ann$/, 1))
  let corefBratFilesGrouped = groupby(allCorefBratFiles, x => firstMatch(x, /([^/]+)\/[^/]+\.ann$/, 1))

  let id2bratPath: Dict<[string, number]> = {}
  for (let [bratName, syntBratFiles] of Object.entries(syntBratFilesGrouped)) {
    let xmlFile = path.join(goldenDir, `${bratName}.xml`)
    if (!fs.existsSync(xmlFile)) {
      throw new Error(`No xml file to adopt in: "${xmlFile}"`)
      // console.error(`No xml file to adopt in: "${xmlFile}"`)
      // continue
    }
    console.log(`adopting ${path.basename(xmlFile)}`)
    let root = parseXmlFileSync(xmlFile)

    let n2element = new Map(
      root.evaluateElements('//*[@id]')
        .map(x => [x.attribute('id'), x] as [string, AbstractElement]))

    // adopt synt
    for (let bratFile of syntBratFiles) {
      for (let span of parseBratFile(linesSync(bratFile))) {
        if (isString(span.annotations.N)) {
          let el = n2element.get(span.annotations.N)
          if (!el) {  // sometimes tokens are deleted in xml but remain in brat
            continue
          }
          el.setAttribute('comment', span.comment)
          let tags = new Array<string>()
          for (let tag of ['Promoted', 'Graft', 'ItSubj']) {
            if (span.annotations[tag]) {
              tags.push(tag.toLowerCase())
            }
          }
          if (tags.length) {
            el.setAttribute('tags', tags.join(' '))
          } else {
            el.removeAttribute('tags')
          }

          let arrows = span.arrows
            .filter(x => isString(x.head.annotations.N))
          arrows.forEach(x => x.relation = x.relation.replace('_', ':'))
          let [basicArrows, enhancedArrows] = algo.clusterize(arrows,
            x => x.relation.startsWith('-'), [[], []])

          basicArrows.sort(basicRelationsFirstCompare)
          el.setAttribute('dep', bratArrowsToAttribute(basicArrows))

          enhancedArrows.forEach(x => x.relation = x.relation.substr(1))
          el.setAttribute('edep', bratArrowsToAttribute(enhancedArrows))

          id2bratPath[span.annotations.N] = [
            trimExtension(path.relative(bratFilesRoot, bratFile)),
            span.index
          ]
        }
      }
    }

    // todo: dedup
    let corefBratFiles = corefBratFilesGrouped[bratName]
    for (let bratFile of corefBratFiles) {
      for (let span of parseBratFile(linesSync(bratFile))) {
        let el = n2element.get(span.annotations.N)
        if (!el) {  // sometimes tokens are deleted in xml but remain in brat
          continue
        }
        el.setAttribute('comment-coref', span.comment)
        let coref = span.arrows
          .map(({ relation, head }) => `${head.annotations.N}-${relation.replace('_', ':')}`)
          .join('|') || undefined
        el.setAttribute('coref', coref)
      }
    }

    fs.writeFileSync(xmlFile, serializeMiDocument(root))
    if (args.id2bratPath) {
      writeTojsonFile(args.id2bratPath, id2bratPath)
    }
  }
}

//------------------------------------------------------------------------------
function bratArrowsToAttribute(arrows: Array<BratArrow>) {
  return arrows.map(bratArrowToAttibute).join('|') || undefined
}

//------------------------------------------------------------------------------
function bratArrowToAttibute(value: BratArrow) {
  return `${value.head.annotations.N}-${value.relation}`
}

//------------------------------------------------------------------------------
function basicRelationsFirstCompare(a: BratArrow, b: BratArrow) {
  return Number(HELPER_RELATIONS.has(a.relation))
    - Number(HELPER_RELATIONS.has(b.relation))
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
