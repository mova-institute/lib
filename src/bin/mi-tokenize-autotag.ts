import {createTaggerSync} from '../factories.node'
import {filename2jsdomRootSync} from '../utils.node'
import {tokenizeTeiDom, tagTokenizedDom} from '../nlp/utils'
let pd = require('pretty-data2').pd
let {writeFileSync} = require('fs');

let commander = require('commander');
let xmldom = require('xmldom');


	
commander
	.option('-i, --input <file>', 'Input')
	.option('-o, --output <file>', 'Output')
	.parse(process.argv);
	
if (!commander.input || !commander.output) {
	console.log(commander.help());
}

let tagger = createTaggerSync();

let tokenizedDom = tokenizeTeiDom(filename2jsdomRootSync(commander.input), tagger);
let taggedDom = tagTokenizedDom(tokenizedDom, tagger);
let stringi = new xmldom.XMLSerializer().serializeToString(tokenizedDom.ownerDocument);
writeFileSync(commander.output, pd.xml(stringi));
