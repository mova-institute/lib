export function uniqValuedMap2array(map) {
	return Object.keys(map).sort((a, b) => {
		return map[a] - map[b];
	})
} 