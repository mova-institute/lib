import { WebvectorClient } from './webvector-client'
import { sendError, sendBadRequest } from '../lib/express/utils'
import { writeJson, exists, rmrf, mktempdirp, renamep } from '../fs-utils.node'
import { hashObj } from '../crypto'
import { mu } from '../mu'

import { Request, Response } from 'express'

import { promises as fsp } from 'fs'
import * as pth from 'path'
import { isString } from 'util'



////////////////////////////////////////////////////////////////////////////////
export interface VectorConfig {
  host: string
  port: number
  projectorDir: string
  projectorTempDir: string
  projectorUrlBase: string
}

////////////////////////////////////////////////////////////////////////////////
export interface VectorHandlers {
  [key: string]: (
    req: Request,
    res: Response,
    client: WebvectorClient,
    config: VectorConfig,
  ) => void
}

const enum Operations {
  synonyms = 1,
  similarity,
  analogy,
  vector,
}

////////////////////////////////////////////////////////////////////////////////
export const vectorHandlers: VectorHandlers = {
  async analogy(req, res, client) {
    let { a, toB, likeC, model } = req.body
    if (!a || !toB || !likeC) {
      return sendBadRequest(res)
    }
    let query = {
      query: [[likeC, toB], a],
      operation: '3',
      model,
      pos: 'ALL'
    }
    try {
      res.json(await client.queryString(query))
    } catch {
      return sendError(res, 500)
    }
  },

  async synonyms(req, res, client, config) {
    let { word, model } = req.body
    if (!word) {
      return sendBadRequest(res)
    }
    word = word.toString().trim()
    if (!word) {
      return sendBadRequest(res)
    }
    let res1 = await client.queryObj({
      query: word,
      operation: Operations.synonyms.toString(),
      model,
      pos: 'ALL',
    })
    res.json(res1)
  },

  async projector(req, res, client, config) {
    let { words, model } = req.body
    if (!Array.isArray(words) || !isString(model) || !model) {
      return sendError(res, 400, 'Malformed request')
    }


    let wordsSet = new Set(words.sort())

    let hash = hashObj([...wordsSet])
    let destDir = `${config.projectorDir}/${model}/${hash}`
    let destUrlBase = `${config.projectorUrlBase}/${model}/${hash}`
    let configUrl = `${destUrlBase}/config.json`

    if (await exists(destDir)) {
      return res.json(configUrl)
    }

    let tempDir = await mktempdirp({
      dir: config.projectorTempDir,
      mode: 0o755,
    })

    let vectors = new Array<Array<number>>()

    for (let word of wordsSet) {
      let res1 = await client.queryObj({
        query: word,
        operation: Operations.vector.toString(),
        model,
      })
      if (Array.isArray(res1.vector)) {
        vectors.push(res1.vector)
      } else {
        wordsSet.delete(word)
      }
    }

    let metaTsv = mu(wordsSet).join('\n')
    await fsp.writeFile(pth.join(tempDir, 'meta.tsv'), metaTsv)
    let tensorsTsv = vectors.map(x => x.join('\t')).join('\n')
    await fsp.writeFile(pth.join(tempDir, 'tensors.tsv'), tensorsTsv)

    let projectorConfig = {
      embeddings: [
        {
          tensorName: 'вектор-представлення',
          tensorShape: [
            vectors[0].length,
            vectors.length,
          ],
          tensorPath: `${destUrlBase}/tensors.tsv`,
          metadataPath: `${destUrlBase}/meta.tsv`,
        }
      ]
    }
    await writeJson(pth.join(tempDir, 'config.json'), projectorConfig, 2)

    try {
      await renamep(tempDir, destDir)
    } catch (e) {
      // assume the race was lost
      await rmrf(tempDir)
    }

    res.json(configUrl)
  },
}
