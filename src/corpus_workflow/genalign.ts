#!/usr/bin/env node

/*

cat *.vertical.txt | mi-id2i > id2i.txt
mi-genalign id2i.txt *.alignment.xml > corp_map

*/

import { sync as globSync } from 'glob'
import * as minimist from 'minimist'

import { mu } from '../mu'
import { last } from '../lang'
import { linesSync } from '../utils.node'



if (require.main === module) {
  main(minimist(process.argv.slice(2)))
}


//------------------------------------------------------------------------------
async function main(args: minimist.ParsedArgs) {
  try {
    let [id2iGlob, alingmentGlob] = args._
    let map = new Map<string, string>()
    for (let id2iFile of globSync(id2iGlob)) {
      for (let line of linesSync(id2iFile)) {
        let [id, iStr] = line.split('\t')
        map.set(id, iStr)
      }
    }
    mu(buildSketchAlingmentMap(map, alingmentGlob))
      .map(x => `${x[0]}\t${x[1]}`)
      .chunk(2000)
      .forEach(x => process.stdout.write(x.join('\n') + '\n'))
  } catch (e) {
    console.error(e.stack)
  }
}

//------------------------------------------------------------------------------
export function* buildSketchAlingmentMap(id2indexMap: Map<string, string>, alingmentGlob: string, ) {
  for (let path of globSync(alingmentGlob)) {
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
