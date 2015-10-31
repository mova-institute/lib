import {Tagger} from './tagger'
import {createCompletionDawgSync} from './dawg/factories.node'
import {dirname} from 'path'

export function createTaggerSync(dawgFilename: string = '/Users/msklvsk/Developer/movainstitute/mi-lib/data/rysin-dict.dawg'): Tagger {
	return new Tagger(createCompletionDawgSync(dawgFilename));
}