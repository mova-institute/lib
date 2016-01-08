import {createReadStream, createWriteStream, renameSync} from 'fs';
import {Readable} from 'stream';
import * as tmp from 'tmp';

let minimist = require('minimist');
tmp.setGracefulCleanup();


export function ioArgs(): [any, any, Object] {
  let args = minimist(process.argv.slice(2))._;
  if (args) {
    if (args.length === 1) {
      if (!process.stdin.isTTY) {
        return [process.stdin, createWriteStream(args[0]), args];
      }
      return [createReadStream(args[0], 'utf8'), process.stdout, args];
    }
    else if (args.length === 0) {
      return [process.stdin, process.stdout, args];
    }
    else if (args.length === 2) {
      return [createReadStream(args[0], 'utf8'), createWriteStream(args[1]), args];
    }
  }

  console.error(`arguments: <(std)input> <(std)output>`);
  process.exit();
}

export async function ioArgs2(fileArgs: Array<string>, f: (input, output) => Promise<void>) {

  if (fileArgs[1]) {
    var input: any = createReadStream(fileArgs[0], 'utf8');  // todo
    var tmpFile = tmp.fileSync();
    var output: any = createWriteStream(null, { fd: tmpFile.fd });
  }
  else if (fileArgs[0]) {
    if (process.stdin.isTTY) {
      input = createReadStream(fileArgs[0], 'utf8');
      output = process.stdout;
    }
    else {
      input = process.stdin;
      var tmpFile = tmp.fileSync();
      output = createWriteStream(null, { fd: tmpFile.fd });
    }
  }
  else {
    input = process.stdin;
    output = process.stdout;
  }
  try {
    f(input, output).then(() => {
      if (tmpFile) {
        console.log('writing file...');
        renameSync(tmpFile.name, fileArgs[1] || fileArgs[0]);
      }
    });
  }
  catch (e) {
    console.error(e.stack);
  }
}