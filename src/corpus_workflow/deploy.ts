#!/usr/bin/env node

import { readFileSync, existsSync } from 'fs'
import { join, basename } from 'path'
import * as readline from 'readline'

import { execSync, exec } from 'child_process'
import * as minimist from 'minimist'

import { r, arrayed } from '../lang'
import { putFileSshSync, execRemoteInlpaceSync } from '../ssh_utils'
import { CatStream } from '../cat_stream'
import { execPipe } from '../child_process.node'



interface Args {
  vertical: string | string[]
  verticalList: string
  config: string
  subcorpConfig?: string
  alignmentPath: string[]
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

  let configPaths = arrayed(args.config)
  let config = configPaths.map(x => readFileSync(x, 'utf8')).join('\n')
  let verticalPaths: string[]
  if (args.vertical) {
    verticalPaths = arrayed(args.vertical)
  } else {
    verticalPaths = readFileSync(args.verticalList, 'utf8').split('\n')
  }

  if (args.alignmentPath) {
    args.alignmentPath = arrayed(args.alignmentPath)
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

  execRemoteInlpaceSync(remoteParams.hostname, remoteParams.user,
    `rm -rfv '${manateePath}/${tempName}'`)  // just in case

  // upload temp configs
  let tempConfig = nameCorpusInConfig(tempName, manateePath, params.config)
  if (!checkConfigIsSane(tempConfig, manateePath)) {
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
  // console.log(tempConfig)
  // process.exit(0)
  upload(tempConfig, `${registryPath}/${tempName}`)

  // call compilecorp
  console.log(`indexing a corpus from ${params.verticalPaths.length} files`)
  let compileCommand = `ssh -C ${remoteParams.user}@${remoteParams.hostname}`
    + ` 'time compilecorp --no-ske`
    + ` --recompile-corpus`
    + ` --recompile-subcorpora`
    + ` --recompile-align`
    + ` ${tempName} -'`
  let stream = new CatStream(params.verticalPaths)
  console.log(`\n${compileCommand}\n`)

  await execPipe(compileCommand, stream, process.stdout)

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
  return `${config}\nPATH "${path}"\n`
}

//------------------------------------------------------------------------------
function addSubcorpToConfig(path: string, config: string) {
  return `${config}\nSUBCDEF "${path}"\n`
}

//------------------------------------------------------------------------------
function addAlingmentsPaths(paths: string[], config: string) {
  return `${config}\nALIGNDEF "${paths.join(',')}"\n`
}

//------------------------------------------------------------------------------
function checkConfigIsSane(config: string, remoteManatee: string) {
  return config && new RegExp(String.raw`(^|\n)\s*PATH "${remoteManatee}`).test(config)
}


/*

##### localization
git pull && make clean && ./configure && make && sudo make install
cd /usr/local/share/locale && find . -type f -name ske.mo | xargs -I{} cp --parents {}
msgfmt misc/ske.po -o - | ssh $MI_CORP_USER@$MI_CORP_HOST "cat - > ~/ske.mo"
sudo ln ~/ske.mo /usr/share/locale/uk_UA/LC_MESSAGES/ske.mo


##### build
time printf 'umoloda\nden\nkontrakty\nchtyvo\ntyzhden\nzbruc\ndzt\nparallel' \
| parallel -u --use-cpus-instead-of-cores mi-buildcorp --part {}

mi-buildcorp --part en
mi-buildcorp --part parallel
mi-buildcorp --part chtyvo


###### en ######
mi-deploycorp \
  --vertical build/en/vertical.txt \
  --config $MI_ROOT/mi-lib/src/corpus_workflow/configs/en \
  --name en

###### pl ######
mi-buildcorp --part pl
mi-deploycorp \
  --vertical build/pl/vertical.txt \
  --config $MI_ROOT/mi-lib/src/corpus_workflow/configs/pl \
  --name pl

###### uk ######


          ###### parallel

cat build/parallel/vertical.txt | mi-id2i > paruk_id2i.txt
cat build/en/vertical.txt | mi-id2i > build/en/id2i.txt
cat build/pl/vertical.txt | mi-id2i > build/pl/id2i.txt

mi-genalign paruk_id2i.txt 'data/parallel/*.alignment.xml' build/en/id2i.txt \
| mi-sortalign \
| fixgaps.py \
| compressrng.py \
> paruk_en.align.txt

mi-genalign paruk_id2i.txt 'data/parallel/*.alignment.xml' build/pl/id2i.txt \
| mi-sortalign \
| fixgaps.py \
| compressrng.py \
> paruk_pl.align.txt

mi-deploycorp \
--vertical build/parallel/vertical.txt \
--config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk \
--config $MI_ROOT/mi-lib/src/corpus_workflow/configs/paruk \
--alignmentPath paruk_en.align.txt --alignmentPath paruk_pl.align.txt

mi-deploycorp \
--vertical build/parallel/vertical.txt \
--config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk \
--config $MI_ROOT/mi-lib/src/corpus_workflow/configs/paruk \
--alignmentPath paruk_pl.align.txt --name paruk

cat build/parallel/vertical.txt | mi-genalign 'data/parallel/*.alignment.xml' build/pl/id2i.txt


###### main

mi-deploycorp \
--verticalList uk_list.txt \
--config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk \
--subcorp-config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk_sub



###### tests

cat test_list.txt | xargs cat | mi-id2i > test_id2i.txt

mi-genalign test_id2i.txt 'data/parallel/*.alignment.xml' build/en/id2i.txt \
  | mi-sortalign \
  | fixgaps.py \
  | compressrng.py \
  > test_uk_en.align

mi-deploycorp \
  --verticalList test_list.txt \
  --config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk \
  --subcorp-config $MI_ROOT/mi-lib/src/corpus_workflow/configs/uk_sub \
  --alignmentPath test_uk_en.align \
  --name test





cwb-encode -R ~/Developer/cwb/registry/uk -d ~/Developer/cwb/data/uk -f /Volumes/pogrib/corpworkspace/cwb.vrt -P lemma -P tag -P tag2 -c utf8 -v

cwb-encode -R ~/Developer/cwb/registry/uk -d ~/Developer/cwb/data/uk -f cwb.vrt -f cwb_chtyvo.vrt -c utf8 -v && cwb-make uk && cwb-scan-corpus -f 1000 -C uk word+0 word+1 word+2 | sort -nr -k 1 > ~/Downloads/3gram.txt

cwb-scan-corpus -f 4000 -C uk word+0 word+1 | sort -nr -k 1 > ~/Downloads/2gram.txt; cwb-scan-corpus -f 50 -C uk word+0 word+1 word+2 word+3 | sort -nr -k 1 > ~/Downloads/4gram.txt; cwb-scan-corpus -f 40 -C uk word+0 word+1 word+2 word+3 word+4 | sort -nr -k 1 > ~/Downloads/5gram.txt


cwb-encode -R ~/Developer/cwb/registry/chtyvo -d ~/Developer/cwb/data/chtyvo -f cwb_chtyvo.vrt -c utf8 -v

cwb-scan-corpus -C test word+0 word+1 word+2 | pcregrep '^\d{2}' | sort -nr -k 1



*/
