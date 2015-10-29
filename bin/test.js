#!/usr/bin/env node --es_staging
'use strict';
require("regenerator/runtime.js");

let fs = require('fs');
let nlp = require('../lib/nlp.node');
let commander = require('commander');
//let dawg = require('../lib/dawg_interprocess');

let xmldom = require('xmldom');
let jsdom = require('jsdom').jsdom;

let jsonstream = require('JSONStream');
var libxmljs = require("libxmljs");


// fs.createReadStream('../data/rysin-dict.json').pipe(jsonstream.parse()).on('data', d => {
// 	console.log(d[2]['що']);	
// })
// let strr = fs.readFileSync('../data/rysin-dict.json', 'utf8');
// let res = JSON.parse(strr)[2]['що'];
// console.log(res);

// commander.option('-i, --input [value]', 'Input')
// 	.parse(process.argv);

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

// nlp.waheverasy(commander.input).then(val =>{
// 	console.log(val);
// });

var xmlstr = fs.readFileSync('../data/kavkaz.xml', 'utf-8');

//let doc = new xmldom.DOMParser().parseFromString(xmlstr, 'application/xml');
//console.log(doc.documentElement.firstChild);

// let doc1 = libxmljs.parseXml(xmlstr);
// console.log(doc1.child(0));

let doc = jsdom(xmlstr, {
	parsingMode: 'xml'
});
// let $ = require('../lib/jquery')({
// 	document: doc
// });
let start = new Date().getTime();
nlp.tokenizeTeiXmlUk(doc.documentElement);
let stringi = new xmldom.XMLSerializer().serializeToString(doc);
fs.writeFileSync('../data/kavaz-tokenized.xml', stringi);
console.log('time: ', (new Date().getTime() - start) / 1000);