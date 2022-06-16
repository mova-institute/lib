import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { mixml2tokenStream, tokenStream2cg } from '../utils'
import { mu } from '../../mu'

export function mixml2cg(root: AbstractElement) {
  let stream = mixml2tokenStream(root)
  let ret = ''
  mu(tokenStream2cg(stream)).forEach((x) => (ret += x))

  return ret
}
