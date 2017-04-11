import { createMorphAnalyzerSync } from '../morph_analyzer/factories.node'
import { toUd, udFeatures2conlluString } from './tagset'


////////////////////////////////////////////////////////////////////////////////
export function buildNumeralMap() {
  let analyzer = createMorphAnalyzerSync()
  let map = analyzer.getNumeralMap()
  let lines = map.map(({ digit, form, lemma, interp }) => {
    let { pos, features } = toUd(interp)
    let featuresStr = udFeatures2conlluString(features)
    let ret = `{ L'${digit}', L"${form}", L"${lemma}", "~${pos}~~${featuresStr}" },`
    return ret
  })
  process.stdout.write(lines.join('\n') + '\n')
}
