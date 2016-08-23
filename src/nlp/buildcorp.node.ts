
// time node lib/nlp/buildcorp.node.js --workspace ~/Downloads/buildcorp
//   --input '/Users/msklvsk/Developer/mova-institute/corpus-text/text/parallel/**/*.xml'
//   --input '/Users/msklvsk/Developer/mova-institute/corpus-text/text/ulif/**/*.{xml,txt}'
//   --meta ~/Downloads/buildcorp/meta1.tsv --meta ~/Downloads/buildcorp/meta2.tsv

import * as path from 'path'
import * as fs from 'fs'

import * as nlpUtils from '../nlp/utils'
import { LibxmljsDocument } from 'xmlapi-libxmljs'
import { createMorphAnalyzerSync } from './morph_analyzer/factories.node'
import { filename2lxmlRootSync } from '../utils.node'
import { indexTableByColumns, unique } from '../algo'
import { createObject2, arrayed } from '../lang'


const wu: Wu.WuStatic = require('wu')
const globSync = require('glob').sync
const mkdirp = require('mkdirp')
const args: Args = require('minimist')(process.argv.slice(2), {
  boolean: ['xml', 'novert'],
})



buildCorpus(args)



interface Args {
  input: string[]
  workspace: string
  meta?: string[]
  xml: boolean
  novert: boolean
}

function normalizeArgs(args) {
  args.workspace = Array.isArray(args.workspace) ?
    args.workspace[args.workspace.length - 1] : args.workspace
  args.input = arrayed(args.input)
  args.meta = arrayed(args.meta)
}

function trimExtension(filename: string) {
  let dotIndex = filename.lastIndexOf('.')
  return dotIndex < 0 ? filename : filename.substr(0, dotIndex)
}

function docCreator(xmlstr: string) {
  return LibxmljsDocument.parse(xmlstr)
}

function numDigits(integer: number) {
  return Math.floor(Math.log10(integer)) + 1
}

function zeropad(value: number, max: number) {
  let numZeroes = numDigits(max) - numDigits(value)
  if (numZeroes > 0) {
    return '0'.repeat(numZeroes) + value
  }
  return value.toString()
}

function separatedValues2Objects(fileStr: string, separator: string): any[] {
  let [headerString, ...lines] = fileStr.split('\n')
  let header = headerString.split(separator)
  return lines.map(x => createObject2(header, x.split(separator)))
}

function countOf(i: number, len: number) {
  return `(${zeropad(i + 1, len)} of ${len})`
}

function prepareMetadataFiles(filePaths: string[]) {
  let rows = []
  for (let filePath of filePaths) {
    let fileStr = fs.readFileSync(filePath, 'utf8')
    rows.push(...separatedValues2Objects(fileStr, '\t'))
  }
  return indexTableByColumns(rows, ['filename']) as Map<string, any>
}

function prepareDocMeta(meta) {
  for (let key of Object.keys(meta)) {
    if (!key.trim().length || !meta[key].trim().length) {
      delete meta[key]
    } else {
      if (key === 'text_type') {
        meta[key] = createTextTypeAttribute(meta[key])
      } else {
        meta[key] = meta[key].trim()
      }
    }
  }
  // delete meta.filename
  return meta
}



function createTextTypeAttribute(value: string) {
  // todo: wut? try moving it to global scope
  const textTypeTree = {
    'автореферат': ['наука'],
    'стаття': ['публіцистика'],
    'науково-популярний': ['наука'],
  }

  let res = new Array<string>()
  for (let type of value.split('|')) {
    let leafAddress = textTypeTree[type]
    if (leafAddress) {
      for (let i of leafAddress.keys()) {
        let typePath = leafAddress.slice(0, i + 1).join('::')
        res.push(typePath)
      }
      res.push([...leafAddress, value].join('::'))
    } else {
      res.push(type)
    }
  }
  return res.join('|');
}

function createVerticalFile(workspacePath: string) {
  let filePath
  let i = 1
  do {
    filePath = path.join(workspacePath, `corpus.${i++}.vertical.txt`);
  } while (fs.existsSync(filePath))

  mkdirp.sync(workspacePath)
  return fs.openSync(filePath, 'w')
}

// function handleInterrupt(isDoingIo: boolean) {
//   console.log(`cauugt, ${isDoingIo}`)
//   process.exit()
// }

function buildCorpus(params: Args) {
  normalizeArgs(args)
  // let isDoingIo = false

  // process.on('exit', () => handleInterrupt(isDoingIo))
  // process.on('SIGINT', () => handleInterrupt(isDoingIo))
  // process.on('uncaughtException', () => handleInterrupt(isDoingIo))

  let metaTable = prepareMetadataFiles(args.meta)
  let verticalFile = createVerticalFile(params.workspace)

  let idRegistry = new Set<string>()
  let morphAnalyzer = createMorphAnalyzerSync()
  morphAnalyzer.setExpandAdjectivesAsNouns(false)

  let inputFiles: string[] = wu(args.input).map(x => globSync(x)).flatten().toArray()
  inputFiles = unique(inputFiles)
  let taggedDir = path.join(params.workspace, 'tagged')
  mkdirp.sync(taggedDir)
  for (let [i, filePath] of inputFiles.entries()) {
    try {
      let basename = path.basename(filePath)
      let id = trimExtension(basename)

      if (idRegistry.has(id)) {
        console.error(`WARNING: id "${id}" used already, skipping ${filePath}`)
        continue
      }

      let dest = path.join(taggedDir, id + '.xml')
      let root
      process.stdout.write(`${countOf(i, inputFiles.length)} ${id}:`)
      if (fs.existsSync(dest)) {
        if (args.novert) {
          process.stdout.write(` tagged already, skipping xml and vertical\n`)
          continue
        }
        process.stdout.write(` tagged already, reading from xml`)
        root = filename2lxmlRootSync(dest)
      } else {
        process.stdout.write(` preprocessing`)
        let body = fs.readFileSync(filePath, 'utf8')
        let isXml = path.extname(basename) === '.xml'
        root = nlpUtils.preprocessForTaggingGeneric(body, docCreator, isXml)

        process.stdout.write(`; tokenizing`)
        nlpUtils.tokenizeTei(root, morphAnalyzer)

        if (args.xml) {
          process.stdout.write(`; tagging`)
          nlpUtils.morphInterpret(root, morphAnalyzer)

          process.stdout.write(`; writing xml`)
          fs.writeFileSync(dest, root.document().serialize(true), 'utf8')
        }
      }

      if (!args.novert) {
        process.stdout.write(`; creating vertical`)
        let meta = metaTable && metaTable.get(id)
        if (!meta) {
          process.stdout.write(`: 😮  no meta`)
          meta = { filename: id }
        } else {
          prepareDocMeta(meta)
        }
        let verticalLines: string[]
        if (args.xml) {
          verticalLines = [...nlpUtils.interpretedTeiDoc2sketchVertical(root, meta)]
        } else {
          // verticalLines = [...nlpUtils.tokenizedTeiDoc2sketchVertical(root, meta)]
        }
        fs.writeSync(verticalFile, verticalLines.join('\n'))
      }

      process.stdout.write('\n')
    } catch (e) {
      process.stdout.write('\n')
      if (e.message.startsWith('PCDATA invalid Char value')) {
        process.stdout.write(` ❌  ${e.message}`)
        continue
      }
      process.stdout.write(` ⚡️❌  ${e.message}`)
      //throw e
    }
  }
}
