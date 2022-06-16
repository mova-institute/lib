import { MorphInterp } from './morph_interp'
import { AbstractElement } from '../xml/xmlapi/abstract_element'
import { sortInterps } from './utils'
import { NS, traverseDepthGen2, tagStr2 } from '../xml/utils'



export function* polishXml2verticalStream(root: AbstractElement) {
  let iterator = traverseDepthGen2(root)
  let pointer = iterator.next()
  while (!pointer.done) {
    let { node, entering } = pointer.value
    if (node.isElement()) {
      let el = node.asElement()
      let name = el.name()
      // console.log(name)
      if (entering && name === 'tok') {
        let form = el.evaluateString('string(./orth/text())').trim()
        let lemma = el.evaluateString('string(.//base/text())').trim()
        let tag = el.evaluateString('string(.//ctag/text())').trim()
        // let form = el.firstElementChild().text()
        // console.log('form')
        // console.log(el.firstElementChild().lastElementChild().text())
        // let [lemma, tag] = el.firstElementChild()
        //   .lastElementChild()
        //   .elementChildren()
        //   .map(x => x.text())
        yield [form, lemma, tag].join('\t')
        pointer = iterator.next('skip')
        continue
      } else if (name === 'p' || name === 's') {
        yield tagStr2(name, !entering, el.attributesObj())
      }
    }
    pointer = iterator.next()
  }
}

export function oldZhyto2newerFormat(root: AbstractElement) {  // todo: rename xmlns
  let miwords = root.evaluateElements('//mi:w_', NS)
  for (let miw of miwords) {
    // rename attributes
    miw.renameAttributeIfExists('ana', 'disamb')
    miw.renameAttributeIfExists('word-id', 'n')



    // select unambig dict interps
    if (miw.elementChildren().count() === 1 && !miw.attribute('disamb')) {
      miw.setAttribute('disamb', 0)
    }

    for (let w of miw.elementChildren()) {
      let mte = w.attribute('ana')
      // console.log(`mte: ${mte}`)
      let vesum = MorphInterp.fromMte(mte, w.text()).toVesumStr()
      // console.log(`vesum: ${vesum}`)

      w.setAttribute('ana', vesum)
    }

    // miw.removeAttribute('n')  // temp
    // miw.removeAttribute('disamb')  // temp
  }

  sortInterps(root)

  return root

  // todo: sort attributes
}
