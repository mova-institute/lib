let {createReadStream, createWriteStream, readFileSync, readSync} = require('fs');


let argv = require('minimist')(process.argv.slice(2));
let jsdom = require('jsdom').jsdom;


export function filename2jsdomRootSync(filename: string) {
	var xmlstr = readFileSync(filename, 'utf-8');
	let doc = jsdom(xmlstr, {
		parsingMode: 'xml'
	});
	
	return doc.documentElement;
}

/*export function ioArgs(): [any, any] {
	if (argv._.length === 1) {
		if (!process.stdin.isTTY) {
			return [process.stdin, createWriteStream(argv._[0])];
		}
		if (!process.stdout.isTTY) {
			return [createReadStream(argv._[0]), process.stdout];
		}
	}
	else if (argv._.length === 0 && !process.stdin.isTTY && !process.stdout.isTTY) {
		return [process.stdin, process.stdout];
	}
	else if (argv._.length === 2) {
		return [createReadStream(argv._[0]), createWriteStream(argv._[0])];
	}
	
	console.error(`arguments: <(std)input> <(std)output>`);
	process.exit();
}*/

export function readNBytesSync(n: number, fd: number) {
	let buf = new Buffer(n);
	readSync(fd, buf, 0, n, null);
	
	return buf;
}