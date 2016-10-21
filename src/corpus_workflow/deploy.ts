#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import * as readline from 'readline'

import { sync as globSync } from 'glob'
import { execSync } from 'child_process'
import * as minimist from 'minimist'
import * as groupBy from 'lodash/groupBy'
import * as entries from 'lodash/toPairs'
import * as castArray from 'lodash/castArray'

import { r, arrayed } from '../lang'
import { generateRegistryFile } from './registry'
import { putFileSshSync, execRemoteInlpaceSync } from '../ssh_utils'



interface Args {
  vertical: string | string[]
  verticalList: string
  definition: string
  name?: string
}


if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      verticalList: ['vert-list'],
    },
  }) as any

  main(args)
}


//------------------------------------------------------------------------------
function main(args: Args) {
  const user = process.env.MI_CORP_USER
  const hostname = process.env.MI_CORP_HOST
  const remoteCorpora = process.env.MI_CORPORA_PATH

  if (!user || !hostname || !remoteCorpora) {
    throw new Error(`Environment variables not set`)
  }

  let definition = readFileSync(args.definition, 'utf8')
  let verticalPaths: string[]
  if (args.vertical) {
    verticalPaths = arrayed(args.vertical)
  } else {
    verticalPaths = readFileSync(args.verticalList, 'utf8').split('\n')
  }

  let nonExistentFiles = verticalPaths.filter(x => !existsSync(x))
  if (nonExistentFiles.length) {
    throw new Error(`File(s) not found:\n${nonExistentFiles.join('\n')}`)
  }

  indexCorpusRemote({
    verticalPaths,
    definitionTemplate: definition,
    name: args.name,
  }, {
      hostname, user,
      corporaPath: remoteCorpora,
    })
}


interface CorpusParams {
  verticalPaths: string[]
  definitionTemplate: string
  alignmentPaths?: string[]
  subcorpDefinition?: string
  alignPath?: string
  name?: string
}

interface RemoteParams {
  hostname: string
  user: string
  corporaPath: string
}

//------------------------------------------------------------------------------
function indexCorpusRemote(params: CorpusParams, remoteParams: RemoteParams) {
  const upload = (path: string, content: string) =>
    putFileSshSync(remoteParams.hostname, remoteParams.user, path, content)

  const manateePath = normalizePath(`${remoteParams.corporaPath}/manatee`)
  const registryPath = normalizePath(`${remoteParams.corporaPath}/registry`)
  const verticalPath = normalizePath(`${remoteParams.corporaPath}/vertical`)

  const tempName = 'temp'
  const tempSubcName = `${tempName}_sub`
  const registryTempPath = `${registryPath}/${tempName}`

  execRemoteInlpaceSync(remoteParams.hostname, remoteParams.user,
    `rm -rfv '${manateePath}/${tempName}'`)  // just in case

  // upload temp defifnitions
  let tempDefinition = nameCorpusInDefinition(tempName, manateePath, params.definitionTemplate)
  if (!checkDefinitionIsSane) {
    throw new Error(`Bad corpus definition`)
  }
  upload(`${registryPath}/${tempName}`, tempDefinition)
  if (params.subcorpDefinition) {
    upload(registryTempPath, tempDefinition)
  }
  if (params.alignmentPaths) {
    for (let path of params.alignmentPaths) {
      let filename = basename(path)
      upload(`${verticalPath}/temp_${filename}`, readFileSync(path, 'utf8'))  // todo
    }
  }

  // call compilecorp
  console.log(`indexing a corpus from ${params.verticalPaths.length} files`)
  let catCommand = `cat ${params.verticalPaths.join(' ')}`
  let compileCommand = catCommand
    + ` | ssh -C ${remoteParams.user}@${remoteParams.hostname}`
    + ` 'time compilecorp --no-ske`
    + ` --recompile-corpus --recompile-subcorpora`
    // + ` --recompile-align`
    + ` ${tempName} -'`
  console.log(`\n${compileCommand}\n`)
  execHere(compileCommand)


  const overwrite = (name: string) => {
    let newDefintion = nameCorpusInDefinition(name, manateePath, params.definitionTemplate)
    upload(registryTempPath, newDefintion)

    let command = ``
      + `rm -rfv "${manateePath}/${name}"`
      + ` && mv "${manateePath}/${tempName}" "${manateePath}/${name}"`
      + ` && mv "${registryTempPath}" "${registryPath}/${name}"`
    execRemoteInlpaceSync(remoteParams.hostname, remoteParams.user, command)
  }

  if (params.name) {
    overwrite(params.name)
  } else {
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
      overwrite(newName)
      rl.close()
    })
    question()
  }
}

//------------------------------------------------------------------------------
function normalizePath(path: string) {
  return path.replace(/\/{2,}/, '/')
}

//------------------------------------------------------------------------------
function nameCorpusInDefinition(name: string, manateePath: string, definition: string) {
  let path = normalizePath(`${manateePath}/${name}`)
  return definition + `PATH "${path}"\n`
}

//------------------------------------------------------------------------------
function checkDefinitionIsSane(definition: string, remoteManatee: string) {
  return definition && new RegExp(String.raw`\bPATH "${remoteManatee}`).test(definition)
}

//------------------------------------------------------------------------------
/*function putRegistryFile(corpusName: string) {
  let subcorpusName = `${corpusName}_sub`
  let {corpus, subcorpus} = generateRegistryFile({
    name: corpusName,
    title: 'корпус української',
  })
  if (!corpus || !new RegExp(String.raw`\bPATH "${remoteManatee}`).test(corpus)) {
    throw new Error()
  }
  execRemote(`cat - > "${remoteRegistry}${corpusName}"`, corpus)
  execRemote(`cat - > "${remoteRegistry}${subcorpusName}"`, subcorpus)
}*/

//------------------------------------------------------------------------------
function execHere(command: string) {
  return execSync(command, {
    stdio: [undefined, process.stdout, process.stderr],
  })
}
