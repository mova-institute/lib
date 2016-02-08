export class Guide {
	private _rootIndex = 0;
	
	constructor(private _units: Uint8Array) {}
	
	child(index: number) {
		return this._units[index * 2];
	}
	
	sibling(index: number) {
		return this._units[index * 2 + 1];
	}
}