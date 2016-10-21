#!/usr/bin/env node

import { sync as globSync } from 'glob'
import * as minimist from 'minimist'

import { isSentenceStart, getId } from './id2i'
import { last } from '../lang'
import { linesSync, readTsvMapSync, forEachLine } from '../utils.node'


if (require.main === module) {
  main(minimist(process.argv.slice(2)))
}


//------------------------------------------------------------------------------
async function main(args: minimist.ParsedArgs) {
  try {
    let [id2idsGlob, id2iRPath] = args._

    let id2iR = readTsvMapSync(id2iRPath)
    console.error(`read id2iR`)

    let id2id = new Map<string, string[]>()
    let id2ids = globSync(id2idsGlob)
    id2ids.forEach(x => readTeiMapping(id2id, x))
    console.error(`read TEI mappings`)

    let i = 0
    await forEachLine(process.stdin, line => {
      if (isSentenceStart(line)) {
        let idL = getId(line)
        if (idL && id2id.has(idL)) {
          for (let idR of id2id.get(idL)) {
            let iR = id2iR.get(idR)
            process.stdout.write(`${i}\t${iR || '-1'}\n`)
            // throw new Error(`No index for id "${idR}" in "${id2iRPath}"`)
          }
        } else {
          process.stdout.write(`${i}\t-1\n`)
        }
        ++i
      }
    })
  } catch (e) {
    console.error(e.stack)
  }
}

//------------------------------------------------------------------------------
function readTeiMapping(target: Map<string, string[]>, path: string) {
  for (let line of linesSync(path)) {
    if (line.startsWith('<link ')) {
      let [idsStrL, idsStrR] = line.match(/\sxtargets='([^']+)'/)[1].split(';')
      let idsL = idsStrL.split(' ').filter(x => x)
      let idsR = idsStrR.split(' ').filter(x => x)
      // if (!idsL.length) {
      //   idsR.forEach(x => target.set(x, ['-1']))
      // } else if (!idsR.length) {
      //   idsL.forEach(x => target.set(x, ['-1']))
      // } else {
      for (let idL of idsL) {
        target.set(idL, idsR)
      }
      for (let idR of idsR) {
        target.set(idR, idsL)
      }
      // }
      // else if (idsL.length === 1) {
      //   target.set(idsL[0], idsR)
      //   idsR.forEach(x => target.set(x, [idsL[0]]))
      // } else if (idsR.length === 1) {
      //   target.set(idsR[0], idsL)
      //   idsL.forEach(x => target.set(x, [idsR[0]]))
      // } else {
      //   throw new Error(`Bad mapping file`)
      // }
    }
  }
  return target
}

//------------------------------------------------------------------------------
function* buildSketchAlingmentMap(id2indexMap: Map<string, string>, alingmentGlob: string, ) {
  for (let path of globSync(alingmentGlob)) {
    // console.error(path)
    for (let line of linesSync(path)) {
      if (line.startsWith('<link ')) {
        let [idsStrL, idsStrR] = line.match(/\sxtargets='([^']+)'/)[1].split(';')
        let indexesL = idsStrL.split(' ').map(x => id2indexMap.get(x)).filter(x => x !== undefined)
        let indexesR = idsStrR.split(' ').map(x => id2indexMap.get(x)).filter(x => x !== undefined)
        yield [indexArr2val(indexesL), indexArr2val(indexesR)]
      }
    }
  }
}

//------------------------------------------------------------------------------
function indexArr2val(indexes: string[]) {
  if (!indexes.length) {
    return '-1'
  }
  if (indexes.length === 1) {
    return indexes[0].toString()
  }
  return `${indexes[0]},${last(indexes)}`
}
