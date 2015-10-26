#!/usr/bin/env node --harmony
'use strict';

let fs = require('fs');
let readline = require('readline');
let nlp = require('../lib/nlp_utils');
let commander = require('commander')
	
	
	
commander.option('-i, --input [value]', 'Input')
	.option('-o, --output [value]', 'Output')
	.parse(process.argv);

if (!commander.input || !commander.output) {
	console.log(commander.help());
}

let input = fs.createReadStream(commander.input);
let output = fs.createWriteStream(commander.output);

nlp.rysinDict2Json(input, output);