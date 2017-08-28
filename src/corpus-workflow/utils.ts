import * as glob from 'glob'
import { parseXmlFileSync } from '../xml/utils.node'



export interface SplitRotateTrainingSetsParams {
  inputXmlGlob: string
}

////////////////////////////////////////////////////////////////////////////////
export function splitRotateTrainingSets(params: SplitRotateTrainingSetsParams) {
  let xmlPaths = glob.sync(params.inputXmlGlob)
  for (let xmlPath of xmlPaths) {
    let doc = parseXmlFileSync(xmlPath)
  }
}
