#!/usr/bin/env node

import * as fs from 'fs'
import { execSync, exec, ChildProcess } from 'child_process'

import * as minimist from 'minimist'


interface Args {
  runOnClientBefore: string
  runOnClientAfter: string
  setupScript: string
  prefix: string
  linodePerLine: string
  location: string
  distribution: string
  plan: string
}

type Dict<T> = { [key: string]: T }

interface LinodeDescriptor {
  label: string
  ips: string[]
  group: string
  totalhd: string
  linodeid: string
  location: string
  status: string
  request_action: string
  totalram: string
  backupsenabled: string
}

export interface LinodeConfig {
  // label: string
  group: string
  location: string
  plan: string
  distribution: string
  password?: string
}

interface LinodeHandle {
  sshProcess: ChildProcess
}

interface HerdConfig {
  prefix: string
  runOnClientBefore: string,
  runOnClientAfter: string,
  linodeConfig: LinodeConfig,
  setupScript: string,
  scriptsPerLinode: string[]
}

class LinodeFarmer {
  static async newHerd({
    prefix,
    scriptsPerLinode,
    linodeConfig,
    runOnClientBefore,
    setupScript,
    }: HerdConfig) {
    for (let [i, command] of scriptsPerLinode.entries()) {
      let label = `${prefix}${i}`
      let linodeDescriptor = await createLinode(label, linodeConfig)
      process.stdout.write(`created linode ${label} `)
      let creds = `root@${linodeDescriptor.ips[0]}`
      await execPromise(`ssh -oStrictHostKeyChecking=no ${creds} 'ls > /dev/null'`)
      execSync(`CREDS=${creds} bash`, { input: runOnClientBefore })
      process.stdout.write(`runOnClientBefore `)
      let theCommand = `apt-get install -y inotify-tools; ${setupScript} ${command} && touch ~/.done &`
      exec(`ssh -oStrictHostKeyChecking=no ${creds} '${theCommand}'`, (e) => {
        if (e) {
          console.error(e)
          throw e
        }
        console.log(`successfully spawned linode ${i}`)
      })
    }
  }

  static async takeHerd(linodes: LinodeDescriptor[], runOnClientAfter: string) {
    for (let linode of linodes) {
      let creds = `root@${linode.ips[0]}`
      let watchCommand = `ssh ${creds} 'ls ~/.done || inotify'`
      let waiter = exec(watchCommand, (e) => {
        execSync(`CREDS=${creds} LABEL=${linode.label} bash`, { input: runOnClientAfter })
        deleteLinode(linode.label)
          .then(() => console.log(`linode "${linode.label}" deleted`))
      })
      waiter = waiter
    }
  }

  // private handles = new Set<LinodeHandle>()
  // private construct() { }
}

//------------------------------------------------------------------------------
function getArgs() {
  let ret = minimist(process.argv.slice(2), {
    boolean: [

    ],
    default: {
      location: process.env.DEFAULT_LINODE_LOCATION,
      distribution: process.env.DEFAULT_LINODE_DISTRIBUTION,
      plan: process.env.DEFAULT_LINODE_PLAN,
    }
  }) as any as Args

  return ret
}

//------------------------------------------------------------------------------
async function main() {
  const args = getArgs()
  const prefix = `${args.prefix}_`
  let runningLinodes = await getLinodesWithPrefix(prefix)
  if (runningLinodes.length) {
    console.log(`${runningLinodes.length} running linodes present`)
    await LinodeFarmer.takeHerd(runningLinodes, args.runOnClientAfter)
  } else {
    console.log(`starting a farm`)
    let setupScript = fs.readFileSync(args.setupScript, 'utf8')
    let scriptsPerLinode = fs.readFileSync(args.linodePerLine, 'utf8').trim().split('\n')
    let linodeConfig: LinodeConfig = {
      distribution: args.distribution,
      group: 'farm',
      location: args.location,
      password: 'lin0d2',
      plan: args.plan
    }

    LinodeFarmer.newHerd({
      prefix,
      setupScript,
      linodeConfig,
      runOnClientBefore: args.runOnClientBefore,
      runOnClientAfter: args.runOnClientAfter,
      scriptsPerLinode,
    })
  }
}






//------------------------------------------------------------------------------
async function createLinode(label: string, params: LinodeConfig) {
  let command = `linode create ${label} `
  command += Object.entries(params).map(([k, v]) => `--${k} '${v}'`).join(' ')
  command += ' --wait'
  console.log(command)
  await execPromise(command)
  let ret = await getLinodeInfo(label)

  return ret
}

//------------------------------------------------------------------------------
async function getLinodesWithPrefix(prefix: string) {
  let allRunningLinodes = await getLinodeList()
  return allRunningLinodes.filter(x => x.label.startsWith(prefix))
}

//------------------------------------------------------------------------------
function deleteLinode(label: string) {
  return execPromise(`linode delete ${label}`)
}

//------------------------------------------------------------------------------
async function getLinodeInfo(label: string) {
  let command = `linode show ${label} --json`
  let { stdout } = await execPromise(command)
  return JSON.parse(stdout)[label] as LinodeDescriptor
}

//------------------------------------------------------------------------------
function execPromise(command: string) {
  return new Promise<{ stdout: string, stderr: string }>((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err)
      } else {
        resolve({ stdout, stderr })
      }
    })
  })
}

//------------------------------------------------------------------------------
async function getLinodeList() {
  let { stdout } = await execPromise(`linode list --json`)
  let dict = JSON.parse(stdout) as Dict<LinodeDescriptor>
  return Object.values(dict)
}


//==============================================================================
if (require.main === module) {
  main()
}
