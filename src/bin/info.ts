import { ioArgsPlain } from '../cli_utils'
import { stream2lxmlRoot } from '../utils.node'
import { getStats } from '../nlp/utils'


ioArgsPlain(async (input, output) => {
  let info = getStats(await stream2lxmlRoot(input))

  output.write(`слів: ${info.wordCount}\n`)
  output.write(`слів не в словнику: ${info.dictUnknownCount} (${(info.dictUnknownCount / info.wordCount * 100).toFixed(2)}%)\n`)
  output.write(`словоформ не в словнику: ${info.dictUnknowns.length}\n`)
  output.write(`\n`)
  output.write(info.dictUnknowns.join('\n'))

  output.write('\n')
})
