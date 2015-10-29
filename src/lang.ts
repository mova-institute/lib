export let r = String.raw;

export function encodeUtf8(str: string) {
	let out = new Array<number>();
	let p = 0;
	for (let i = 0; i < str.length; ++i) {
		let c = str.charCodeAt(i);
		if (c < 128) {
			out[p++] = c;
		} else if (c < 2048) {
			out[p++] = (c >> 6) | 192;
			out[p++] = (c & 63) | 128;
		} else {
			out[p++] = (c >> 12) | 224;
			out[p++] = ((c >> 6) & 63) | 128;
			out[p++] = (c & 63) | 128;
		}
	}

	return out;
}