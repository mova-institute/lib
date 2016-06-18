// import {INode, IElement, IDocument} from 'xmlapi';
// import {LibxmljsDocument, LibxmljsElement, LibxmlNode} from 'xmlapi-libxmljs';
// import {readFileSync} from 'fs'
// import {dirname} from 'path'
// import * as libxmljs from 'libxmljs'
const libxmljs = require('libxmljs');
// import {traverseDepth} from '../xml/utils'
// import {PgClient} from '../postrges';
// import {parseXmlString} from 'libxmljs';
import { ClientConfig } from 'pg';
// import {sleep} from '../lang';
import { expandDictCorpViz } from '../nlp/vesum_utils';

export const config: ClientConfig = {
  host: 'localhost',
  port: 5433,
  database: 'mi_dev',
  user: 'annotator',
  password: '@nn0t@t0zh3',
};


main();



async function main() {
  expandDictCorpViz(`
який adj:m:v_naz:&pron:int:rel:ind
  якого adj:m:v_rod:&pron:int:rel:ind
  якому adj:m:v_dav:&pron:int:rel:ind
  якого adj:m:v_zna:ranim:&pron:int:rel:ind
  який adj:m:v_zna:rinanim:&pron:int:rel:ind
  яким adj:m:v_oru:&pron:int:rel:ind
  якім adj:m:v_mis:&pron:int:rel:ind
  якому adj:m:v_mis:&pron:int:rel:ind
  яка adj:f:v_naz:&pron:int:rel:ind
  якая adj:f:v_naz:uncontr:&pron:int:rel:ind
  якої adj:f:v_rod:&pron:int:rel:ind
  якій adj:f:v_dav:&pron:int:rel:ind
  яку adj:f:v_zna:&pron:int:rel:ind
  якую adj:f:v_zna:uncontr:&pron:int:rel:ind
  якою adj:f:v_oru:&pron:int:rel:ind
  якій adj:f:v_mis:&pron:int:rel:ind
  яке adj:n:v_naz:&pron:int:rel:ind
  якеє adj:n:v_naz:uncontr:&pron:int:rel:ind
  якого adj:n:v_rod:&pron:int:rel:ind
  якому adj:n:v_dav:&pron:int:rel:ind
  яке adj:n:v_zna:&pron:int:rel:ind
  `.trim());

  // let root = libxmljs.parseXmlString('<x> a>b </x>');
  // console.log(root.toString());

  // // try {
  // //   PgClient.transaction(config, async (client) => {
  // //     client.call('popo');
  // //     let res = await client.call('get_task', 24, 847);
  // //     console.log('call done', res.docName);
  // //   });

  // //   console.log('done');
  // // }
  // // catch (e) {
  // //   console.error('catched in main');
  // //   console.error(e);
  // // }
  // // let doc = new LibxmljsDocument(libxmljs.parseXml('<root></root>'));
  // // let smo =
  // // doc.documentElement.appendChild(doc.createElement('shmo'));
  // // console.log(doc.serialize());

}
