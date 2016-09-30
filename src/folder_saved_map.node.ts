import * as fs from 'fs'
import { basename, join } from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import * as glob from 'glob'



export class FolderSavedMap {
  private keySet = new Set<string>()

  constructor(private directoryPath: string) {
    mkdirpSync(directoryPath)
    glob.sync(`${directoryPath}/*`)
      .map(x => basename(x))
      // .replace(/\.[^\.]+$/, '')
      .forEach(x => this.keySet.add(x))
  }

  set(key: string, value: string) {
    if (!this.keySet.has(key)) {
      fs.writeFileSync(join(this.directoryPath, key), value)
      this.keySet.add(key)
    }
  }

  has(key: string) {
    return this.keySet.has(key)
  }
}
