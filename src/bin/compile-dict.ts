// todo: everything
import {readFileSync, writeFileSync} from 'fs';
import {collectForof} from '../lang';
import {lexemes, compileDict, CompiledDict} from '../nlp/morph_analyzer/dict_utils';
import {writeCompiledDict} from '../nlp/morph_analyzer/utils.node';

import {createMorphAnalyserSync} from '../nlp/morph_analyzer/factories.node';

let lines = readFileSync('/Users/msklvsk/Developer/mova-institute/mi-lib/data/rysin-mte.txt', 'utf8').split('\n');
let lexemes_ = collectForof(lexemes(lines));
let compiledDict = compileDict(<[string, string][][]>lexemes_);

writeCompiledDict('/Users/msklvsk/Developer/mova-institute/mi-lib/data/dict/rysin-mte', compiledDict);

console.log('done');
