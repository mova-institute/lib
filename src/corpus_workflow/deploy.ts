import * as readline from 'readline'
import { sync as globSync } from 'glob'
import { join } from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import * as minimist from 'minimist'
import { execSync } from 'child_process'
import { r } from '../lang'
import { generateRegistryFile } from './registry'



interface Args {
  // workspace: string
  vertical: string
}


const remoteUser = 'msklvsk'
const remoteDomain = 'mova.institute'
const remoteRuncgi = '/srv/www/nosketch/public/bonito/run.cgi'
const remoteRegistry = '/srv/corpora/registry/'


if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      // 'workspace': ['ws'],
      // 'vertical': ['v'],
    },
    default: {
      vertical: './{kotsyba.vertical.txt,umoloda.vertical*,dzt.vertical*,kontrakty.vertical*}',
    },
  }) as any

  main(args)
}



function main(args: Args) {
  let versionStr = execRemote2String(r`grep "^\s*corplist" ${remoteRuncgi}`)
  versionStr = versionStr.match(/everything_(\d+)/)![1]
  let n = Number(versionStr) + 1
  console.log(`creating corpus version ${n}`)

  let configs = generateRegistryFile(n)
  let corpusName = `everything_${n}`
  execRemote(`cat - > ${remoteRegistry}${corpusName}`, configs.corpus)
  execRemote(`cat - > ${remoteRegistry}${corpusName}_sub`, configs.subcorpus)

  let verticalFiles = globSync(args.vertical, { nosort: true })
  console.log(`indexing a corpus from ${verticalFiles.length} files:\n${verticalFiles.join('\n')}`)
  let compileCommand = `cat ${verticalFiles.join(' ')} `
    + `| ssh -C ${remoteUser}@${remoteDomain}`
    + ` 'time compilecorp --no-hashws --no-sketches --no-biterms --no-trends`
    + ` --no-lcm --recompile-corpus --recompile-subcorpora ${corpusName} -'`
  console.log(`\n${compileCommand}\n`)
  execSync(compileCommand, { stdio: [undefined, process.stdout, process.stderr] })

  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  const question = () => rl.question('Swith server to the new corpus? (y/n)@> ', answer => {
    switch (answer.toLowerCase()) {
      case 'y':
        execRemote(`cp ${remoteRuncgi} ~`)
        execRemote(`sed -i -E 's/everything_[0-9]+/everything_${n}/g' ${remoteRuncgi}`)
        break
      case 'n':
        break
      default:
        return question()
    }
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
