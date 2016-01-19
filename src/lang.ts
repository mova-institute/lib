export let r = String.raw;

////////////////////////////////////////////////////////////////////////////////
export function last<T>(array: Array<T>) {
  return array[array.length - 1];
}

// todo: ...rest?
////////////////////////////////////////////////////////////////////////////////
export function wrappedOrNull<T>(construct: { new (val): T; }, val) {
	return val ? new construct(val) : null;
}

////////////////////////////////////////////////////////////////////////////////
export function ithGenerated<T>(generator: Iterator<T>, index: number) {
	for (var cur = generator.next(); index >= 0 && !cur.done; --index, cur = generator.next());
	return cur.value;
}

////////////////////////////////////////////////////////////////////////////////
export function complement<T>(a: Set<T>, b: Set<T>) {
	return new Set([...a].filter(x => !b.has(x)));
}

////////////////////////////////////////////////////////////////////////////////
export function* zip(...arrays: Array<Array<any>>) {
	if (arrays && arrays.length) {
		for (let i = 0; i < arrays[0].length; ++i) {
			let zipped = [];
			for (let arr of arrays) {
				zipped.push(arr[i]);
			}
			yield {zipped, i};
		}
	}
}

////////////////////////////////////////////////////////////////////////////////
export function collectForof<T>(iterator: Iterable<T>) {
  let toret = new Array<T>();
  for (let val of iterator) {
    toret.push(val);
  }
  
  return toret;
}

export function sleep(ms = 0) {
  return new Promise(() => setTimeout(null, ms));
}