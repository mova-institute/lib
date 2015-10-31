import {createTaggerSync} from '../factories.node'
import {filename2jsdomRootSync} from '../utils.node'
import {tokenizeTeiDom} from '../nlp'
import {writeFileSync} from 'fs'

let commander = require('commander');
let xmldom = require('xmldom');


	
commander
	.option('-i, --input <file>', 'Input')
	.option('-o, --output <file>', 'Output')
	.parse(process.argv);
	
if (!commander.input || !commander.output) {
	console.log(commander.help());
}

let tokenizedDom = tokenizeTeiDom(
	filename2jsdomRootSync(commander.input), createTaggerSync('../data/rysin-dict.dawg'))
let stringi = new xmldom.XMLSerializer().serializeToString(tokenizedDom.ownerDocument);
writeFileSync(commander.output, stringi);
