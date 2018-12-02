import { Stream } from 'stream'
import { join, dirname } from 'path'
import { sync as mkdirpSync } from 'mkdirp'

import * as fs from 'fs'



////////////////////////////////////////////////////////////////////////////////
export class FsMap {
  constructor(private directoryPath: string) {
  }

  set(key: string, value: Buffer | string) {
    // console.log(`writingggggg to ${key} ${value.length}`)
    fs.writeFileSync(this.preparePath(key), value)
  }

  get(key: string) {
    return fs.readFileSync(this.getPath(key), 'utf8')
  }

  setStream(key: string, value: Stream) {
    return new Promise<void>((resolve, reject) => {
      value
        .on('error', function (err) {
          console.error(err)
          reject(err)
        })
        .once('end', () => {
          resolve()
        })
        .pipe(fs.createWriteStream(this.preparePath(key)))
    })
  }

  has(key: string) {
    return fs.existsSync(this.getPath(key))
  }

  private getPath(key: string) {
    return join(this.directoryPath, key)
  }

  private preparePath(key: string) {
    let path = this.getPath(key)
    mkdirpSync(dirname(path))
    return path
  }
}
