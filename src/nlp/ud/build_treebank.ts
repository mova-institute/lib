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
import { generateEnhancedDeps2, buildEnhancedGraphFromTokens } from './enhanced'



//------------------------------------------------------------------------------
interface CliArgs {
  addIdToFeats: boolean
  addValency: boolean
  datasetReroute: string  // --datasetReroute "->train test->train"
  datasetSchema: string
  dryRun: boolean
  id2bratPath: string
  includeIncomplete: boolean
  morphonlyThreshold: string
  noBasic: boolean
  noEnhanced: boolean
  noMorphonly: boolean
  noStandartizing: boolean
  oneSet: string
  reportErrors: 'all' | 'complete' | 'none'
  reportHoles: boolean
  valencyDict: string
  validOnly: boolean
  xpos: any
}

//------------------------------------------------------------------------------
function main() {
  let cliArgs = getArgs()

  let [globStr, outDir] = cliArgs._
  let xmlPaths = glob.sync(globStr)
  let id2bratPath: Dict<[string, number]> = cliArgs.id2bratPath ? parseJsonFileSync(cliArgs.id2bratPath) : {}
  let morphonlyThreshold = cliArgs.noMorphonly ? 2 : Number.parseFloat(cliArgs.morphonlyThreshold)
  let rerouteMap = createDatasetRerouteMap(cliArgs.datasetReroute)
  console.error(`Reroutes:`, rerouteMap)

  let analyzer = createMorphAnalyzerSync()
  let valencyDict = cliArgs.valencyDict
    ? createValencyDictFromKotsybaTsvs(cliArgs.valencyDict)
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
    let docTokens = mu(mixml2tokenStream(root, cliArgs.datasetSchema))
      .transform(x => x.interp && g.denormalizeInterp(x.interp))
      .toArray()
    let corefClusterization = buildCoreferenceClusters(docTokens)
    let sentenceStream = tokenStream2sentences(docTokens)

    for (let { tokens, multitokens, nodes,
      sentenceId, dataset, document, paragraph, } of sentenceStream
    ) {
      let manualEnhancedNodes = buildEnhancedGraphFromTokens(nodes)

      if (!cliArgs.noEnhanced) {
        generateEnhancedDeps2(nodes)
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
        if (cliArgs.addValency) {
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

      dataset = cliArgs.oneSet || rerouteMap.get(dataset || '') || dataset || 'unassigned'
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
        } else if (!isComplete && cliArgs.reportHoles) {
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
        if (cliArgs.reportErrors === 'all' || cliArgs.reportErrors === 'complete' && isComplete || cliArgs.validOnly) {
          let problems = validateSentenceSyntax(
            nodes,
            manualEnhancedNodes,
            analyzer,
            corefClusterization,
            valencyDict
          )
          hasProblems = !!problems.length
          if (hasProblems && cliArgs.reportErrors) {
            sentenseErrors.push({
              problems,
              sentenceId,
              tokens,
            })
          }
        }

        if (cliArgs.dryRun) {
          continue
        }

        if (cliArgs.validOnly && hasProblems || hasMorphErrors) {
          curDataset.accountBlocked(numComplete, tokens.length)
        } else {
          if (isComplete || cliArgs.includeIncomplete) {
            let sentLevelInfoSynt = { ...sentLevelInfo }
            if (curDataset.followsAnnotationalGap) {
              sentLevelInfoSynt['annotation_gap'] = true
            }
            curDataset.accountExported(tokens.length)
            if (!cliArgs.noStandartizing) {
              g.standartizeSentenceForUd23(nodes)
            }
            let filename = set2filename(outDir, cliArgs.datasetSchema || 'mi', dataset)
            let file = openedFiles[filename] = openedFiles[filename] || fs.openSync(filename, 'w')
            let conlluedSentence = sentence2conllu(tokens, multitokens, sentLevelInfoSynt, {
              xpos: cliArgs.xpos,
              addIdToFeats: cliArgs.addIdToFeats,
              // noBasic: args.noBasic,
            })
            fs.writeSync(file, conlluedSentence + '\n\n')
          } else {
            curDataset.accountBlocked(numComplete, tokens.length)
          }
        }
      } else {
        curDataset.accountEmpty(tokens.length)
        if (cliArgs.reportHoles && !skipReportingEmptyFromDocs.has(curDocId)) {
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

      if (cliArgs.dryRun) {
        continue
      }

      setRegistryMorpho[dataset] = setRegistryMorpho[dataset] || new DatasetDescriptor()

      if (completionRatio >= morphonlyThreshold && !hasMorphErrors) {
        // standartizeMorpho(tokens)
        if (!cliArgs.noStandartizing) {
          g.standartizeSentenceForUd23(nodes)
        }
        let filename = path.join(outDir, `uk-mi-${dataset}.morphonly.conllu`)
        let file = openedFiles[filename] = openedFiles[filename] || fs.openSync(filename, 'w')
        let conlluedSentence = sentence2conllu(tokens, multitokens, sentLevelInfo, {
          // morphOnly: true,
          xpos: cliArgs.xpos,
          addIdToFeats: cliArgs.addIdToFeats,
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
    let [bratPath, bratIndex] = id2bratPath[firsProblemTokenId] || ['', 0]
    let href = `https://lab.mova.institute/brat/#/${bratPath}?focus=T${bratIndex + 1}`
    let problemNumber = zerofillMax(i + 1, sentenceProblems.length)

    body += `<div><b>№${problemNumber}</b> реч#${sentenceId}: <a href="${href}" target="_blank">${bratPath}</a><br/>`
    for (let { indexes, message } of problems) {
      body += `<p class="message">- ${escape(message)}`
      if (indexes !== undefined) {
        let ids = indexes.map(x => tokens[x].id).join(` `)
        body += ` <input type="checkbox" value="${ids}" onchange="copyIds()" /> ${ids}</p>`

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

  return `<html>
  <head>
    <style>
      html { padding: 3em; font-size: 14px; font-family: "Lucida Console", Menlo, Monaco, monospace; }
      .error { padding: 0.25em; border: 2px solid #FFAB40; color: #555; }
      .message { color: #555; margin-left:-2ch; }
    </style>
    <script>
      function copyIds() {
        document.getElementById('ids').innerHTML =
          [...document.querySelectorAll('input[type=checkbox]:checked')]
          .map(x => x.value)
          .join(' ')
      }
    </script>
  </head>
  <body>
  <p style="margin-top:-2em;">створено: <b>${timestamp}</b> (час київський)</p>
  <br/>
  <br/>
  <p id="ids"></p>
  ${body}
  </body>
  </html>`
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
  return minimist<CliArgs>(process.argv.slice(2), {
    boolean: [
      'addIdToFeats',
      'addValency',
      'dryRun',
      'includeIncomplete',
      'noBasic',
      'noEnhanced',
      'noMorphonly',
      'noStandartizing',
      'onlyValid',
      'reportHoles',
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
