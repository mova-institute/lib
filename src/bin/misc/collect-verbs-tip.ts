import * as fs from 'fs';
import * as request from 'request';

const args = require('minimist')(process.argv.slice(2));


const URI = 'http://dict-api.tip.net.pl:8888/?type=json&key=177a37ebd4d2f45ecd3e2a6e7de33a87&call=translate&lang_in=pl&lang_out=ua&data=';




let verbs = fs
  .readFileSync(args.file, 'utf8')
  .trim()
  .split('\n')
  .filter(x => !x.startsWith('%'))
  .map(x => x.trim().split(/[:\s]/, 1)[0]);
verbs = [...new Set(verbs)];

let index = args.start || 0;
let numConcReq = args.conc || 1;
let numPending = numConcReq;
let ret = {};

Array(numConcReq).fill(0).forEach(worker);


////////////////////////////////////////////////////////////////////////////////
async function worker() {
  try {
    if (index < verbs.length) {
      let verb = verbs[index++];
      let res = await translate(verb);
      ret[verb] = [];
      worker();
    }
    else {
      --numPending;
      if (!numPending) {
        save();
        console.log('success');
      }
    }
  }
  catch (e) {
    save();
  }
}

////////////////////////////////////////////////////////////////////////////////
function save() {
  let name = `from-${args.start || 0}-to-${Object.keys(ret).length}.json`;
  fs.writeFileSync(name, JSON.stringify(ret), 'utf8');
}

////////////////////////////////////////////////////////////////////////////////
function translate(word: string) {
  return new Promise((resolve, reject) => {
    request({
      uri: URI + encodeURIComponent(word),
      json: true
    }, (error, response, body) => {
      if (error) {
        console.error(error)
        reject(error);
      }
      else {
        resolve(body);
      }
    });
  });
}