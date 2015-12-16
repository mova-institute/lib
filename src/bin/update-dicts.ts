import {tryStatSync} from '../utils.node'
import {get} from 'https'
import {createWriteStream} from 'fs'
import {join} from 'path'
import {parse} from 'url'

let mkdirpSync = require('mkdirp').sync;
let argv = require('minimist')(process.argv.slice(2));


let urlBase = 'https://mova:real-corpus-in-2016!@experimental.mova.institute/files/';
let fileNames = ['sheva.dawg', 'rysin-mte.dawg'];

let dataDir = join(__dirname, '..', '..', 'data');

for (let dictName of fileNames) {
	let reqOptions = <any>parse(urlBase + dictName);

	let dictPath = join(dataDir, dictName);

	if (!argv.force) {
		let stats = tryStatSync(dictPath);
		if (stats) {
			reqOptions.headers = { 'If-Modified-Since': stats.mtime.toUTCString() };
		}
	}

	get(reqOptions, res => {
		if (res.statusCode === 200) {
			mkdirpSync(dataDir);
			res.pipe(createWriteStream(dictPath));
			console.log('Завантажую словники…');
		}
		else if (res.statusCode === 304) {
			console.log('Немає оновлень словників.');
		}
		else {
			console.error('Unexpected HTTP response code: ', res.statusCode);
		}
	});
}