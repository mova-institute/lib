#!/usr/bin/env node

import { join } from 'path'
import * as glob from 'glob'
import * as path from 'path'
import * as intersection from 'lodash.intersection'

import { linesSync } from '../../utils.node'
import { zipLongest, last } from '../../lang'



function main() {
  const workspace = '.'
  const goldDir = join(workspace, 'data', 'golden')
  const testDir = join(workspace, 'data', 'test')

  let ruleCounter = new UniqueCounter()
  let goldenPositivesTotal = 0
  let truePositivesTotal = 0
  let negativesTotal = 0
  let positivesTotal = 0
  let falseNegativesTotal = 0

  let [goldenFiles, testFiles] = [goldDir, testDir]
    .map(x => glob.sync(join(x, '*.txt')).map(xx => path.basename(xx)))
  let commonFiles = intersection(goldenFiles, testFiles)
  if (goldenFiles.length !== testFiles.length) {
    console.error(`WARNING: numbers of golden and test files do not match`)
  }
  console.log(`Evaluating ${commonFiles.length} files: ${commonFiles.join(' ')}`)
  for (let goldFile of commonFiles) {
    let goldIt = iterateCg(linesSync(join(goldDir, goldFile)))
    let testIt = iterateCg(linesSync(join(testDir, goldFile)))
    // console.log([...testIt])
    let diffCohorts = zipLongest(goldIt, testIt)
    for (let [[golden, lineG], [test, lineT]] of diffCohorts) {
      if (golden.surface !== test.surface) {
        throw new Error(`Logic error: "${golden.surface}" !== "${test.surface}"`)
      }

      let positives = test.readings.filter(x => !x.removedBy)
      let negatives = test.readings.filter(x => x.removedBy)
      let truePositives = positives.filter(x => golden.readings.find(xx => xx.equals(x)))
      let falseNegatives = negatives.filter(x => golden.readings.find(xx => xx.equals(x)))

      if (truePositives.length + falseNegatives.length !== golden.readings.length) {
        console.error(golden.readings)
        console.error(positives)
        console.error(negatives)
        console.error(truePositives)
        console.error(falseNegatives)
        console.error(truePositives.length, falseNegatives.length, golden.readings.length, lineG, lineT)
        process.exit()
      }
      negativesTotal += negatives.length
      positivesTotal += positives.length
      goldenPositivesTotal += golden.readings.length
      truePositivesTotal += truePositives.length

      falseNegativesTotal += falseNegatives.length
      ruleCounter.account(...falseNegatives.map(x => x.removedBy))
      falseNegatives.forEach(x => ruleCounter.account())
    }
  }
  let readingsTotal = negativesTotal + positivesTotal
  let recall = truePositivesTotal / goldenPositivesTotal
  let precision = truePositivesTotal / positivesTotal
  let fMeasure = 2 * precision * recall / (precision + recall)

  let topBadRules = [...ruleCounter.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(x => x.join('\t'))
    .join('\n  ')

  console.log(`
  readings total:      ${readingsTotal}
  readings to leave:   ${goldenPositivesTotal}
  readings to remove:  ${readingsTotal - goldenPositivesTotal}
  readings removed:    ${negativesTotal}
  readings left:       ${positivesTotal}

  true positives:      ${truePositivesTotal}
  false negatives:     ${falseNegativesTotal}
  recall %:            ${toPercent(recall)}
  precision %:         ${toPercent(precision)}
  f-measure:            ${fMeasure.toFixed(2)}

Top bad rules:
  ${topBadRules}
  `)
}


class UniqueCounter<T> {
  private map = new Map<T, number>()

  account(...values: Array<T>) {
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

