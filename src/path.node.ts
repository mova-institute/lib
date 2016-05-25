import {join} from 'path';

export function getLibRootRelative(...path: string[]) {
  return join(__dirname, ...path);
}
