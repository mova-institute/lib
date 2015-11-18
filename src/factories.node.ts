import {Tagger} from './tagger'
import {createCompletionDawgSync} from './dawg/factories.node'
let {normalize, dirname} = require('path');

const ROOT = normalize(dirname(__filename) + '/..');

export function createTaggerSync(dawgFilename: string = ROOT + '/data/sheva-dict.dawg'): Tagger {
	return new Tagger(createCompletionDawgSync(dawgFilename));
}