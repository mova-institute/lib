#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import * as readline from 'readline'

import { sync as globSync } from 'glob'
import { execSync } from 'child_process'
import * as minimist from 'minimist'
import * as groupBy from 'lodash/groupBy'
import * as entries from 'lodash/toPairs'

import { r } from '../lang'
import { generateRegistryFile } from './registry'



interface Args {
  workspace: string
  vertical: string
}


const remoteUser = 'msklvsk'
const remoteDomain = 'mova.institute'
// const remoteRuncgi = '/srv/www/nosketch/public/bonito/run.cgi'
const remoteRegistry = '/srv/corpora/registry/'
const remoteManatee = '/srv/corpora/manatee/'


if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      workspace: ['ws'],
    },
    default: {
      workspace: '.',
    },
  }) as any

  main(args)
}


//------------------------------------------------------------------------------
function main(args: Args) {
  if (!args.vertical && args.workspace) {
    let settings = JSON.parse(readFileSync(join(args.workspace, 'settings.json'), 'utf8'))
    args.vertical = settings.verticalFiles
      .map(x => join(args.workspace, x))
      .join(',')
    args.vertical = `{${args.vertical}}`
  }

  let verticalFiles = globSync(args.vertical, { nosort: true })
  let nonExistentFiles = verticalFiles.filter(x => !existsSync(x))
  if (nonExistentFiles.length) {
    throw new Error(`File(s) not found:\n${nonExistentFiles.join('\n')}`)
  }

  let catCommand = `cat ${verticalFiles.join(' ')}`

  // console.log(`building id2index map`)
  // let id2iFilePath = join(args.workspace, 'id2i.uk.txt')
  // execHere(`${catCommand} | mi-id2i > ${id2iFilePath}`)

  // let parallelWs = join(args.workspace, 'parallel')
  // let foreignId2iMaps = globSync(join(args.workspace, 'parallel/---.txt'))
  // let languages = groupBy(foreignId2iMaps, path => path.match(/\.([a-z]{2})\.vertical\.txt/)[1])
  // for (let [lang, [id2iPath]] of entries(languages)) {
  //   console.log(`building align map for ${lang}`)
  //   execHere(`mi-genalign "{${id2iFilePath},${parallelWs}/**/*.id2i.txt}" > `)
  // }


  console.log(`creating temp corpus`)

  const tempName = 'temp'
  const tempNameSub = `${tempName}_sub`
  putRegistryFile(tempName)

  console.log(`indexing a corpus from ${verticalFiles.length} files:\n${verticalFiles.join('\n')}`)
  let compileCommand = catCommand
    + ` | ssh -C ${remoteUser}@${remoteDomain}`
    + ` 'time compilecorp --no-ske --recompile-corpus ${tempName} -'`
  // --recompile-subcorpora
  console.log(`\n${compileCommand}\n`)
  execSync(compileCommand, { stdio: [undefined, process.stdout, process.stderr] })

  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const question = () => rl.question('Name the new corpus (¡CAUTION: it overwrites!)@> ', answer => {
    let newName = answer.trim()
    if (!/^[\da-z]+$/.test(answer)) {
      console.error(r`Corpus name must match /^[\da-z]+$/`)
      return question()
    }
    putRegistryFile(newName)
    let command = ``
      + `rm -rf "${remoteManatee}${newName}" "${remoteRegistry}${tempName}"`
      + ` && mv "${remoteManatee}${tempName}" "${remoteManatee}${newName}"`
      + ` && mv "${remoteRegistry}${tempNameSub}" "${remoteRegistry}${newName}_sub"`
    execRemote(command)
    rl.close()
  })
  question()
}

//------------------------------------------------------------------------------
function putRegistryFile(corpusName: string) {
  let subcorpusName = `${corpusName}_sub`
  let {corpus, subcorpus} = generateRegistryFile({
    name: corpusName,
    title: 'українська',
  })
  if (!corpus || !new RegExp(String.raw`\bPATH "${remoteManatee}`).test(corpus)) {
    throw new Error()
  }
  execRemote(`cat - > "${remoteRegistry}${corpusName}"`, corpus)
  execRemote(`cat - > "${remoteRegistry}${subcorpusName}"`, subcorpus)
}

//------------------------------------------------------------------------------
function execRemote(command: string, input?: string) {
  return execSync(`ssh -C ${remoteUser}@${remoteDomain} '${command}'`, {
    encoding: 'utf8',
    input,
    stdio: [undefined, process.stdout, process.stderr],
  })
}

//------------------------------------------------------------------------------
function execRemote2String(command: string, input?: string) {
  return execSync(`ssh -C ${remoteUser}@${remoteDomain} '${command}'`, {
    encoding: 'utf8',
    input,
  })
}

//------------------------------------------------------------------------------
function execHere(command: string) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: [undefined, process.stdout, process.stderr],
  })
}
