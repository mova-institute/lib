import { Token } from './token'
import { SimpleGrouping } from '../grouping'



export function buildCoreferenceClusters(
  tokens: Array<Token>,
  idToToken?: Map<string, Token>,
) {
  idToToken = idToToken || new Map(tokens.map(x => [x.id, x] as [string, Token]))
  let clusterization = new SimpleGrouping<Token>()
  for (let token of tokens) {
    for (let { type, headId } of token.corefs) {
      if (type === 'equality') {
        clusterization.engroupAsDeafault(idToToken.get(token.id), idToToken.get(headId))
      }
    }
  }
  return clusterization
}
