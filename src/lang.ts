export let r = String.raw;

////////////////////////////////////////////////////////////////////////////////
export function last<T>(array: Array<T>) {
  return array[array.length - 1];
}

////////////////////////////////////////////////////////////////////////////////
export function wrappedOrNull<T>(construct: { new (val): T; }, val) {
	return val ? new construct(val) : null;
}

////////////////////////////////////////////////////////////////////////////////
export function countGenerated<T>(generator: Iterator<T>) {
  for (var i = 0; !generator.next().done; ++i);
  return i;
}
////////////////////////////////////////////////////////////////////////////////
export function ithGenerated<T>(generator: Iterator<T>, index: number) {
	let cur = generator.next();
  while (index-- && !cur.done) {
    cur = generator.next()
  };
  
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
export function sleep(ms = 0) {
  return new Promise(() => setTimeout(null, ms));
}

////////////////////////////////////////////////////////////////////////////////
export function isUndefined(value) {
  return typeof value === 'undefined';
}

////////////////////////////////////////////////////////////////////////////////
export function isOddball(value) {
  return isUndefined(value) || value === null;
}