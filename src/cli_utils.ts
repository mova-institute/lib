import {createReadStream, createWriteStream} from 'fs'
let minimist = require('minimist');


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