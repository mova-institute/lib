import {Tagger} from './tagger'
import {createCompletionDawgSync} from './dawg/factories.node'

export function createTaggerSync(dawgFilename: string): Tagger {
	return new Tagger(createCompletionDawgSync(dawgFilename));
}