export class Guide {
	private rootIndex = 0;
	
	constructor(private units: Uint8Array) {}
	
	child(index: number) {
		return this.units[index * 2];
	}
	
	sibling(index: number) {
		return this.units[index * 2 + 1];
	}
}