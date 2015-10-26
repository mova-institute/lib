#!/usr/bin/env node --es_staging
'use strict';

let fs = require('fs');
let nlp = require('../lib/nlp_utils');
let commander = require('commander');
let dawg = require('../lib/dawg_interprocess');
require("regenerator/runtime.js");
	
	
	
commander.option('-i, --input [value]', 'Input')
	.parse(process.argv);

//console.log(`Opening ${commander.input}`);

// let input = fs.createReadStream(commander.input);
// let dict = new dic.Dictionary();
// dict.read(input).then(() => {
// 	console.log(dict);
// });

// let d = new dawg.DawgInterprocess();
// d.keys('життяj').then(tags => {
// 	console.log(tags);
// 	d.close();
// });

nlp.waheverasy(commander.input).then(val =>{
	console.log(val);
});