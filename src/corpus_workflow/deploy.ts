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
import { putFileSshSync, execRemoteInlpaceSync } from '../ssh_utils'



interface Args {
  vertical: string | string[]
  verticalList: string
  config: string
  subcorpConfig?: string
  alignmentPaths: string[]
  name?: string
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
  const user = process.env.MI_CORP_USER
  const hostname = process.env.MI_CORP_HOST
  const remoteCorpora = process.env.MI_CORPORA_PATH
  const bonitoDataPath = process.env.MI_BONITO_DATA_PATH

  if (!user || !hostname || !remoteCorpora || !bonitoDataPath) {
    throw new Error(`Environment variables not set`)
  }

  let config = readFileSync(args.config, 'utf8')
  let verticalPaths: string[]
  if (args.vertical) {
    verticalPaths = arrayed(args.vertical)
  } else {
    verticalPaths = readFileSync(args.verticalList, 'utf8').split('\n')
  }

  if (args.alignmentPaths) {
    args.alignmentPaths = arrayed(args.alignmentPaths)
  }

  let nonExistentFiles = verticalPaths.filter(x => !existsSync(x))
  if (nonExistentFiles.length) {
    throw new Error(`File(s) not found:\n${nonExistentFiles.join('\n')}`)
  }

  let corpusParams: CorpusParams = {
    verticalPaths,
    config,
    subcorpConfig: args.subcorpConfig && readFileSync(args.subcorpConfig, 'utf8'),
    name: args.name,
    alignmentPaths: args.alignmentPaths,
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
  verticalPaths: string[]
  config: string
  subcorpConfig?: string
  alignmentPaths?: string[]
  name?: string
}

interface RemoteParams {
  hostname: string
  user: string
  corporaPath: string
  bonitoDataPath: string
}

//------------------------------------------------------------------------------
function indexCorpusRemote(params: CorpusParams, remoteParams: RemoteParams) {
  const upload = (content: string, path: string) =>
    putFileSshSync(remoteParams.hostname, remoteParams.user, path, content)

  const manateePath = normalizePath(`${remoteParams.corporaPath}/manatee`)
  const registryPath = normalizePath(`${remoteParams.corporaPath}/registry`)
  const verticalPath = normalizePath(`${remoteParams.corporaPath}/vertical`)

  const tempName = 'temp'
  const subcorpSuffix = '_sub'
  const tempConfigPath = `${registryPath}/${tempName}`
  const tempSubcorpConfigPath = `${tempConfigPath}${subcorpSuffix}`

  execRemoteInlpaceSync(remoteParams.hostname, remoteParams.user,
    `rm -rfv '${manateePath}/${tempName}'`)  // just in case

  // upload temp configs
  let tempConfig = nameCorpusInConfig(tempName, manateePath, params.config)
  if (!checkConfigIsSane) {
    throw new Error(`Bad corpus config`)
  }
  if (params.subcorpConfig) {
    tempConfig = addSubcorpToConfig(tempSubcorpConfigPath, tempConfig)
    upload(params.subcorpConfig, tempSubcorpConfigPath)
  }

  // upload alingments
  if (params.alignmentPaths) {
    var tempAlingmentPaths = params.alignmentPaths.map(x => `${verticalPath}/temp_${basename(x)}`)
    tempConfig = addAlingmentsPaths(tempAlingmentPaths, tempConfig)
    for (let path of params.alignmentPaths) {
      let filename = basename(path)
      upload(readFileSync(path, 'utf8'), `${verticalPath}/temp_${basename(filename)}`)  // todo
    }
  }

  upload(tempConfig, `${registryPath}/${tempName}`)

  // call compilecorp
  console.log(`indexing a corpus from ${params.verticalPaths.length} files`)
  let catCommand = `cat ${params.verticalPaths.join(' ')}`
  let compileCommand = catCommand
    + ` | ssh -C ${remoteParams.user}@${remoteParams.hostname}`
    + ` 'time compilecorp --no-ske`
    + ` --recompile-corpus`
    + ` --recompile-subcorpora`
    + ` --recompile-align`
    + ` ${tempName} -'`
  console.log(`\n${compileCommand}\n`)
  execHere(compileCommand)


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
      + ` && sudo -u www-data rm -rfv "${remoteParams.bonitoDataPath}/cache/${name}"`
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
  return config + `PATH "${path}"\n`
}

//------------------------------------------------------------------------------
function addSubcorpToConfig(path: string, config: string) {
  return config + `SUBCDEF "${path}"\n`
}

//------------------------------------------------------------------------------
function addAlingmentsPaths(paths: string[], config: string) {
  return config + `ALIGNDEF "${paths.join(',')}"\n`
}

//------------------------------------------------------------------------------
function checkConfigIsSane(config: string, remoteManatee: string) {
  return config && new RegExp(String.raw`\bPATH "${remoteManatee}`).test(config)
}

//------------------------------------------------------------------------------
function execHere(command: string) {
  return execSync(command, {
    stdio: [undefined, process.stdout, process.stderr],
  })
}



/*

git pull && make clean && ./configure && make && sudo make install
cd /usr/local/share/locale && find . -type f -name ske.mo | xargs -I{} cp --parents {}
msgfmt misc/ske.po -o - | ssh $MI_CORP_USER@$MI_CORP_HOST "cat - > ~/ske.mo"
sudo ln ~/ske.mo /usr/share/locale/uk_UA/LC_MESSAGES/ske.mo




mi-buildcorp --part en
mi-buildcorp --part parallel
mi-buildcorp --part chtyvo



cat uk.list.txt \
  | xargs cat \
  | mi-id2i \
  > uk_id2i.txt

mi-genalign < uk_id2i.txt

cat uk.list.txt \
  | xargs cat \
  | mi-genalign 'data/parallel/*.alignment.xml' build/en/en.id2i.txt \
  | tee uk_id2i.txt \
  | fixgaps.py \
  | compressrng.py > uk_en.align.txt




mi-deploycorp \
  --vertical build/en/en.vertical.txt \
  --config $MI_ROOT/mi-lib/src/corpus_workflow/configs/en \
  --name en

mi-deploycorp \
  --verticalList uk.list.txt \
  --config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk \
  --subcorp-config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk_sub \
  --alignmentPaths uk_en.align.txt





###### tests

cat test.list.txt \
  | xargs cat \
  | mi-id2i \
  > test_id2i.txt

mi-genalign build/en/id2i.txt 'data/parallel/*.alignment.xml' test_id2i.txt \
  | mi-sortalign \
  | fixgaps.py \
  | compressrng.py \
  > test_en_uk.align.txt

mi-genalign test_id2i.txt 'data/parallel/*.alignment.xml' build/en/id2i.txt \
  | mi-sortalign \
  | fixgaps.py \
  | compressrng.py \
  > test_uk_en.align.txt

mi-deploycorp \
  --verticalList test.list.txt \
  --config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk \
  --subcorp-config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk_sub \
  --alignmentPaths test_uk_en.align.txt \
  --name test


*/
