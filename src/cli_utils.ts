import {createReadStream, createWriteStream, renameSync} from 'fs';
import * as tmp from 'tmp';

const minimist = require('minimist');
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

////////////////////////////////////////////////////////////////////////////////
export function ioArgs3(filename1: string, filename2: string): [any, any] {
  if (!process.stdin.isTTY && filename1) {
    return [process.stdin, createWriteStream(filename2)];
  }
  if (process.stdin.isTTY && filename1 && !filename2) {
    return [createReadStream(filename1, 'utf8'), process.stdout];
  }
  if (!process.stdin.isTTY && !filename1 && !filename2) {
    return [process.stdin, process.stdout];
  }
  if (filename1 && filename2) {
    return [createReadStream(filename1, 'utf8'), createWriteStream(filename2)];
  }

  throw new Error('No input argument');
}

////////////////////////////////////////////////////////////////////////////////
// todo: input, output types
export async function ioArgs4(filename1: string, filename2: string, f: (input, output) => Promise<void>) {
  let input;
  let output;
  let tmpFile;

  if (filename2) {
    input = createReadStream(filename1, 'utf8');  // todo
    tmpFile = tmp.fileSync();
    output = createWriteStream(null, { fd: tmpFile.fd });
  }
  else if (filename1) {
    if (process.stdin.isTTY) {
      input = createReadStream(filename1, 'utf8');
      output = process.stdout;
    }
    else {
      input = process.stdin;
      tmpFile = tmp.fileSync();
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
        renameSync(tmpFile.name, filename2 || filename1);
      }
    });
  }
  catch (e) {
    console.error(e.stack);
  }
}
