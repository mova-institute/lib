////////////////////////////////////////////////////////////////////////////////
export function encodeUtf8(str: string) {
  let ret = new Array<number>();
  for (let i = 0; i < str.length; ++i) {  // not for-of!
    let c = str.charCodeAt(i);
    if (c < 128) {
      ret.push(c);
    }
    else if (c < 2048) {
      ret.push((c >>> 6) | 192);
      ret.push((c & 63) | 128);
    }
    else {
      ret.push((c >>> 12) | 224);
      ret.push(((c >>> 6) & 63) | 128);
      ret.push((c & 63) | 128);
    }
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function decodeUtf8(bytes: ArrayLike<number>) {
  let ret = '';
  for (let i = 0; i < bytes.length; ++i) {
    let b = bytes[i];

    if (b < 128) {
      ret += String.fromCharCode(b);
    }
    else if ((b > 191) && (b < 224)) {
      let b2 = bytes[++i];
      ret += String.fromCharCode(((b & 31) << 6) | (b2 & 63));
    }
    else {
      let b2 = bytes[++i];
      let b3 = bytes[++i];
      ret += String.fromCharCode(((b & 15) << 12) | ((b2 & 63) << 6) | (b3 & 63));
    }
  }

  return ret;
}


const BASIS_64 = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'].map(x => x.codePointAt(0));
const PLUS = '+'.charCodeAt(0);
const SLASH = '/'.charCodeAt(0);
const NUMBER = '0'.charCodeAt(0);
const LOWER = 'a'.charCodeAt(0);
const UPPER = 'A'.charCodeAt(0);
const PLUS_URL_SAFE = '-'.charCodeAt(0);
const SLASH_URL_SAFE = '_'.charCodeAt(0);
const PADD = '='.charCodeAt(0);

function b64decode(code: number) {
  if (code === PLUS || code === PLUS_URL_SAFE) {
    return 62;  // '+'
  }
  if (code === SLASH || code === SLASH_URL_SAFE) {
    return 63;   // '/'
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
export function b64decodeFromArray(b64: ArrayLike<number>) {
  let len = b64.length;

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4');
  }

  let padding;
  if (b64[len - 2] === PADD) {
    padding = 2;
  }
  else if (b64[len - 1] === PADD) {
    padding = 1;
  }
  else {
    padding = 0;
  }

  let ret = new Uint8Array(len * 3 / 4 - padding);

  let p = 0;
  let iBound = padding > 0 ? len - 4 : len;
  let i = 0;
  for (let j = 0; i < iBound; i += 4, j += 3) {
    let tmp = (b64decode(b64[i]) << 18) | (b64decode(b64[i + 1]) << 12) | (b64decode(b64[i + 2]) << 6) | b64decode(b64[i + 3]);
    ret[p++] = (tmp & 0xFF0000) >> 16;
    ret[p++] = (tmp & 0xFF00) >> 8;
    ret[p++] = tmp & 0xFF;
  }
  if (padding === 2) {
    let tmp = (b64decode(b64[i]) << 2) | (b64decode(b64[i + 1]) >> 4);
    ret[p++] = (tmp & 0xFF);
  }
  else if (padding === 1) {
    let tmp = (b64decode(b64[i]) << 10) | (b64decode(b64[i + 1]) << 4) | (b64decode(b64[i + 2]) >> 2);
    ret[p++] = ((tmp >> 8) & 0xFF);
    ret[p++] = tmp & 0xFF;
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function b64encode(bytes: Array<number>) {
  let ret = new Array<number>();
  let cursor = 0;
  let temp;
  for (let i = 0; i < bytes.length / 3; ++i) {
    temp = bytes[cursor++] << 16;  // convert to big endian
    temp += bytes[cursor++] << 8;
    temp += bytes[cursor++];
    ret.push(BASIS_64[(temp & 0x00FC0000) >> 18]);
    ret.push(BASIS_64[(temp & 0x0003F000) >> 12]);
    ret.push(BASIS_64[(temp & 0x00000FC0) >> 6]);
    ret.push(BASIS_64[(temp & 0x0000003F)]);
  }
  switch (bytes.length % 3) {
    case 1:
      temp = bytes[cursor++] << 16;  // convert to big endian
      ret.push(BASIS_64[(temp & 0x00FC0000) >> 18]);
      ret.push(BASIS_64[(temp & 0x0003F000) >> 12]);
      ret.push(PADD, PADD);
      break;
    case 2:
      temp = bytes[cursor++] << 16;  // convert to big endian
      temp += bytes[cursor++] << 8;
      ret.push(BASIS_64[(temp & 0x00FC0000) >> 18]);
      ret.push(BASIS_64[(temp & 0x0003F000) >> 12]);
      ret.push(BASIS_64[(temp & 0x00000FC0) >> 6]);
      ret.push(PADD);
      break;

    default:
      break;
  }

  return ret;
}
