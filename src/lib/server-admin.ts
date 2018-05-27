import { mu } from '../mu'
import { execSync2String } from '../child_process.node'
import { makeObject } from '../lang'
import { nowSortableDatetime } from '../date'

import { sync as mkdirpSync } from 'mkdirp'
import * as stringifyStable from 'json-stable-stringify'

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'



export class ServerAdmin {
  private sensorLogPath = '/mnt/hdd/env/log/sensors'
  private sensorLogFile: number
  private sensorLogInterval: number
  private prevSensorsLoggedLine: string


  start() {
    // fool BMC to leave FANA alone
    // (zero threshold is inclusive and triggers a panic when the fan is turned off)
    execSync('sudo ipmitool sensor thresh FANA lower 99999 99999 99999')
    // turn off FANA
    execSync('sudo ipmitool raw 0x30 0x70 0x66 0x01 0x01 0x01')

    mkdirpSync(path.dirname(this.sensorLogPath))
    this.sensorLogFile = fs.openSync(this.sensorLogPath, 'a')

    log('====== STARTING =======', this.sensorLogFile)

    this.sensorLogInterval = setInterval(this.logSensors.bind(this), 2000)
  }

  private logSensors() {
    let line = stringifyStable(this.gatherSensors())

    if (line !== this.prevSensorsLoggedLine) {
      this.prevSensorsLoggedLine = line
      log(line, this.sensorLogFile)
    }
  }

  private gatherSensors() {
    let ret = parseIpmitoolSensor(execSync2String('sudo ipmitool sensor'))
    ret['digitemp'] = execSync2String(
      `sudo digitemp_DS9097 -c ${process.env.DIGITEMPRC} -q -t 0 -o "%.2C"`).trim()
    Object.assign(ret, parseHddtemp(execSync2String(`sudo hddtemp /dev/sd?`)))
    return ret
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function log(line: string, file: number) {
  fs.writeSync(file, `${nowSortableDatetime()} ${line}\n`)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function parseIpmitoolSensor(val: string) {
  let pairs = val.trim().split('\n')
    .map(line => line.trim()
      .split(/\s*\|\s*/g, 2)
    )
    .filter(kv => kv[1] !== 'na')
  return makeObject(pairs)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function parseHddtemp(val: string) {
  let pairs = val.trim()
    .split('\n')
    .map(x => [...x.match(/\/(\w+):.*: (\d+)°C/)].slice(1))
  return makeObject(pairs)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  let admin = new ServerAdmin()
  admin.start()
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
