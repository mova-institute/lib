import {ManateeFormatter} from '../nlp/manatee_formatter';
import {SaxEventObjectifier} from '../xml/sax_event_objectifier';
import {SentenceStartInjector} from '../nlp/sentence_start_injector';
import {GlueInjector} from '../nlp/glue_injector';

const {createReadStream, createWriteStream} = require('fs');
const {basename} = require('path');
const globSync = require('glob').sync;

const argv = require('minimist')(process.argv.slice(2));

if (argv._.length < 2) {
  console.error(`Usage: ${basename(process.argv[1]) } <input file> [others...] <out file>`);
  process.exit(1);
}


(async() => {
  let output = createWriteStream(argv._[argv._.length - 1]);
  for (let glob of argv._.slice(0, -1)) {
    for (let filename of globSync(glob)) {
      createReadStream(filename, {encoding: 'utf8'})
        .pipe(new SaxEventObjectifier())
        .pipe(new GlueInjector())
        .pipe(new SentenceStartInjector())
        .pipe(new ManateeFormatter())
        //.pipe(new SaxEventSerializer())
        //.pipe(process.stdout);
        .pipe(output);
    }
  }
})();
