import { UdpipeApiClient } from './ud/udpipe_api_client'

import * as request from 'request-promise-native'

import { Agent } from 'http'
import { mu, Mu } from '../mu'


////////////////////////////////////////////////////////////////////////////////
export class ApiClient {
  private udpipeClient: UdpipeApiClient

  constructor(
    private udpipeEndpoint: string,
    private udpipeModel: string,
    // private tdozatEndpoint: string,
    private agent = new Agent({
      keepAlive: true,
    }),
  ) {
    this.udpipeClient = new UdpipeApiClient(udpipeEndpoint, udpipeModel)
  }

  // (looses comments)
  async tagParseConnluLines(lines: Array<string>) {
    // temp while tdozat is not ready
    let res = await this.udpipeClient.tagParseConnluLines(lines)
    return mu(res.split('\n'))
      .filter(x => /^\d/.test(x))
      .map(x => x.split('\t'))

    // let tokened = lines.join('\n') + '\n'
    // let tagged = await this.udpipeClient.tagConnlu(tokened)
    // let parsed = await request.post(this.tdozatEndpoint, {
    //   body: tagged,
    //   encoding: null,
    // })
    // return mergeConlluCols(tagged, parsed, [6, 7])
  }
}


function mergeConlluCols(dest: string, source: string, cols: Array<number>) {
  let ret = new Array<Array<string>>()

  let destLines = dest.split('\n').filter(isConlluTokenLine)
  let sourceLines = mu(dest.split('\n')).filter(isConlluTokenLine)

  for (let [n, destLine] of destLines.entries()) {
    let destCells = destLine.split('\t')
    let sourceCells = sourceLines.first().split('\t')
    for (let i of cols) {
      destCells[i] = sourceCells[i]
    }
    ret.push(destCells)
  }

  return ret
}

function isConlluTokenLine(line: string) {
  return /^\d/.test(line)
}
