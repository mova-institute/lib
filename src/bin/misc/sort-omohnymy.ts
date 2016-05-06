import {filename2lxmlRootSync} from '../../utils.node';
import {NS} from '../../xml/utils';
import {LibxmlElement} from '../../xml/api/libxmljs_implementation';

const args = require('minimist')(process.argv.slice(2));

let doc = filename2lxmlRootSync(args._[0]);


let words: Array<LibxmlElement> = doc.xpath('//mi:w_', NS);

for (let word of words) {
  let interps = word.xpath('./tei:w', NS).sort((a, b) =>
    a.getAttribute('ana').localeCompare(b.getAttribute('ana')));
  for (let w of interps) {
    word.appendChild(w);
  }
}

process.stdout.write(doc.document.serialize(), 'utf-8');
