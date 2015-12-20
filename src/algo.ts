////////////////////////////////////////////////////////////////////////////////
export function uniqValuedMap2array(map) {
	return Object.keys(map).sort((a, b) => {
		return map[a] - map[b];
	})
} 

////////////////////////////////////////////////////////////////////////////////
export function* findIndexwiseDiff(input: Array<any>) {
	let maxLen = Math.max(...input.map(x => x.length));
	let curDiffLen = 0;
	for (let j = 0; j < maxLen; ++j) {
		let cur = input[0][j];
		for (let i = 1; i < input.length; ++i) {
			if (input[i][j] !== cur) {
				++curDiffLen;
				break;
			}
			if (curDiffLen) {
				yield [j - curDiffLen, curDiffLen];
				curDiffLen = 0;
			}
		}
	}
	if (curDiffLen) {
		yield [maxLen - curDiffLen, curDiffLen];
	}
}

////////////////////////////////////////////////////////////////////////////////
export function longestCommonSubstring(strings: Array<string>) {  // naive
	let toret = '';
	if (strings.length) {
		for (let i = 0; i < strings[0].length; ++i) {
			for (let j = 0; j < strings[0].length - i + 1; ++j) {
				let candidate = strings[0].substring(i, i + j);
				if (j > toret.length && strings.every(x => x.indexOf(candidate) >= 0)) {
					toret = candidate;
				}
			}
		}
	}

	return toret;
}