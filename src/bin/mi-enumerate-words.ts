import {W_} from '../nlp/common_elements'
import {filename2jsdomRootSync, jsdom2fileSync} from '../utils.node'
import {traverseDepthEl, nameNsEl} from '../xml/utils'

let xmldom = require('xmldom');
let argv = require('minimist')(process.argv.slice(2));


let doc = filename2jsdomRootSync(argv._[0]);
let idGen = 0;
traverseDepthEl(doc, (el: HTMLElement) => {
	if (el.localName === 'mi:w_') { // todo, fuckyou, jsdom!
		el.setAttribute('word-id', (idGen++).toString());
	}
});

jsdom2fileSync(doc, argv._[0]);