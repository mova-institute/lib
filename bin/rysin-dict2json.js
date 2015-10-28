#!/usr/bin/env node --harmony
'use strict';

require("regenerator/runtime.js");
let fs = require('fs');
let readline = require('readline');
let nlp = require('../lib/nlp.node');
let commander = require('commander')
	
	
	
commander.option('-i, --input [value]', 'Input')
	.option('-o, --output [value]', 'Output')
	.parse(process.argv);

if (!commander.input || !commander.output) {
	console.log(commander.help());
}

let input = fs.createReadStream(commander.input);

nlp.rysinDict2Json(readline.createInterface({input, output:undefined})).then(json => {
	fs.writeFileSync(commander.output, JSON.stringify(json), 'utf8');
});