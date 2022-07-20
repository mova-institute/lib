// todo: everything
import { readFileSync } from 'fs'
import { join } from 'path'

import { compileDict, lexemes } from '../nlp/morph_analyzer/dict_utils'
import { writeCompiledDict } from '../nlp/morph_analyzer/utils.node'

const mkdirp = require('mkdirp')

const args = require('minimist')(process.argv.slice(2))
let input =
  args.i ||
  args.input ||
  join(__dirname, '../../../dict_uk/out/dict_corp_viz-mte.txt')
let name = args.name || 'rysin-mte'
let destDir = join(
  args.d || args.dest || join(__dirname, '../../data/dict'),
  name,
)

let lines = readFileSync(input, 'utf8').trim().replace(`'`, '’').split('\n')
let theLexemes = [...lexemes(lines)]
let compiledDict = compileDict(theLexemes as Array<Array<[string, string]>>)

mkdirp.sync(destDir)
writeCompiledDict(destDir, compiledDict)

console.log('done')
