import { createWriteStream, writeFileSync } from 'fs'
import { join, relative, dirname } from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import { sync as globSync } from 'glob'



export class FolderSavedMap {
  private keySet = new Set<string>()

  constructor(private directoryPath: string, glob = '**') {
    mkdirpSync(directoryPath)
    globSync(`${directoryPath}/${glob}`)
      .map(x => relative(directoryPath, x))
      .forEach(x => this.keySet.add(x))
  }

  set(key: string, value: string) {
    if (!this.keySet.has(key)) {
      let path = join(this.directoryPath, key)
      mkdirpSync(dirname(path))
      createWriteStream(path).end(value)
      this.keySet.add(key)
    }
  }

  has(key: string) {
    return this.keySet.has(key)
  }
}
