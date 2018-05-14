#!/usr/bin/env node

import { r, arrayed } from '../lang'
import { putFileSshSync, execRemoteInlpaceSync } from '../ssh_utils'
import { CatStream } from '../cat_stream'
import { execPipe } from '../child_process.node'
import { parseJsonFileSync } from '../utils.node'
import { generateRegistryFileUkGolden } from './registry_file_builder'

import { readFileSync, existsSync } from 'fs'
import { basename } from 'path'
import * as readline from 'readline'
import * as minimist from 'minimist'



interface Args {
  vertical: string | Array<string>
  verticalList: string
  registryJson: string
  subcorpConfig?: string
  alignmentPath: Array<string>
  name?: string
  user: string
  host: string
  corporaPath: string
  bonitoDataPath: string
}


if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      verticalList: ['vert-list'],
      subcorpConfig: ['subcorp-config'],
    },
  }) as any

  main(args)
}


//------------------------------------------------------------------------------
function main(args: Args) {
  const user = args.user || process.env.MI_CORP_USER
  const hostname = args.host || process.env.MI_CORP_HOST
  const remoteCorpora = args.corporaPath || process.env.MI_CORPORA_PATH
  const bonitoDataPath = args.bonitoDataPath || process.env.MI_BONITO_DATA_PATH

  if (!user || !hostname || !remoteCorpora || !bonitoDataPath) {
    throw new Error(`Environment variables not set`)
  }

  let configJson = parseJsonFileSync(args.registryJson)
  let config = generateRegistryFileUkGolden(configJson)
  let verticalPaths: Array<string>
  if (args.vertical) {
    verticalPaths = arrayed(args.vertical)
  } else {
    verticalPaths = readFileSync(args.verticalList, 'utf8').split('\n').filter(x => x)
  }

  let nonExistentFiles = verticalPaths.filter(x => !existsSync(x))
  if (nonExistentFiles.length) {
    throw new Error(`File(s) not found:\n${nonExistentFiles.join('\n')}`)
  }

  if (args.alignmentPath) {
    args.alignmentPath = arrayed(args.alignmentPath)
  }

  let corpusParams: CorpusParams = {
    verticalPaths,
    config,
    subcorpConfig: args.subcorpConfig && readFileSync(args.subcorpConfig, 'utf8'),
    name: args.name,
    alignmentPaths: args.alignmentPath,
  }

  let remoteParams: RemoteParams = {
    hostname,
    user,
    corporaPath: remoteCorpora,
    bonitoDataPath,
  }

  indexCorpusRemote(corpusParams, remoteParams)
}


interface CorpusParams {
  verticalPaths: Array<string>
  config: string
  subcorpConfig?: string
  alignmentPaths?: Array<string>
  name?: string
}

interface RemoteParams {
  hostname: string
  user: string
  corporaPath: string
  bonitoDataPath: string
}

//------------------------------------------------------------------------------
async function indexCorpusRemote(params: CorpusParams, remoteParams: RemoteParams) {
  const upload = (content: string, path: string) =>
    putFileSshSync(remoteParams.hostname, remoteParams.user, path, content)

  const manateePath = normalizePath(`${remoteParams.corporaPath}/manatee`)
  const registryPath = normalizePath(`${remoteParams.corporaPath}/registry`)
  const verticalPath = normalizePath(`${remoteParams.corporaPath}/vertical`)

  const tempName = 'temp'
  const subcorpSuffix = '_sub'
  const tempConfigPath = `${registryPath}/${tempName}`
  const tempSubcorpConfigPath = `${tempConfigPath}${subcorpSuffix}`
  const tempVerticalPath = `${verticalPath}/temp.vrt.gz`

  const sshCreds = `${remoteParams.user}@${remoteParams.hostname}`

  execRemoteInlpaceSync(remoteParams.hostname, remoteParams.user,
    `rm -rfv '${manateePath}/${tempName}'`)  // just in case

  // upload temp configs
  let tempConfig = nameCorpusInConfig(tempName, manateePath, params.config)
  tempConfig = `${tempConfig}\nVERTICAL "|zcat ${tempVerticalPath}"\n`
  if (!checkConfigIsSane(tempConfig, manateePath)) {
    throw new Error(`Bad corpus config`)
  }
  if (params.subcorpConfig) {
    console.log(`uploading subcorp config`)
    tempConfig = addSubcorpToConfig(tempSubcorpConfigPath, tempConfig)
    upload(params.subcorpConfig, tempSubcorpConfigPath)
  }

  // upload alingments
  if (params.alignmentPaths) {
    console.log(`uploading alingments`)
    var tempAlingmentPaths = params.alignmentPaths.map(x => `${verticalPath}/temp_${basename(x)}`)
    tempConfig = addAlingmentsPaths(tempAlingmentPaths, tempConfig)
    for (let path of params.alignmentPaths) {
      let filename = basename(path)
      upload(readFileSync(path, 'utf8'), `${verticalPath}/temp_${basename(filename)}`)  // todo
    }
  }
  // console.log(tempConfig)
  // process.exit(0)
  upload(tempConfig, `${registryPath}/${tempName}`)


  // upload verticals
  console.log(`uploading vertical file from ${params.verticalPaths.length} parts`)
  let uploadCommand = `gzip -9 | ssh ${sshCreds} 'cat - > ${tempVerticalPath}'`
  console.log(uploadCommand)
  await execPipe(uploadCommand, new CatStream(params.verticalPaths), process.stdout)


  // call compilecorp
  console.log(`indexing corpus`)
  let compileCommand = `time compilecorp`
    + ` --no-ske`
    + ` --recompile-corpus`
    + ` --recompile-subcorpora`
    + ` --recompile-align`
    + ` ${tempName}`
  console.log(`\n${compileCommand}\n`)
  execRemoteInlpaceSync(remoteParams.hostname, remoteParams.user, compileCommand)
  // process.exit(0)

  const overwrite = (name: string) => {
    let newConfig = nameCorpusInConfig(name, manateePath, params.config)
    if (params.subcorpConfig) {
      var newSubcorpConfigPath = `${registryPath}/${name}${subcorpSuffix}`
      newConfig = addSubcorpToConfig(newSubcorpConfigPath, newConfig)
    }
    if (params.alignmentPaths) {
      let alingmentPaths = params.alignmentPaths.map(x => `${verticalPath}/${basename(x)}`)
      newConfig = addAlingmentsPaths(alingmentPaths, newConfig)
    }

    upload(newConfig, tempConfigPath)

    let command = ``
      + `rm -rfv "${manateePath}/${name}"`
      + ` && mv "${manateePath}/${tempName}" "${manateePath}/${name}"`
      + ` && mv "${tempConfigPath}" "${registryPath}/${name}"`
      + ` && sudo -u www-data rm -rf "${remoteParams.bonitoDataPath}/cache/${name}"`
      + ` && sudo -u kontext rm -rf "/srv/corpora/kontext/redis-conc-cache/${name}"`
    if (params.subcorpConfig) {
      command += ` && mv "${tempSubcorpConfigPath}" "${newSubcorpConfigPath}"`
    }
    if (params.alignmentPaths) {
      command += tempAlingmentPaths.map(x =>
        ` && mv "${x}" "${verticalPath}/${basename(x).substr('temp_'.length)}"`).join('')
    }
    console.log(command)
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
function nameCorpusInConfig(name: string, manateePath: string, config: string) {
  let path = normalizePath(`${manateePath}/${name}`)
  return `${config}\nPATH "${path}"\n`
}

//------------------------------------------------------------------------------
function addSubcorpToConfig(path: string, config: string) {
  return `${config}\nSUBCDEF "${path}"\n`
}

//------------------------------------------------------------------------------
function addAlingmentsPaths(paths: Array<string>, config: string) {
  return `${config}\nALIGNDEF "${paths.join(',')}"\n`
}

//------------------------------------------------------------------------------
function checkConfigIsSane(config: string, remoteManatee: string) {
  return config && new RegExp(String.raw`(^|\n)\s*PATH "${remoteManatee}`).test(config)
}
