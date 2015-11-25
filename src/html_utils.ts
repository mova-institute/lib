import {findIndexwiseDiff} from './algo'

export function highlightIndexwiseStringDiff(arr: Array<string>, spanClass: string) {
	let toret = new Array<string>(arr.length).fill('');
	let curIndex = 0;
	for (let [diffIndex, diffLen] of findIndexwiseDiff(arr)) {
		for (let i = 0; i < toret.length; ++i) {
			toret[i] += arr[i].substring(curIndex, diffIndex)
				+ `<span class="${spanClass}">` + arr[i].substr(diffIndex, diffLen)
				+ '</span>';
		}
		curIndex = diffIndex + diffLen;
	}
	for (let i = 0; i < toret.length; ++i) {
		toret[i] += arr[i].substr(curIndex);
	}
	//console.log(toret);
	return toret;
}