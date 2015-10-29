import 'regenerator/runtime';
import {get} from 'http';


function sia() {
	return 'ti hui :)';
}

async function asia0() {
	return new Promise(resolve => {
		get({
			hostname: 'plazerazzi.org',
			path: '/',
			agent: false
		}, res => {
			resolve(res.headers);
		});
	})
}

async function asia1() {
	return await sia();
}


asia1().then((res) => {
	console.log(res);
})



// let fs = require('fs');
// let nlp = require('../../lib/nlp_utils');
// require('regenerator/runtime.js');
	
	
// nlp.waheverasy('вона дурна-придурна').then(val =>{
// 	console.log(val);
// });