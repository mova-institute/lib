import {zip} from './lang'


/*////////////////////////////////////////////////////////////////////////////////
export function linearizeWide(arrays: Array<Array<number>>, base = Uint32Array) {
  let linearLength = arrays.length * arrays[0].length;
  let toret = new base(linearLength);
  for (let {zipped} of zip(arrays)) {
    for (let num of zipped) {
      toret[toret.length] = num;
    }
  }
  
  return toret;
}*/

////////////////////////////////////////////////////////////////////////////////
export interface IMap<K, V> {
	has(key: K): boolean;
	get(key: K): V;
	set(key: K, val: V): IMap<K, V>;
	[Symbol.iterator]();
}

//------------------------------------------------------------------------------
export class JsonCompareMap<K, V> implements IMap<K, V> {
	map = new Map<string, [K, V]>();

	constructor() {
		this[Symbol.iterator]
	}

	has(key: K) {
		return this.map.has(JSON.stringify(key));
	}

	get(key: K) {
		return this.map.get(JSON.stringify(key))[1];
	}

	set(key: K, val: V) {
		this.map.set(JSON.stringify(key), [key, val]);
		return this;
	}

	[Symbol.iterator]() {
    // todo
	}
}

////////////////////////////////////////////////////////////////////////////////
export class NumeratedSet<T> {  // todo move somewhere 
	values = new Array<T>();
	ids: IMap<T, number>;

	constructor(mapConstructor: { new (): IMap<T, number> } = Map) {
		this.ids = new mapConstructor();
	}

	add(...vals: Array<T>) {
		for (let val of vals) {
			if (!this.ids.has(val)) {
				this.ids.set(val, this.values.push(val) - 1);
			}
		}

		return this;
	}

	id(val: T) {
		return this.ids.get(val);
	}

	static fromUniqueArray(array: Array<any>) {
		let toret = new NumeratedSet();
		toret.values = array;
		for (let i = 0; i < array.length; ++i) {
			toret.ids.set(array[i], i);
		}
		
		return toret;
	}
	
	static fromSet(set: Set<any>) {
		let toret = new NumeratedSet();
		for (let val of set) {
			toret.ids.set(val, toret.values.push(val) - 1);			
		}
		
		return toret;
	}
}