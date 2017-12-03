import { fetchJson } from '../../request_utils'
import { Agent } from 'http'



export class UdpipeApiClient {
  private agent = new Agent({
    keepAlive: true,
  })

  constructor(private endpoint: string) {
  }

  async tokenize(plaintext: string) {
    let res = await fetchJson(this.endpoint, {
      agent: this.agent,
      method: 'post',
      formData: {
        tokenizer: '',
        data: plaintext,
      }
    })
    return res.result as string
  }

  async tokTagPlaintext(plaintext: string) {
    let res = await fetchJson(this.endpoint, {
      agent: this.agent,
      method: 'post',
      formData: {
        tokenizer: '',
        tagger: '',
        data: plaintext,
      }
    })
    return res.result as string
  }

  async tokTagParsePlaintext(plaintext: string) {
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
    return res.result as string
  }

  async tagParseConnlu(conllu: string) {
    try {
      let res = await fetchJson(this.endpoint, {
        agent: this.agent,
        method: 'post',
        formData: {
          tagger: '',
          parser: '',
          data: conllu,
        }
      })
      return res.result as string
    } catch (e) {
      // console.error()
      throw e
    }
  }
}
