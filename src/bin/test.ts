import 'regenerator/runtime';
import {get} from 'http';
import {createReadStream} from 'fs';
import {b64decodeFromArray} from '../codec';
import {Dawg, CompletionDawg, ObjectDawg} from '../dawg/dawg'
import {Tagger} from '../tagger'

let tagger = new Tagger();
console.log(tagger.knows('душою'));