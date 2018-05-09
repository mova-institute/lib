#!/usr/bin/env node

import { sync as globSync } from 'glob'
import * as minimist from 'minimist'

import { isSentenceStart, getId } from './id2i'
import { last } from '../lang'
import { linesSync, readTsvMapSync, forEachLine } from '../utils.node'


if (require.main === module) {
  let args = minimist(process.argv.slice(2))
  // main2(args._[0], args._[1], args._[2])
  let [id2idsGlob, id2iRPath] = args._
  main(id2idsGlob, id2iRPath)
}

//------------------------------------------------------------------------------
async function main2(id2iLPath: string, id2idsGlob: string, id2iRPath: string) {
  let id2i = readTsvMapSync(id2iLPath)
  readTsvMapSync(id2iRPath, id2i)

  for (let path of globSync(id2idsGlob)) {
    for (let line of linesSync(path)) {
      if (line.startsWith('<link ')) {
        let [idsStrL, idsStrR] = line.match(/\sxtargets='([^']+)'/)[1].split(';')
        if (!idsStrL.startsWith('uk')) {
          [idsStrL, idsStrR] = [idsStrR, idsStrL]
        }
        let indexesL = idsStrL.split(' ').map(x => id2i.get(x)).filter(x => x !== undefined)
        let indexesR = idsStrR.split(' ').map(x => id2i.get(x)).filter(x => x !== undefined)
        if (indexesL.length || indexesR.length) {
          process.stdout.write(`${indexArr2val(indexesL)}\t${indexArr2val(indexesR)}\n`)
        }
      }
    }
  }
}

//------------------------------------------------------------------------------
async function main(id2idsGlob: string, id2iRPath: string) {
  try {
    let id2iR = readTsvMapSync(id2iRPath)
    console.error(`read id2iR`)
    // console.error(id2iR)

    let id2ids = new Map<string, Array<string>>()
    globSync(id2idsGlob).forEach(x => readTeiMapping(id2ids, x))
    console.error(`read TEI mappings`)
    // console.error(id2ids)

    let i = 0
    await forEachLine(process.stdin, line => {
      if (isSentenceStart(line)) {
        let idL = getId(line)
        if (idL && id2ids.has(idL) && id2ids.get(idL).length) {
          // console.error(idL)
          // let idsR = id2ids.get(idL)
          // if
          // let idRangeR = id2id.get(idL).map(x => id2iR.get(x)).join(',')
          // process.stdout.write(`${i}\t${idRangeR}\n`)
          for (let idR of id2ids.get(idL)) {
            let iR = id2iR.get(idR)
            if (!iR) {
              process.stdout.write(`${i}\t-1\n`)
              break
            }
            // console.error(idR)
            // console.error(iR)
            process.stdout.write(`${i}\t${iR}\n`)
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
function readTeiMapping(target: Map<string, Array<string>>, path: string) {
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
function indexArr2val(indexes: Array<string>) {
  if (!indexes.length) {
    return '-1'
  }
  if (indexes.length === 1) {
    return indexes[0].toString()
  }
  return `${indexes[0]},${last(indexes)}`
}
