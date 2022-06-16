import mkdirpLib from 'mkdirp'
import * as tmp from 'tmp'
import rimraf from 'rimraf'

import { promises as fsp, PathLike } from 'fs'
import * as pth from 'path'

export async function exists(path: PathLike) {
  try {
    await fsp.stat(path)
    return true
  } catch {
    return false
  }
}

export function mkdirp(path: string) {
  return new Promise((resolve, reject) =>
    mkdirpLib(path, (err, made) => (err ? reject(err) : resolve(made))),
  )
}

export function writeJson(path: PathLike, obj, indent = 0) {
  return fsp.writeFile(path, JSON.stringify(obj, undefined, indent))
}

export function mktempdir(options: tmp.Options = {}) {
  return new Promise<string>((resolve, reject) => {
    tmp.dir(options, (err, path, cleanupCallback) =>
      err ? reject(err) : resolve(path),
    )
  })
}

export async function mktempdirp(options: tmp.Options = {}) {
  if (options.dir) {
    await mkdirp(options.dir)
  }
  return mktempdir(options)
}

export function rmrf(path: string) {
  return new Promise<void>((resolve, reject) => {
    rimraf(path, (e) => (e ? reject(e) : resolve()))
  })
}

export async function renamep(oldPath: string, newPath: string) {
  await mkdirp(pth.dirname(newPath))
  return fsp.rename(oldPath, newPath)
}
