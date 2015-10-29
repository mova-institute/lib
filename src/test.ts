import 'regenerator/runtime';
import {get} from 'http';
import {createReadStream} from 'fs';

import {Dawg, CompletionDawg} from './dawg/dawg'

let dawg0 = new Dawg();
let dawg1 = new CompletionDawg();


// dawg.read(createReadStream('../data/dawg.dic')).then(() => {
// 	console.log(dawg.has('∆те'));
// });