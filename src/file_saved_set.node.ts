import fs from 'fs'
import { sync as mkdirpSync } from 'mkdirp'
import { dirname } from 'path'

export interface Tostringable {
  toString(): string
}

export class FileSavedSet<T extends Tostringable> {
  private set = new Set<string>()
  private file: number

  constructor(filePath: string) {
    if (fs.existsSync(filePath)) {
      fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .forEach((x) => this.set.add(x))
      this.file = fs.openSync(filePath, 'a')
    } else {
      mkdirpSync(dirname(filePath))
      this.file = fs.openSync(filePath, 'w')
    }
  }

  add(value: T) {
    let str = value.toString()
    if (!this.set.has(str)) {
      fs.writeSync(this.file, `${value}\n`)
      this.set.add(str)
    }
  }

  has(value: T) {
    return this.set.has(value.toString())
  }
}
