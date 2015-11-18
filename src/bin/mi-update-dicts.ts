import {tryStatSync} from '../utils.node'
import {get} from 'https'
import {createWriteStream} from 'fs'
import {join} from 'path'
import {parse} from 'url'


let reqOptions = <any>parse('https://mova:real-corpus-in-2016!@experimental.mova.institute/files/sheva-dict.dawg');

let dictPath = join(__dirname, '..', '..', 'data', 'sheva-dict.dawg');
let stats = tryStatSync(dictPath);
if (stats) {
	reqOptions.headers = { 'If-Modified-Since': stats.mtime.toUTCString() };
}

get(reqOptions, res => {
	if (res.statusCode === 200) {
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