#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

import * as glob from 'glob'
import * as minimist from 'minimist'
import * as mkdirp from 'mkdirp'
import * as columnify from 'columnify'
import * as _ from 'lodash'

import * as g from './uk_grammar'

import { parseXmlFileSync } from '../../xml/utils.node'
import { escape } from '../../xml/utils'
import { mixml2tokenStream, tokenStream2sentences } from '../utils'
import * as algo from '../../algo'
import { parseJsonFileSync } from '../../utils.node'
import { Dict } from '../../types'
import { Token } from '../token'
import { MorphInterp } from '../morph_interp'
import { sentence2conllu } from './utils'
import { mu } from '../../mu'
import { validateSentenceSyntax } from './validation'
import { zerofillMax, toPercent } from '../../string'
import { toSortableDatetime } from '../../date'
import { createMorphAnalyzerSync } from '../morph_analyzer/factories.node'
import { createValencyDictFromKotsybaTsvs } from '../valency_dictionary/factories.node'
import { buildCoreferenceClusters } from '../coreference'
import { intbool } from '../../lang'



//------------------------------------------------------------------------------
interface Args {
  dryRun: boolean
  noEnhanced: boolean
  noBasic: boolean
  noStandartizing: boolean
  includeIncomplete: boolean
  oneSet: string

  datasetSchema: string
  datasetReroute: string  // --datasetReroute "->train test->train"
  reportHoles: boolean
  reportErrors: 'all' | 'complete' | 'none'
  validOnly: boolean
  morphonlyThreshold: string
  xpos: any


  id2bratPath: string

  valencyDict: string
  addValency: boolean
}

//------------------------------------------------------------------------------
function main() {
  let args = getArgs()

  let [globStr, outDir] = args._
  let xmlPaths = glob.sync(globStr)
  let id2bratPath: Dict<[string, number]> = args.id2bratPath ? parseJsonFileSync(args.id2bratPath) : {}

  let rerouteMap = createDatasetRerouteMap(args.datasetReroute)
  console.error(`Reroutes:`, rerouteMap)

  let analyzer = createMorphAnalyzerSync()
  let valencyDict = args.valencyDict
    ? createValencyDictFromKotsybaTsvs(args.valencyDict)
    : undefined
  let openedFiles = {} as any
  let setRegistry: Dict<DatasetDescriptor> = {}
  let setRegistryMorpho: Dict<DatasetDescriptor> = {}
  let sentenseErrors = []
  let sentenseHoles = []
  let prevSet: string
  let numVerbsCoveredByValencyDict = 0
  let numVerbsTotal = 0
  let verbsUncoveredByValencyDict = new Set<string>()

  mkdirp.sync(outDir)
  for (let xmlPath of xmlPaths) {
    let basename = path.basename(xmlPath)

    console.error(`exporting ${basename}`)

    let root = parseXmlFileSync(xmlPath)
    let docTokens = mu(mixml2tokenStream(root, args.datasetSchema))
      .transform(x => x.interp && g.denormalizeInterp(x.interp))
      .toArray()
    let corefClusterization = buildCoreferenceClusters(docTokens)
    let sentenceStream = tokenStream2sentences(docTokens)

    for (let { tokens, multitokens, nodes,
      sentenceId, dataset, document, paragraph, } of sentenceStream
    ) {
      if (!args.noEnhanced) {
        g.generateEnhancedDeps2(nodes, corefClusterization)
      }

      // count some stats
      if (valencyDict) {
        for (let token of tokens) {
          if (token.interp.isVerb()) {
            ++numVerbsTotal
            if (valencyDict.hasVerb(token.interp.lemma)) {
              ++numVerbsCoveredByValencyDict
            } else {
              verbsUncoveredByValencyDict.add(token.interp.lemma)
            }
          }
        }
        if (args.addValency) {
          tokens.forEach(x => g.fillWithValencyFromDict(x.interp, valencyDict))
        }
      }

      // ~~~ bake some vars from sentence stream data
      let roots = mu(nodes).findAllIndexes(g.isRootOrHole).toArray()
      // x => !x.deps.find(xx => !g.HELPER_RELATIONS.has(xx.relation))).toArray()
      let numComplete = tokens.length - roots.length + 1
      let isComplete = roots.length === 1
      let completionRatio = tokens.length === 1
        ? 1
        : 1 - ((roots.length - 1) / (tokens.length - 1))
      let hasMorphErrors = tokens.some(x => x.interp.isError())
      let curDocId = document.getAttribute('id')
      let curParId = paragraph.getAttribute('id')

      dataset = args.oneSet || rerouteMap.get(dataset || '') || dataset || 'unassigned'
      setRegistry[dataset] = setRegistry[dataset] || new DatasetDescriptor()
      let curDataset = setRegistry[dataset]
      let opensDoc = curDataset.curDocId !== curDocId
      let opensPar = curDataset.curParId !== curParId
      curDataset.update(curDocId, curParId)

      let sentLevelInfo = {
        'sent_id': sentenceId,
        'newpar id': opensPar && curParId || undefined,
        'newdoc id': opensDoc && curDocId || undefined,
      }
      if (opensDoc) {
        sentLevelInfo['doc_title'] = document.getAttribute('title') || ''
      } else if (prevSet !== dataset) {
        Object.values(setRegistry).forEach(set => set.followsAnnotationalGap = false)
      }
      prevSet = dataset

      if (completionRatio) {
        if (!roots.length) {
          curDataset.accountBlocked(numComplete, tokens.length)
          sentenseErrors.push({
            sentenceId,
            problems: [{ message: 'цикл' }],
            tokens,
          })
          continue
        } else if (!isComplete && args.reportHoles) {
          sentenseHoles.push({
            sentenceId,
            problems: [{
              message: `речення недороблене, ${tokens.length} ток.`,
              indexes: roots,
            }],
            tokens,
          })
        }

        let hasProblems = false
        if (args.reportErrors === 'all' || args.reportErrors === 'complete' && isComplete || args.validOnly) {
          let problems = validateSentenceSyntax(nodes, analyzer, corefClusterization, valencyDict)
          hasProblems = !!problems.length
          if (hasProblems && args.reportErrors) {
            sentenseErrors.push({
              problems,
              sentenceId,
              tokens,
            })
          }
        }

        if (args.dryRun) {
          continue
        }

        if (args.validOnly && hasProblems || hasMorphErrors) {
          curDataset.accountBlocked(numComplete, tokens.length)
        } else {
          if (isComplete || args.includeIncomplete) {
            let sentLevelInfoSynt = { ...sentLevelInfo }
            if (curDataset.followsAnnotationalGap) {
              sentLevelInfoSynt['annotation_gap'] = true
            }
            curDataset.accountExported(tokens.length)
            if (!args.noStandartizing) {
              g.standartizeSentenceForUd23(nodes)
            }
            let filename = set2filename(outDir, args.datasetSchema || 'mi', dataset)
            let file = openedFiles[filename] = openedFiles[filename] || fs.openSync(filename, 'w')
            let conlluedSentence = sentence2conllu(tokens, multitokens, sentLevelInfoSynt, {
              xpos: args.xpos,
              // noBasic: args.noBasic,
            })
            fs.writeSync(file, conlluedSentence + '\n\n')
          } else {
            curDataset.accountBlocked(numComplete, tokens.length)
          }
        }
      } else {
        curDataset.accountEmpty(tokens.length)
        if (args.reportHoles && !skipReportingEmptyFromDocs.has(curDocId)) {
          sentenseHoles.push({
            sentenceId,
            problems: [{
              message: `речення незаймане, ${tokens.length} ток.`,
              indexes: [],
            }],
            tokens,
          })
        }
      }

      if (args.dryRun) {
        continue
      }

      setRegistryMorpho[dataset] = setRegistryMorpho[dataset] || new DatasetDescriptor()

      let morphonlyThreshold = Number.parseFloat(args.morphonlyThreshold)
      if (completionRatio >= morphonlyThreshold && !hasMorphErrors) {
        // standartizeMorpho(tokens)
        if (!args.noStandartizing) {
          g.standartizeSentenceForUd23(nodes)
        }
        let filename = path.join(outDir, `uk-mi-${dataset}.morphonly.conllu`)
        let file = openedFiles[filename] = openedFiles[filename] || fs.openSync(filename, 'w')
        let conlluedSentence = sentence2conllu(tokens, multitokens, sentLevelInfo, {
          // morphOnly: true,
          xpos: args.xpos,
        })
        fs.writeSync(file, conlluedSentence + '\n\n')
        setRegistryMorpho[dataset].accountExported(tokens.length)
      } else {
        setRegistryMorpho[dataset].accountBlocked(0, tokens.length)
      }
    }
  }

  writeErrors(sentenseErrors, sentenseHoles, outDir, id2bratPath)
  printStats(setRegistry, 'synt')
  printStats(setRegistryMorpho, 'morpho')

  let valencyCoverage = toPercent(numVerbsCoveredByValencyDict, numVerbsTotal, 2)
  console.error(`\n${numVerbsCoveredByValencyDict}/${numVerbsTotal} (${valencyCoverage}%) verb hits covered by valency dict`)
  console.error(`Uncovered are ${verbsUncoveredByValencyDict.size} lemmas`)
  // console.error(mu(verbsUncoveredByValencyDict).toArray().sort(ukComparator).join('\n'))

  console.error()
}

//------------------------------------------------------------------------------
function writeErrors(sentenseErrors, sentenseHoles, outDir: string, id2bratPath: Dict<[string, number]>) {
  if (sentenseErrors.length) {
    sentenseErrors = transposeProblems(sentenseErrors)
    fs.writeFileSync(path.join(outDir, 'errors.html'), formatProblemsHtml(sentenseErrors, id2bratPath))
  }

  if (sentenseHoles.length) {
    let comparator = algo.chainComparators<any>(
      // (a, b) => b.tokens.filter(x => x.hasDeps()).length - a.tokens.filter(x => x.hasDeps()).length,
      (a, b) => intbool(b.problems[0].indexes.length) - intbool(a.problems[0].indexes.length),  //
      (a, b) => (a.problems[0].indexes.length - 1) / a.tokens.length
        - (b.problems[0].indexes.length - 1) / b.tokens.length,
      (a, b) => a.problems[0].indexes.length - b.problems[0].indexes.length,
      (a, b) => b.tokens.length - a.tokens.length,  // prefer longer sents
      algo.indexComparator(sentenseHoles),  // for stability
    )
    sentenseHoles.sort(comparator)
    fs.writeFileSync(path.join(outDir, 'holes.html'), formatProblemsHtml(sentenseHoles, id2bratPath))
  }
}

//------------------------------------------------------------------------------
function transposeProblems(problems: Array<any>) {
  let problemsByType = []
  for (let sentence of problems) {
    for (let problem of sentence.problems || []) {
      let sentWithOneProblem = { ...sentence }
      sentWithOneProblem.problems = [problem]
      problemsByType.push(sentWithOneProblem)
    }
  }
  problemsByType = _.sortBy(problemsByType, x => x.problems[0].message)

  return problemsByType
}

//------------------------------------------------------------------------------
function printStats(datasetRegistry: Dict<DatasetDescriptor>, header: string) {
  let stats = Object.entries(datasetRegistry)
    .map(([set, { counts: { tokensBlocked, tokensExported, tokensInUnfinishedSentenses, sentencesExported } }]) => ({
      set,
      'blocked': tokensBlocked,
      'holes': tokensInUnfinishedSentenses - tokensBlocked,
      'exported': tokensExported,
      'exported s': sentencesExported,
    }))
  stats.push({
    'set': 'TOTAL',
    'blocked': stats.map(x => x['blocked']).reduce((a, b) => a + b, 0),
    'holes': stats.map(x => x['holes']).reduce((a, b) => a + b, 0),
    'exported': stats.map(x => x['exported']).reduce((a, b) => a + b, 0),
    'exported s': stats.map(x => x['exported s']).reduce((a, b) => a + b, 0),
  })

  console.error(`\n${header}`)
  console.error(columnify(stats, {
    config: {
      align: 'right',
      blocked: {
        align: 'right',
      },
      exported: {
        align: 'right',
      },
      holes: {
        align: 'right',
      },
      'exported s': {
        align: 'right',
      },
    },
  }))
  // console.error(`\n`)
}

//------------------------------------------------------------------------------
function formatProblemsHtml(
  sentenceProblems: Array<any>,
  id2bratPath: Dict<[string, number]>
) {
  let body = ''
  for (let [i, { sentenceId, problems, tokens }] of sentenceProblems.entries()) {
    let firsProblemTokenId = problems.length && problems[0].indexes && problems[0].indexes.length
      ? tokens[problems[0].indexes[0]].id
      : tokens[0].id
    let [bratPath, bratIndex] = id2bratPath[firsProblemTokenId]
    let href = `https://lab.mova.institute/brat/#/${bratPath}?focus=T${bratIndex + 1}`
    let problemNumber = zerofillMax(i + 1, sentenceProblems.length)

    body += `<div><b>№${problemNumber}</b> реч#${sentenceId}: <a href="${href}" target="_blank">${bratPath}</a><br/>`
    for (let { indexes, message } of problems) {
      body += `<p class="message">- ${escape(message)}`
      if (indexes !== undefined) {
        let ids = indexes.map(x => tokens[x].id).join(` `)
        body += ` @ ${ids}</p>`

        for (let j = 0; j < tokens.length; ++j) {
          if (indexes.length < tokens.length && indexes.includes(j)) {
            body += `<span class="error">${escape(tokens[j].getForm())}</span> `
          } else {
            body += `${tokens[j].getForm()} `
          }
        }
      } else {
        body += `</p>`
      }
      body += `<br/><br/>`
    }
    body += `</div><hr/>\n`
  }

  let timestamp = toSortableDatetime(new Date())

  return `<html><head><style>
    html { padding: 3em; font-size: 14px; font-family: "Lucida Console", Menlo, Monaco, monospace; }
    .error { padding: 0.25em; border: 2px solid #FFAB40; color: #555; }
    .message { color: #555; margin-left:-2ch; }
  </style></head><body>
  <p style="margin-top:-2em;">створено: <b>${timestamp}</b> (час київський)</p>
  <br/>
  <br/>
  ${body}
  </body></html>`
}

//------------------------------------------------------------------------------
function set2filename(dir: string, setSchema: string, setName: string) {
  return path.join(dir, `uk-${setSchema}-${setName}.conllu`)
}

//------------------------------------------------------------------------------
// const FOREIGN = MorphInterp.fromVesumStr('x:foreign')
function standartizeMorpho(sentence: Array<Token>) {
  for (let token of sentence) {
    g.standartizeMorphoForUd23(token.interp, token.form)

    // token.interp.killNongrammaticalFeatures()
    token.interp.setIsAuxillary(false)

    if (token.interp.isForeign()) {
      token.interps = [MorphInterp.fromVesumStr('x:foreign', token.interp.lemma)]
    }

    if (token.interp.isTypo()) {
      let correction = token.getAttribute('correct')
      if (correction) {
        token.form = correction
        token.interp.setIsTypo(false)
      } else {
        console.error(`No typo correction for ${token}`)
      }
    }

    if (token.interp.isAdjectiveAsNoun() && token.interp.isOrdinalNumeral()) {
      token.interp.setIsOrdinalNumeral(false)
    }

    if (token.interp.lemma === 'бути' && ['є', 'Є'].includes(token.form) && token.interp.isVerb()) {
      token.interp.features.person = undefined
      token.interp.features.number = undefined
    }
  }
}

//------------------------------------------------------------------------------
function createDatasetRerouteMap(definition: string) {
  let pairs = definition.trim().split(/\s+/g).map(x => x.split('->')) as Array<[string, string]>
  return new Map<string, string>(pairs)
}

const skipReportingEmptyFromDocs = new Set([
  '03do',
  '0gq4',
  '0djd',
  '0a7t',
  '0i7x',
  '0clh',  // Про злидні
  '2wie',  // Безталанна
])

//------------------------------------------------------------------------------
class DatasetDescriptor {
  file: number
  counts = {
    tokensInUnfinishedSentenses: 0,
    tokensEmpty: 0,
    tokensBlocked: 0,
    tokensExported: 0,
    sentencesExported: 0,
  }
  curDocId: string
  curParId: string
  followsAnnotationalGap = false

  update(curDocId: string, curParId: string) {
    if (this.curDocId !== curDocId) {
      this.followsAnnotationalGap = false
    }
    this.curDocId = curDocId
    this.curParId = curParId
  }

  accountExported(numTokens: number) {
    ++this.counts.sentencesExported
    this.counts.tokensExported += numTokens
    this.followsAnnotationalGap = false
  }

  accountBlocked(numComplete: number, numTotal: number) {
    this.counts.tokensBlocked += numComplete
    this.counts.tokensInUnfinishedSentenses += numTotal
    this.followsAnnotationalGap = true
  }

  accountEmpty(numTokens: number) {
    this.counts.tokensEmpty += numTokens
    this.followsAnnotationalGap = true
  }
}

//------------------------------------------------------------------------------
function getArgs() {
  return minimist<Args>(process.argv.slice(2), {
    boolean: [
      'noEnhanced',
      'noBasic',
      'noStandartizing',
      'includeIncomplete',
      'dryRun',
      'reportHoles',
      'onlyValid',
      'addValency',
    ],
    alias: {
      oneSet: 'one-set',
      noStandartizing: 'no-std',

      datasetSchema: 'dataset-schema',
      validOnly: 'valid-only',
      reportHoles: 'report-holes',
      reportErrors: 'report-errors',
    },
    default: {
      reportErrors: 'all',
      reportHoles: true,
      datasetSchema: '',
      morphonlyThreshold: '0',
      datasetReroute: '',
    },
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
