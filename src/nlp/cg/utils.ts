import { AbstractElement } from 'xmlapi'
import { tei2tokenStream, tokenStream2cg } from '../utils'
import { mu } from '../../mu'



export function tei2cg(root: AbstractElement) {
  let stream = tei2tokenStream(root)
  let ret = ''
  mu(tokenStream2cg(stream)).forEach(x => ret += x)

  return ret
}
