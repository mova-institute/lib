import {Tagger} from './tagger'
import {createCompletionDawgSync} from './dawg/factories.node'
import {dirname, normalize} from 'path'

const ROOT = normalize(dirname(__filename) + '/..');

export function createTaggerSync(dawgFilename: string = ROOT + '/data/rysin-dict.dawg'): Tagger {
	return new Tagger(createCompletionDawgSync(dawgFilename));
}