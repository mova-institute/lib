#!/usr/bin/env node

import { join } from 'path'
import * as glob from 'glob'
import * as path from 'path'
import * as fs from 'fs'

import { linesSync } from '../../utils.node'
import { zipLongest, last } from '../../lang'



function main() {
  const workspace = '.'
  const goldDir = join(workspace, 'gold')
  const testDir = join(workspace, 'test')

  let ruleCounter = new UniqueCounter()
  let goldenPositivesTotal = 0
  let truePositivesTotal = 0
  let negativesTotal = 0
  let positivesTotal = 0
  let falseNegativesTotal = 0

  let goldFiles = glob.sync(join(goldDir, '*.txt')).map(x => path.basename(x))
  for (let goldFile of goldFiles) {
    let goldIt = iterateCg(linesSync(join(goldDir, goldFile)))
    let testIt = iterateCg(linesSync(join(testDir, goldFile)))
    // console.log([...testIt])
    let diffCohorts = zipLongest(goldIt, testIt)
    for (let [[gold, lineG], [test, lineT]] of diffCohorts) {
      if (gold.surface !== test.surface) {
        throw new Error(`Logic error`)
      }

      let positives = test.readings.filter(x => !x.removedBy)
      let negatives = test.readings.filter(x => x.removedBy)
      let truePositives = positives.filter(x => gold.readings.find(xx => xx.equals(x)))
      let falseNegatives = negatives.filter(x => gold.readings.find(xx => xx.equals(x)))

      if (truePositives.length + falseNegatives.length !== gold.readings.length) {
        console.error(gold.readings)
        console.error(positives)
        console.error(negatives)
        console.error(truePositives)
        console.error(falseNegatives)
        console.error(truePositives.length, falseNegatives.length, gold.readings.length, lineG, lineT)
        process.exit()
      }
      negativesTotal += negatives.length
      positivesTotal += positives.length
      goldenPositivesTotal += gold.readings.length
      truePositivesTotal += truePositives.length

      falseNegativesTotal += falseNegatives.length
      if (falseNegatives.length) {
        // console.log(falseNegatives, lineG + 1, lineT + 1)
      }
    }
  }
  let readingsTotal = negativesTotal + positivesTotal
  let recall = truePositivesTotal / goldenPositivesTotal
  let precision = truePositivesTotal / positivesTotal
  let fMeasure = 2 * precision * recall / (precision + recall)

  console.log(`
  readings to leave:   ${goldenPositivesTotal}
  readings to remove:  ${readingsTotal - goldenPositivesTotal}
  readings removed:    ${negativesTotal}
  readings left:       ${positivesTotal}
  readings total:      ${readingsTotal}

  true positives:      ${truePositivesTotal}
  false negatives:     ${falseNegativesTotal}
  recall %:            ${toPercent(recall)}
  precision %:         ${toPercent(precision)}
  f-measure:            ${fMeasure.toFixed(2)}
  `)
}


class UniqueCounter<T> {
  private map = new Map<T, number>()

  meet(...values: T[]) {
    for (let value of values) {
      if (this.map.has(value)) {
        this.map.set(value, this.map.get(value) + 1)
      } else {
        this.map.set(value, 1)
      }
    }
  }

  entries() {
    return this.map.entries()
  }
}

class CgReading {
  lemma: string
  flags: string
  removedBy: string
  selectedBy: string

  equals(other: CgReading) {
    return this.flags === other.flags && this.lemma === other.lemma
  }
}

class CgCohort {
  surface: string
  readings = new Array<CgReading>()
}

function* iterateCg(lines: Iterable<string>): IterableIterator<[CgCohort, number]> {
  let i = 0
  let cohort: CgCohort
  let cohortLine: number

  for (let line of lines) {
    let surface = parseSurface(line)
    if (surface) {
      if (cohort) {
        yield [cohort, cohortLine]
      }
      cohort = new CgCohort()
      cohort.surface = surface
      cohortLine = i
    } else {
      let reading = parseReading(line)
      if (reading) {
        cohort.readings.push(reading)
      }
    }
    ++i
  }

  if (cohort) {
    yield [cohort, cohortLine]
  }
}

function parseSurface(line: string) {
  let match = line.match(/^"<([^">]+)>"$/)
  if (match) {
    return match[1]
  }
}

// function toPercent(numerator: number, denominator: number) {
//   return (numerator / denominator * 100).toFixed(2)
// }

function toPercent(n: number) {
  return (n * 100).toFixed(2)
}

function parseReading(line: string) {
  let match = line.match(/^(;?)\t"([^"]+)"\s*(.*)$/)
  if (match) {
    let ret = new CgReading()
    let [, removed, lemma, flags] = match
    ret.lemma = lemma

    let arr = flags.split(' ')
    if (removed) {
      ret.removedBy = arr.pop()
    } else {
      let traceMark = last(arr)
      if (/SELECT:\d+/.test(traceMark)) {
        ret.selectedBy = arr.pop()
      }
    }
    ret.flags = arr.join(' ')
    return ret
  }
}

function isCgCohortStart(line: string) {
  return /^<"([^">]+)">$/.test(line)
}

if (require.main === module) {
  main()
}

