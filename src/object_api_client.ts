import request from 'request-promise-native'
import * as path from 'path'
import { Agent } from 'http'



export class ObjApiClient {
  agent = new Agent({ keepAlive: true })

  constructor(private socket: string) {
    this.socket = path.resolve(this.socket)
  }

  async call(method: string, params: Array<any>) {
    return request(`http://unix:${this.socket}:/call`, {
      agent: this.agent,
      json: true,
      method: 'post',
      body: {
        method,
        params,
      },
    })
  }
}
