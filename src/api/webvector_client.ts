import { Socket } from 'net'



const serverGreetingLength = 'word2vec model server'.length

export class WebvectorClient {
  constructor(
    private port: number,
    private host: string,
  ) {
  }

  queryString(obj) {
    let res = ''
    return new Promise<string>((resolve, reject) => {
      let socket = new Socket()
        .on('close', hadError => {
          if (hadError) {
            console.error('reject')
            reject()
          } else {
            // console.error(res)
            resolve(res.substr(serverGreetingLength))
          }
        })
        .on('data', data => res += data)
      socket.connect(this.port, this.host, () => {
        // console.error(`now sending ${JSON.stringify(obj)}`)
        socket.write(JSON.stringify(obj))
      })
    })
  }

  async queryObj(obj) {
    return JSON.parse(await this.queryString(obj))
  }
}
