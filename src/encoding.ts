import {numericCompare} from './algo';

const TABLE =
  ' !\'()*+,-./0123456789:;<=>?@' +
  'АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯабвгґдеєжзиіїйклмнопрстуфхцчшщьюя’' +
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
  '[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';


let table = TABLE.split('').map(x => x.codePointAt(0));
let tableSorted = table.slice(0).sort(numericCompare);

const REVERSE_TABLE = new Uint16Array(tableSorted[tableSorted.length - 1] + 1);  // todo
for (let i = 0, j = 0; i < table.length; ++i) {
  let c = tableSorted[i];
  REVERSE_TABLE.fill(-1, j, c);
  REVERSE_TABLE[c] = table.indexOf(c);
  j = c + 1;
}
//console.log(REVERSE_TABLE);
const TABLE_SHIFT = 2;

////////////////////////////////////////////////////////////////////////////////
export function miDecode(bytes: Array<number>) {
  let out = '';
  for (let byte of bytes) {
    out += TABLE.charAt(byte - TABLE_SHIFT);
  }

  return out;
}

////////////////////////////////////////////////////////////////////////////////
export function miEncode(str: string) {
  let out = new Array<number>();
  for (let i = 0; i < str.length; ++i) {
    let c = str.codePointAt(i);
    out.push(REVERSE_TABLE[c] + TABLE_SHIFT); // todo ’, sparse array
  }

  return out;
}