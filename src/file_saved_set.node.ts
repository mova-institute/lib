import * as fs from 'fs'
import { basename } from 'path'
import { sync as mkdirpSync } from 'mkdirp'



export class FileSavedSet {
  private set = new Set<string>()
  private file: number

  constructor(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.readFileSync(filePath, 'utf8').split('\n').forEach(x => this.set.add(x))
    }
    mkdirpSync(basename(filePath))
    this.file = fs.openSync(filePath, 'a')
  }

  add(value: string) {
    if (!this.set.has(value)) {
      fs.writeSync(this.file, value + '\n')
      this.set.add(value)
    }
  }

  has(value: string) {
    return this.set.has(value)
  }
}
