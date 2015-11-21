export let r = String.raw;

// todo: ...rest?
export function wrappedOrNull<T>(construct: {new(val): T; }, val) {
	return val ? new construct(val) : null;
}

export function ithGenerated<T>(generator: Iterator<T>, index: number) {
	for (var cur = generator.next(); index >= 0 && !cur.done; --index, cur = generator.next());
	return cur.value;
}
