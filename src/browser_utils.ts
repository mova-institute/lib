////////////////////////////////////////////////////////////////////////////////
function dataDownloadOrOpen(data, mime: string, filename?: string) {
	let blob = new Blob([data], { type: mime });
	let a = document.createElement('a');
	a.href = window.URL.createObjectURL(blob);
	if (filename) {
		a['download'] = filename;	// todo: a.download typescript
		a.dataset['downloadurl'] = `${mime}:${filename}:${a.href}`;	// todo ^
	}
	else {
		a.target = '_blank';
	}

	let e = document.createEvent('MouseEvents');
	e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);

	a.dispatchEvent(e);
}

////////////////////////////////////////////////////////////////////////////////
export function dataDownload(data, filename: string, mime = 'text/plain') {
	dataDownloadOrOpen(data, mime, filename);
}

////////////////////////////////////////////////////////////////////////////////
export function dataOpen(data, mime = 'text/plain') {
	dataDownloadOrOpen(data, mime);
}

////////////////////////////////////////////////////////////////////////////////
export function scrolledToBottom(endIsTop: boolean) {
	if (endIsTop) {
		return !window.scrollY;
	}
	return window.scrollY + document.documentElement.clientHeight >= document.documentElement.offsetHeight;
}