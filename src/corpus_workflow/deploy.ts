#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import * as readline from 'readline'

import { sync as globSync } from 'glob'
import { execSync } from 'child_process'
import * as minimist from 'minimist'

import { r } from '../lang'
import { generateRegistryFile } from './registry'



interface Args {
  workspace: string
  vertical: string
}


const remoteUser = 'msklvsk'
const remoteDomain = 'mova.institute'
const remoteRuncgi = '/srv/www/nosketch/public/bonito/run.cgi'
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

  // let versionStr = execRemote2String(r`grep "^\s*corplist" ${remoteRuncgi}`)
  // versionStr = versionStr.match(/everything_(\d+)/) ![1]
  // let n = Number(versionStr) + 1
  console.log(`creating temp corpus`)

  const tempName = 'temp'
  const tempNameSub = `${tempName}_sub`
  let configs = generateRegistryFile(tempName, tempNameSub)
  execRemote(`cat - > ${remoteRegistry}${tempName}`, configs.corpus)
  execRemote(`cat - > ${remoteRegistry}${tempNameSub}`, configs.subcorpus)

  let verticalFiles = globSync(args.vertical, { nosort: true })
  let nonExistentFiles = verticalFiles.filter(x => !existsSync(x))
  if (nonExistentFiles.length) {
    throw new Error(`File(s) not found:\n${nonExistentFiles.join('\n')}`)
  }
  console.log(`indexing a corpus from ${verticalFiles.length} files:\n${verticalFiles.join('\n')}`)
  let compileCommand = `cat ${verticalFiles.join(' ')} `
    + `| ssh -C ${remoteUser}@${remoteDomain}`
    + ` 'time compilecorp --no-hashws --no-sketches --no-biterms --no-trends`
    + ` --no-lcm --recompile-corpus ${tempName} -'`
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
      console.error(r`corpus name should match /^[\da-z]+$/`)
      return question()
    }
    let command = `cp ${remoteRuncgi} ~`
      + ` && mv ${remoteManatee}${tempName} ${remoteManatee}${newName}`
      + ` && mv ${remoteRegistry}${tempName} ${remoteRegistry}${newName}`
      + ` && mv ${remoteRegistry}${tempNameSub} ${remoteRegistry}${newName}_sub`
    // + `&& sed -i -E 's//${}/g' ${remoteRuncgi}`
    execRemote(command)
    rl.close()
  })
  question()
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
