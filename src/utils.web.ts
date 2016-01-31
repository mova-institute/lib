import {xmlNsResolver} from './xml/utils';

//------------------------------------------------------------------------------
let xmlSerializer: XMLSerializer;
function getXmlSerializer() {
  return xmlSerializer || (xmlSerializer = new XMLSerializer());
}

//------------------------------------------------------------------------------
let domParser: DOMParser;
function getDomParser() {
  return domParser || (domParser = new DOMParser());
}

////////////////////////////////////////////////////////////////////////////////
export function parseXml(str: string) {
  let doc = getDomParser().parseFromString(str, 'application/xml');
  let error = doc.evaluate('/xml:html/xml:body/xml:parsererror', doc, <any>xmlNsResolver, XPathResult.UNORDERED_NODE_ITERATOR_TYPE, null).iterateNext();
  
  return error ? null : doc;
}

////////////////////////////////////////////////////////////////////////////////
export function serializeXml(node: Node) {
  return getXmlSerializer().serializeToString(node);
}

////////////////////////////////////////////////////////////////////////////////
export async function readFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    let reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result);
    };
    reader.readAsText(file);
  });
}

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

////////////////////////////////////////////////////////////////////////////////
export function openLocalFile(cb: (files: FileList) => any) {
  let fileInput = document.createElement('input');
  fileInput.setAttribute('type', 'file');
		fileInput.addEventListener('change', () => {
    cb(fileInput.files);
    fileInput.remove();
  });
  fileInput.click();
}

////////////////////////////////////////////////////////////////////////////////
export function readLocalFile(cb: (fileContents: string, filename?: string) => any) {
  openLocalFile(files => {
    let reader = new FileReader();
    let file = files.item(0);
    reader.readAsText(file);
    reader.onload = () => {
      cb(reader.result, file.name);
    };
  });
}

//////////////////////////////////////////////////////////////////////////////
export async function readToXmlDoc(file: File) {
  return parseXml(await readFile(file));
}