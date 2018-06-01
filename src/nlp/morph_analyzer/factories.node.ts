import { createDictionarySync } from '../dictionary/factories.node'
import { MorphAnalyzer } from './morph_analyzer'
import { getLibRootRelative } from '../../lib_path.node'



////////////////////////////////////////////////////////////////////////////////
export function createMorphAnalyzerSync(dictFolder = getLibRootRelative('../data/dict/vesum')) {  // todo: kill
  let dictionary = createDictionarySync()
  let ret = new MorphAnalyzer(dictionary)

  return ret
}
