import {filename2lxmlRootSync} from '../../utils.node';
import {parseXmlString, Element} from 'libxmljs';
import * as fs from 'fs';
import {NS} from '../../xml/utils';

let args = require('minimist')(process.argv.slice(2));

let doc = parseXmlString(fs.readFileSync(args._[0], 'utf8'));


let words: Array<Element> = doc.find('//mi:w_', NS);

for (let w_ of words) {
  let interps = w_.find('./tei:w', NS).sort((a, b) =>
    a.attr('ana').value().localeCompare(b.attr('ana').value()));
  for (let w of interps) {
    w_.addChild(w);
  }
}

process.stdout.write(doc.toString(), 'utf-8');