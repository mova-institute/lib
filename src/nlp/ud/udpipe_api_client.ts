import { reqJson } from '../../request'

export class UdpipeApiClient {
  constructor(private endpoint?: string, private model?) {}

  setEndpoint(value: string) {
    this.endpoint = value
    return this
  }

  setModel(value: string) {
    this.model = value
    return this
  }

  tokenizeParagraphs(paragraphs: Array<string>) {
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

  tokTagParseHorizontal(plaintext: string) {
    return this.requestConllu({
      tokenizer: 'presegmented',
      tagger: '',
      parser: '',
      input: 'horizontal',
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

  tagConnlu(conllu: string) {
    return this.requestConllu({
      tagger: '',
      data: conllu,
    })
  }

  tagParseConnluLines(lines: Array<string>) {
    return this.tagParseConnlu(lines.join('\n') + '\n')
  }

  private async requestConllu(formData: any) {
    if (this.model) {
      formData.model = this.model
    }

    let res = await reqJson(this.endpoint, {
      method: 'post',
      formData,
    })
    res = res.result.replace(/\t\t\t/g, '\t_\t_\t') // hack for literal underscore
    return res as string
  }
}
