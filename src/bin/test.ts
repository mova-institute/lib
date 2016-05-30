// import {INode, IElement, IDocument} from 'unixml';
// import {LibxmlDocument, LibxmlElement, LibxmlNode} from 'unixml-libxmljs';
// import {readFileSync} from 'fs'
// import {dirname} from 'path'
// import * as libxmljs from 'libxmljs'
const libxmljs = require('libxmljs');
// import {traverseDepth} from '../xml/utils'
// import {PgClient} from '../postrges';
// import {parseXmlString} from 'libxmljs';
import { ClientConfig } from 'pg';
// import {sleep} from '../lang';

export const config: ClientConfig = {
  host: 'localhost',
  port: 5433,
  database: 'mi_dev',
  user: 'annotator',
  password: '@nn0t@t0zh3',
};


main();



async function main() {
  let root = libxmljs.parseXmlString('<x> a>b </x>');
  console.log(root.toString());

  // try {
  //   PgClient.transaction(config, async (client) => {
  //     client.call('popo');
  //     let res = await client.call('get_task', 24, 847);
  //     console.log('call done', res.docName);
  //   });

  //   console.log('done');
  // }
  // catch (e) {
  //   console.error('catched in main');
  //   console.error(e);
  // }
  // let doc = new LibxmlDocument(libxmljs.parseXml('<root></root>'));
  // let smo =
  // doc.documentElement.appendChild(doc.createElement('shmo'));
  // console.log(doc.serialize());

}
