////////////////////////////////////////////////////////////////////////////////
export function buffer2arrayBuffer(val: Buffer) {	// todo: copy 64?
	let toret = new ArrayBuffer(val.length);
	let view = new Uint8Array(toret);
	for (let i = 0; i < val.length; ++i) {
		view[i] = val[i];
	}
	
	return toret;
}

////////////////////////////////////////////////////////////////////////////////
export function buffer2typedArray(buffer: Buffer, ArrayType) {
	return new ArrayType(buffer2arrayBuffer(buffer));
}