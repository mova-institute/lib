import { filename2lxmlRootSync } from '../../utils.node';
import { NS } from '../../xml/utils';
import { LibxmljsElement } from 'xmlapi-libxmljs';

const args = require('minimist')(process.argv.slice(2));

let doc = filename2lxmlRootSync(args._[0]);


let words = doc.evaluateElements('//mi:w_', NS);

for (let word of words) {
  let interps = [...word.evaluateElements('./tei:w', NS)].sort((a, b) =>
    a.attribute('ana').localeCompare(b.attribute('ana')));
  for (let w of interps) {
    word.appendChild(w);
  }
}

process.stdout.write(doc.document().serialize(), 'utf-8');
