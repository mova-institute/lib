import { reqJson } from '../../request_utils'

import { Agent } from 'http'



export class UdpipeApiClient {
  private agent = new Agent({
    keepAlive: true,
  })

  constructor(private endpoint: string) {
  }

  tokenizeParagraphs(paragraphs: string[]) {
    return this.requestConllu({
      tokenizer: '',
      data: paragraphs.join('\n\n') + '\n',
    })
  }

  tokTagPlaintext(plaintext: string) {
    return this.requestConllu({
      tokenizer: '',
      tagger: '',
      data: plaintext,
    })
  }

  tokTagParsePlaintext(plaintext: string) {
    return this.requestConllu({
      tokenizer: '',
      tagger: '',
      parser: '',
      data: plaintext,
    })
  }

  tagParseConnlu(conllu: string) {
    return this.requestConllu({
      tagger: '',
      parser: '',
      data: conllu,
    })
  }

  tagParseConnluLines(lines: string[]) {
    return this.tagParseConnlu(lines.join('\n') + '\n')
  }

  private async requestConllu(formData: any) {
    let res = await reqJson(this.endpoint, {
      agent: this.agent,
      method: 'post',
      formData,
    })
    res = res.result.replace(/\t\t\t/g, '\t_\t_\t')  // hack for literal underscore
    return res as string
  }
}
