import { mu, Mu } from '../mu'
import { cutOut, insert, trimExtension } from '../string'
import { parseConlluSentences, ConlluToken } from './ud/conllu'
import { zip, flip } from '../lang'
import {
  linesSync,
  linesBackpressedStdPipeable,
  joinToFileSync,
} from '../utils.node'
import { join, dirname } from 'path'
import { domesticateUdPos } from '../corpus_pipeline/ud'
import { createValencyDictFromKotsybaTsvs } from './valency_dictionary/factories.node'
import { createMorphAnalyzerSync } from './morph_analyzer/factories.node'

export function toPlaintext() {
  linesBackpressedStdPipeable((line, writer) => {
    if (!line.trim()) {
      return
    }
    writer.write(parseGoldSentence(line).plaintext)
    writer.write('\n')
  })
}

export interface EvaluateArgs {
  golden: string
  testee: string
  outDir: string
}

export function evaluate(args: EvaluateArgs) {
  args.outDir = args.outDir || dirname(args.testee)

  let goldenLines = linesSync(args.golden)
  let testeeLines = linesSync(args.testee)

  let it = zip<TestCase | Array<ConlluToken>>(
    mu(goldenLines)
      .filter((x) => x)
      .map(parseGoldSentence),
    parseConlluSentences(testeeLines),
  )

  let outLinesGolden = new Array<string>()
  let outLinesTestee = new Array<string>()
  for (let sent of it) {
    let golden = sent[0] as TestCase
    let testee = sent[1] as Array<ConlluToken>

    outLinesGolden.push(makeAnnotatedLine(golden))

    let testeeAnnotated = ''
    let i = 0
    for (let testeeToken of testee) {
      testeeAnnotated += testeeToken.form
      if (i === golden.johojijiIndex) {
        testeeAnnotated += '/'
        testeeAnnotated += domesticateUdPos(
          testeeToken.upos,
          undefined,
          undefined,
        ).toLowerCase()
      }
      i += testeeToken.form.length
      if (testeeToken.misc['SpaceAfter'] !== 'No') {
        ++i
        testeeAnnotated += ' '
      }
    }

    outLinesTestee.push(testeeAnnotated.trim())
  }

  joinToFileSync(join(args.outDir, 'golden-diffable.txt'), outLinesGolden)
  let dest = trimExtension(args.testee)
  joinToFileSync(join(args.outDir, `${dest}.txt`), outLinesTestee)
}

export interface TestCase {
  plaintext: string
  johojiji: string
  johojijiIndex: number
  gerundish: string
  gerundishIndex: number
  hasToBe: 'adj' | 'noun'
}

export function parseGoldSentence(line) {
  line = line.replace(/\s+/g, ' ')

  let match = line.match(/(\S+)\/([01])\/([^/]+)\/.../)
  let [, johojiji, isCorrect, pos] = match
  let johojijiIndex = match.index
  let plaintext = cutOut(
    line,
    johojijiIndex + johojiji.length,
    match[0].length - johojiji.length,
  )
  let hasToBe = isCorrect === '1' ? pos : flip(pos, 'adj', 'noun')

  match = plaintext.match(/([^\s/]+)\/\S*\/.../)
  let gerundish = match[1]
  let gerundishIndex = match.index
  let cutoutLength = match[0].length - gerundish.length
  plaintext = cutOut(plaintext, gerundishIndex + gerundish.length, cutoutLength)

  if (gerundishIndex < johojijiIndex) {
    console.error(`Stranger things...`)
    gerundishIndex -= cutoutLength
  }

  let ret: TestCase = {
    plaintext,
    johojiji,
    johojijiIndex,
    gerundish,
    gerundishIndex,
    hasToBe,
  }

  return ret
}

export function calcValencyDictCoverage(args) {
  let [morphDictDir, valDictDir, wordlist] = args._
  let analyzer = createMorphAnalyzerSync(morphDictDir)
  let dict = createValencyDictFromKotsybaTsvs(valDictDir)
  let numLines = 0
  let numInDict = 0
  for (let line of linesSync(wordlist)) {
    line = line.trim()
    if (!line) {
      continue
    }
    ++numLines
    let interps = analyzer.tag(line)
    if (interps.length) {
      let has = analyzer.tag(line).some((x) => dict.hasGerund(x.lemma))
      if (has) {
        ++numInDict
        console.error(`1 ${line}`)
      } else {
        console.error(`0 ${line}`)
      }
    } else {
      console.error(`~ ${line}`)
    }
  }
  console.error([numLines, numInDict, numInDict / numLines])
}

function makeAnnotatedLine(testCase: TestCase) {
  return insert(
    testCase.plaintext,
    `/${testCase.hasToBe}`,
    testCase.johojijiIndex + testCase.johojiji.length,
  )
}
