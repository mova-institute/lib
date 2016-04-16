////////////////////////////////////////////////////////////////////////////////
export function num2Uint16BytesBE(num: number) {
  let ret = new Uint8Array(2);
  new DataView(ret.buffer).setUint16(0, num);

  return ret;
}

// ////////////////////////////////////////////////////////////////////////////////
// export function nonzeroBytesEncode(bytes: Array<number>) {
//   let overflow = 0;
//   for (let i = 0; i < bytes.length; ++i) {
//     overflow = bytes[i] += 1 + overflow;
//     overflow = ~~(overflow / 255) * (overflow % 255);
//     bytes[i] -= overflow;
//   }
//   if (overflow) {
//     bytes.push(overflow);  // todo
//   }

//   return bytes;
// }

////////////////////////////////////////////////////////////////////////////////
export function encodeUtf8(str: string) {  // todo: more octets?
  let ret = new Array<number>();
  let p = 0;
  for (let i = 0; i < str.length; ++i) {
    let c = str.charCodeAt(i);
    if (c < 128) {
      ret[p++] = c;
    }
    else if (c < 2048) {
      ret[p++] = (c >>> 6) | 192;
      ret[p++] = (c & 63) | 128;
    }
    else {
      ret[p++] = (c >>> 12) | 224;
      ret[p++] = ((c >>> 6) & 63) | 128;
      ret[p++] = (c & 63) | 128;
    }
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function decodeUtf8(bytes: Array<number>) {

  let ret = '';
  for (let i = 0; i < bytes.length; ) {
    let c = bytes[i];

    if (c < 128) {
      ret += String.fromCharCode(c);
      ++i;
    }
    else if ((c > 191) && (c < 224)) {
      let c2 = bytes[i + 1];
      ret += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
      i += 2;
    }
    else {
      let c2 = bytes[i + 1];
      let c3 = bytes[i + 2];
      ret += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
      i += 3;
    }
  }

  return ret;
}


const BASIS_64 = ('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/').split('').map(x => x.codePointAt(0));
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

  let ret = new ArrayBuffer(len * 3 / 4 - padding);
  let view = new Uint8Array(ret);

  let p = 0;
  let iBound = padding > 0 ? len - 4 : len;
  let i = 0;
  for (let j = 0; i < iBound; i += 4, j += 3) {
    let tmp = (b64decode(b64[i]) << 18) | (b64decode(b64[i + 1]) << 12) | (b64decode(b64[i + 2]) << 6) | b64decode(b64[i + 3]);
    view[p++] = (tmp & 0xFF0000) >> 16;
    view[p++] = (tmp & 0xFF00) >> 8;
    view[p++] = tmp & 0xFF;
  }
  if (padding === 2) {
    let tmp = (b64decode(b64[i]) << 2) | (b64decode(b64[i + 1]) >> 4);
    view[p++] = (tmp & 0xFF);
  }
  else if (padding === 1) {
    let tmp = (b64decode(b64[i]) << 10) | (b64decode(b64[i + 1]) << 4) | (b64decode(b64[i + 2]) >> 2);
    view[p++] = ((tmp >> 8) & 0xFF);
    view[p++] = tmp & 0xFF;
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
