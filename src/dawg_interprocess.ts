let spawn = require('child_process').spawn;

export class DawgInterprocess {
	private ipc = spawn('dawg-shell');
	
	constructor() {
		this.ipc.stdin.setEncoding('utf8');
	}

	keys(key: string): Promise<Array<string>> {
		return new Promise((resolve, reject) => {
			this.ipc.stdout.once('data', data => {
				if (data.indexOf('\n') === -1) {
					throw 'No newline in data';
				}
				resolve(JSON.parse(data));
			});
			
			this.ipc.stdin.write(key + '\n');
		})
	}
	
	close(): void {
		this.ipc.kill();
	}
}