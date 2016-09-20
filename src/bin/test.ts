// import {INode, IElement, IDocument} from 'xmlapi'
// import {LibxmljsDocument, LibxmljsElement, LibxmlNode} from 'xmlapi-libxmljs'
// import {readFileSync} from 'fs'
// import {dirname} from 'path'
// import * as libxmljs from 'libxmljs'
// const libxmljs = require('libxmljs')
// import {traverseDepth} from '../xml/utils'
// import {PgClient} from '../postrges'
// import {parseXmlString} from 'libxmljs'
// import { ClientConfig } from 'pg'
// import {sleep} from '../lang'
import { toUdString } from '../nlp/ud'
import { MorphInterp } from '../nlp/morph_interp'

// export const config: ClientConfig = {
//   host: 'localhost',
//   port: 5433,
//   database: 'mi_dev',
//   user: 'annotator',
//   password: '@nn0t@t0zh3',
// }


main()



function main() {

  let arr = [
    'adj:n:v_naz:poss:&pron:refl',
    'adj:f:v_naz:uncontr:&adjp:perf:pasv',
    'adv:&pron:dem',
    'noun:anim:p:f:fname',
    'noun:anim:s:v_oru:&pron:pers:2',
    'part',
    'intj',
    'sym',
    'x',
    'adv:super',
    'conj:coord',
    'conj:subord',
  ]

  arr.forEach(x => console.log(`${x}\t${toUdString(MorphInterp.fromVesumStr(x))}`))
}
