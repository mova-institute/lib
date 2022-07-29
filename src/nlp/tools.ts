import { glob } from 'glob'
import path from 'node:path'
import { mu } from '../mu'
import { trimExtension } from '../string'
import { parseXmlFileSync } from '../xml/utils.node'
import { mixml2tokenStream, tokenStream2plaintextString } from './utils'
import { writeFileSyncMkdirp } from '../utils.node'

export function mixmlsToPlaintext(xmlsGlob: string, outDir: string) {
  let xmls = glob.sync(xmlsGlob)
  for (let filename of xmls) {
    let basename = trimExtension(path.basename(filename))
    let xmlDoc = parseXmlFileSync(filename)
    let docs = xmlDoc.evaluateElements('//doc')
    for (let doc of docs) {
      let tokens = mu(mixml2tokenStream(doc)).toArray()
      let name = [tokens[0].getAttribute('id'), tokens[0].getAttribute('title')]
        .filter((x) => x)
        .join('_')
        .replaceAll('/', '_')
        .substring(0, 60)
      let plaintext = tokenStream2plaintextString(tokens).trim()
      let outFile = path.join(outDir, basename, `${name}.txt`)
      writeFileSyncMkdirp(outFile, plaintext)
    }
  }
}
