import { reqJson } from '../../request_utils'
import * as request from 'request-promise-native'

import { Agent } from 'http'



export class UdpipeApiClient {
  private agent = new Agent({
    keepAlive: true,
  })

  constructor(private endpoint: string) {
  }

  async tokenizeParagraphs(paragraphs: string[]) {
    let res = await reqJson(this.endpoint, {
      agent: this.agent,
      method: 'post',
      formData: {
        tokenizer: '',
        data: paragraphs.join('\n\n') + '\n',
      }
    })

    return res.result as string
  }

  async tokTagPlaintext(plaintext: string) {
    let res = await reqJson(this.endpoint, {
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
    let res = await reqJson(this.endpoint, {
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
      let res = await reqJson(this.endpoint, {
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
  tagParseConnluLines(lines: string[]) {
    return this.tagParseConnlu(lines.join('\n') + '\n')
  }
}
