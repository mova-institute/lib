import { ValueDeserializer, MapDawg } from './map_dawg';
import { createStringMapDawg } from './factories';

import { readFileSync } from 'fs';



////////////////////////////////////////////////////////////////////////////////
export function createStringMapDawgSync<T>(filename: string, deserializer: ValueDeserializer<T>) {
  return createStringMapDawg<T>(readFileSync(filename).buffer, deserializer, 0b1, true);
}
