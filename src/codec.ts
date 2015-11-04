////////////////////////////////////////////////////////////////////////////////
export function encodeUtf8(str: string) {	// todo: more octets?
	let out = new Array<number>();
	let p = 0;
	for (let i = 0; i < str.length; ++i) {
		let c = str.charCodeAt(i);
		if (c < 128) {
			out[p++] = c;
		}
		else if (c < 2048) {
			out[p++] = (c >>> 6) | 192;
			out[p++] = (c & 63) | 128;
		}
		else {
			out[p++] = (c >>> 12) | 224;
			out[p++] = ((c >>> 6) & 63) | 128;
			out[p++] = (c & 63) | 128;
		}
	}

	return out;
}

////////////////////////////////////////////////////////////////////////////////
export function decodeUtf8(bytes: Array<number>) {
	
	let toret = '';
	for (let i = 0; i < bytes.length; ) {
		let c = bytes[i];

		if (c < 128) {
			toret += String.fromCharCode(c);
			++i;
		}
		else if ((c > 191) && (c < 224)) {
			let c2 = bytes[i +1];
			toret += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
			i += 2;
		}
		else {
			let c2 = bytes[i + 1];
			let c3 = bytes[i + 2];
			toret += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
			i += 3;
		}
	}

	return toret;
}


const PLUS = '+'.charCodeAt(0);
const SLASH = '/'.charCodeAt(0);
const NUMBER = '0'.charCodeAt(0);
const LOWER = 'a'.charCodeAt(0);
const UPPER = 'A'.charCodeAt(0);
const PLUS_URL_SAFE = '-'.charCodeAt(0);
const SLASH_URL_SAFE = '_'.charCodeAt(0);
const PADD = '='.charCodeAt(0);

function decode(code: number) {
	if (code === PLUS || code === PLUS_URL_SAFE) {
		return 62;	// '+'
	}
	if (code === SLASH || code === SLASH_URL_SAFE) {
		return 63;	 // '/'
	}
	if (code < NUMBER + 10) {
		return code - NUMBER + 26 + 26;
	}
	if (code < UPPER + 26) {
		return code - UPPER;
	}
	if (code < LOWER + 26) {
		return code - LOWER + 26;
	}
	if (code < NUMBER) {
		throw '';  //return -1;	// no match
	}
}

////////////////////////////////////////////////////////////////////////////////
export function b64decodeFromArray(b64: Array<number>) {
	let len = b64.length;

	if (len % 4 > 0) {
		throw new Error('Invalid string. Length must be a multiple of 4');
	}

	if (b64[len - 2] === PADD) {
		var padding = 2;
	}
	else if (b64[len - 1] === PADD) {
		padding = 1;
	}
	else {
		padding = 0;
	}

	let toret = new Uint8Array(len * 3 / 4 - padding);

	let p = 0;
	let iBound = padding > 0 ? len - 4 : len;
	for (var i = 0, j = 0; i < iBound; i += 4, j += 3) {
		let tmp = (decode(b64[i]) << 18) | (decode(b64[i + 1]) << 12) | (decode(b64[i + 2]) << 6) | decode(b64[i + 3]);
		toret[p++] = (tmp & 0xFF0000) >> 16;
		toret[p++] = (tmp & 0xFF00) >> 8;
		toret[p++] = tmp & 0xFF;
	}
	if (padding === 2) {
		let tmp = (decode(b64[i]) << 2) | (decode(b64[i + 1]) >> 4);
		toret[p++] = (tmp & 0xFF);
	}
	else if (padding === 1) {
		let tmp = (decode(b64[i]) << 10) | (decode(b64[i + 1]) << 4) | (decode(b64[i + 2]) >> 2);
		toret[p++] = ((tmp >> 8) & 0xFF);
		toret[p++] = tmp & 0xFF;
	}

	return toret;
}