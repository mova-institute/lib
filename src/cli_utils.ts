import {createReadStream, createWriteStream} from 'fs'
let minimist = require('minimist');


export function ioArgs(): [any, any] {
	let argv = minimist(process.argv.slice(2))._;

	if (argv.length === 1) {
		if (!process.stdin.isTTY) {
			return [process.stdin, createWriteStream(argv[0])];
		}
		return [createReadStream(argv[0], 'utf8'), process.stdout];
	}
	else if (argv.length === 0 && !process.stdin.isTTY) {
		return [process.stdin, process.stdout];
	}
	else if (argv.length === 2) {
		return [createReadStream(argv[0], 'utf8'), createWriteStream(argv[1])];
	}

	console.error(`arguments: <(std)input> <(std)output>`);
	process.exit();
}