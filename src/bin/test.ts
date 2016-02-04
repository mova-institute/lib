import {INode, IElement, IDocument} from '../xml/api/interfaces'
import {LibxmlDocument, LibxmlElement, LibxmlNode} from '../xml/api/libxmljs_adapters'
import {readFileSync} from 'fs'
import {dirname} from 'path'
import * as libxmljs from 'libxmljs'
import {traverseDepth} from '../xml/utils'
import * as pgUtils from '../postrges';
import {ClientConfig} from 'pg';
import {sleep} from '../lang';



export const config: ClientConfig = {
  host: 'mova.institute',
  database: 'movainstitute',
  user: 'movainstitute',
  password: 'movainstituteP@ss'
};

/*(async () => {
  try {
    await pgUtils.transaction(config, async (client) => {
      let sum = await pgUtils.query1Client(client, "SELECT sum(value) FROM test");
      console.log('sum', sum);
      console.log('sleeping');
      await sleep(5000);
      console.log('woke');
      await pgUtils.query(client, "INSERT INTO test(value) VALUES($1)", [sum]);
    });
    process.exit(0);
  }
  catch (e) {
    console.error('catched in main');
    console.error(e);
  }
})();*/