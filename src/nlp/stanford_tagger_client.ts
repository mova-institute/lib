import { connect } from 'net'
import { matchAll } from '../string_utils'

export class StanfordTaggerClient {
  constructor(private port: number, private host = 'localhost') {

  }

  tag(chunk: string) {
    return new Promise<string[][]>((resolve, reject) => {
      let res: string | undefined
      let client = connect({
        port: this.port,
        host: this.host,
      }, () => {
        client.write(`${chunk}\r\n`)
      })
      client.on('data', data => {
        res += data.toString()
      }).on('end', () => {
        let ret = matchAll(res, /pos="([^"]+)" lemma="([^"]+)">([^<]+)<\/word>/g)
          .map(x => [x[3], x[2], x[1]])
        resolve(ret)
      })
    })
  }
}
