#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import * as algo from '../../algo'
import { parseXmlFileSync } from '../../xml/utils.node'
import { linesSync, writeToJsonSync } from '../../utils.node'
import { isString, tuple } from '../../lang'
import { trimExtension } from '../../string'
import { serializeMiDocument } from '../utils'
import { parseBratFile, BratArrow } from './utils'
import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { HELPER_RELATIONS, classifyRelation } from './uk_grammar'
import { Dict } from '../../types'

import * as glob from 'glob'
import minimist from 'minimist'



//------------------------------------------------------------------------------
const GUI_SUPPORTED_TAGS = ['Promoted', 'Graft', 'ItSubj']

//------------------------------------------------------------------------------
function main() {
  // const now = toSortableDatetime(new Date())

  const args = minimist(process.argv.slice(2), {
    boolean: [
    ],
  })

  let [goldenDir, bratGlob] = args._

  console.error(`parsing all mixml docs…`)
  let mixmlDocuments = glob.sync(path.join(goldenDir, '*.xml'))
    .map(x => ({ path: x, doc: parseXmlFileSync(x) }))

  console.error(`building id2element…`)
  let id2element = new Map<string, AbstractElement>()
  for (let { doc } of mixmlDocuments) {
    for (let el of doc.evaluateElements('//*[@id]')) {  // todo: speedup
      id2element.set(el.attribute('id'), el)
    }
  }

  let allBratFiles = glob.sync(bratGlob)
  let bratFilesRoot = algo.commonPrefix(allBratFiles).slice(0, -1)
  let allSyntBratFiles = allBratFiles.filter(x => x.substr(bratFilesRoot.length).startsWith('/treebank/by_file'))
  let allCorefBratFiles = allBratFiles.filter(x => x.substr(bratFilesRoot.length).startsWith('/coref/'))

  let id2bratPath: Dict<[string, number]> = {}

  console.error(`adopting synt changes…`)
  for (let bratFile of allSyntBratFiles) {
    for (let span of parseBratFile(linesSync(bratFile))) {
      if (isString(span.annotations.N)) {
        let el = id2element.get(span.annotations.N)
        if (!el) {  // sometimes tokens are deleted in xml but remain in brat
          continue
        }
        el.setAttribute('comment', span.comment)
        let tags = el.attribute('tags')
          ? new Set(el.attribute('tags').trim().split(/\s+/))
          : new Set<string>()
        for (let tag of GUI_SUPPORTED_TAGS) {
          if (span.annotations[tag]) {
            tags.add(tag.toLowerCase())
          } else {
            tags.delete(tag.toLowerCase())
          }
        }
        if (tags.size) {
          el.setAttribute('tags', [...tags].join(' '))
        } else {
          el.removeAttribute('tags')
        }

        let arrows = span.arrows
          .filter(x => isString(x.head.annotations.N))
        arrows.forEach(x => x.relation = x.relation.replace('_', ':'))
        let [
          basicArrows,
          enhancedArrows,
          propositionArrows,
          helperArrows
        ] = algo.clusterize(arrows, x => classifyRelation(x.relation))

        let config = tuple(
          tuple(basicArrows, 'dep'),
          tuple(enhancedArrows, 'edep'),
          tuple(propositionArrows, 'pdep'),
          tuple(helperArrows, 'hdep'),
        )
        for (let [specificArrows, attribute] of config) {
          if (specificArrows) {
            el.setAttribute(attribute, bratArrowsToAttribute(specificArrows))
          }
        }

        id2bratPath[span.annotations.N] = [
          trimExtension(path.relative(bratFilesRoot, bratFile)),
          span.index
        ]
      }
    }
  }

  // todo: dedup
  console.error(`adopting coref changes…`)
  for (let bratFile of allCorefBratFiles) {
    for (let span of parseBratFile(linesSync(bratFile))) {
      let el = id2element.get(span.annotations.N)
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

  console.error(`writing docs back to xml…`)
  mixmlDocuments.forEach(x => fs.writeFileSync(x.path, serializeMiDocument(x.doc)))
  if (args.id2bratPath) {
    writeToJsonSync(args.id2bratPath, id2bratPath)
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
