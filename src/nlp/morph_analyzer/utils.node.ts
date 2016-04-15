import {CompiledDict} from './dict_utils';
import {writeFileSync, writeSync, closeSync, openSync, unlinkSync} from 'fs';
import {execSync} from 'child_process';
import {join} from 'path';


////////////////////////////////////////////////////////////////////////////////
export function writeCompiledDict(path: string, compiledDict: CompiledDict) {
  writeFileSync(path + '/tags.json', JSON.stringify(compiledDict.tags), 'utf8');
  writeFileSync(path + '/suffixes.json', JSON.stringify(compiledDict.suffixes), 'utf8');
  writeFileSync(path + '/words.dawg.json', JSON.stringify(compiledDict.words), 'utf8');

  /*let wordsStream = createWriteStream(path + '/words.dawg.lst', 'utf8');
  for (let bytes of compiledDict.words) {
    wordsStream.write(bytes.join(' ') + '\n');
  }
  compiledDict.words = null;*/

  let f = openSync(path + '/paradigms.bin', 'w');
  for (let paradigm of compiledDict.paradigms) {
    let buf = new Buffer(2);
    buf.writeUInt16LE(paradigm.length / 3, 0);
    writeSync(f, buf, 0, buf.length, null);
    writeSync(f, new Buffer(new Uint8Array(paradigm.buffer)), 0, paradigm.byteLength, null);
  }
  closeSync(f);

  execSync(join(__dirname, '../../dawg_creator.py ') + path);
  unlinkSync(path + '/words.dawg.json');
}
