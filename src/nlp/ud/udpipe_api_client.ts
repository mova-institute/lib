import { fetchJson } from '../../request_utils'
import { Agent } from 'http'



export class UdpipeApiClient {
  private agent = new Agent({
    keepAlive: true,
  })

  constructor(private endpoint: string) {
  }

  async parse(plaintext: string) {
    let res = await fetchJson(this.endpoint, {
      agent: this.agent,
      method: 'post',
      formData: {
        tokenizer: '',
        tagger: '',
        parser: '',
        data: plaintext,
      }
    })
    return res.result
  }
}
