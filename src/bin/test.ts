import {createTaggerSync} from '../factories.node'


let tagger = createTaggerSync();

console.log(tagger.tag('життя'));