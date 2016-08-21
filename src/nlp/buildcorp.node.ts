import * as path from 'path'
import * as fs from 'fs'
import * as readline from 'readline'

import * as nlpUtils from '../nlp/utils'
import { LibxmljsDocument } from 'xmlapi-libxmljs'
import { createMorphAnalyzerSync } from './morph_analyzer/factories.node'
import { filename2lxmlRootSync } from '../utils.node';


const wu: Wu.WuStatic = require('wu')
const globSync = require('glob').sync
const mkdirp = require('mkdirp')
const args: Args = require('minimist')(process.argv.slice(2))



buildCorpus(args)



interface Args {
  input: string[]
  workspace: string
  meta?: string
}

function normalizeArgs(args) {
  args.workspace = Array.isArray(args.workspace) ?
    args.workspace[args.workspace.length - 1] : args.workspace
  args.input = Array.isArray(args.input) ? args.input : [args.input]
}

function trimExtension(filename: string) {
  let dotIndex = filename.lastIndexOf('.')
  return dotIndex < 0 ? filename : filename.substr(0, dotIndex)
}

// function consolate(text: string) {
//   process.stdout.write()
// }

function docCreator(xmlstr: string) {
  return LibxmljsDocument.parse(xmlstr);
}

function createVerticalFile(workspacePath: string) {
  const basebasename = 'corpus.vertical.txt'
  let filePath = path.join(workspacePath, basebasename)

  for (let i = 1; fs.existsSync(filePath); ++i) {
    filePath = path.join(workspacePath, i + '.' + basebasename)
  }
  mkdirp.sync(workspacePath)
  return fs.openSync(filePath, 'w')
}

function buildCorpus(params: Args) {
  normalizeArgs(args)

  let morphAnalyzer = createMorphAnalyzerSync()
  morphAnalyzer.setExpandAdjectivesAsNouns(false)

  let verticalFile = createVerticalFile(params.workspace)

  let idRegistry = new Set<string>()

  let inputFiles = wu(args.input).map(x => globSync(x)).flatten().toArray()
  let taggedDir = path.join(params.workspace, 'tagged')
  mkdirp.sync(taggedDir)
  for (let filePath of inputFiles) {
    let basename = path.basename(filePath)
    let id = trimExtension(basename)
    let dest = path.join(taggedDir, id + '.xml')
    let root
    process.stdout.write(`${id}:` )
    if (fs.existsSync(dest)) {
      process.stdout.write(` tagged already, reading from xml`)
      root = filename2lxmlRootSync(filePath)
    } else {
      process.stdout.write(` preprocessing`)
      let body = fs.readFileSync(filePath, 'utf8')
      let isXml = path.extname(basename) === '.xml'
      root = nlpUtils.preprocessForTaggingGeneric(body, docCreator, isXml)

      process.stdout.write(`; tokenizing`)
      nlpUtils.tokenizeTei(root, morphAnalyzer)

      process.stdout.write(`; tagging`)
      nlpUtils.morphInterpret(root, morphAnalyzer)

      process.stdout.write(`; writing xml`)
      fs.writeFileSync(dest, root.document().serialize(true), 'utf8')
    }

    process.stdout.write(`; writing vertical`)
    let verticalLines = [...nlpUtils.tei2nosketch(root)].join('\n')
    fs.writeSync(verticalFile, verticalLines)

    process.stdout.write('\n')
  }
}
