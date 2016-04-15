import {xmlNsResolver, removeXmlns} from './xml/utils';

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
export function parseXml(str: string) {  // todo: test in non-chrome
  let doc = getDomParser().parseFromString(str, 'application/xml');
  let error = doc.evaluate('//xhtml:parsererror', doc, <any>xmlNsResolver,
    XPathResult.ANY_UNORDERED_NODE_TYPE, null).singleNodeValue;

  return error ? null : doc;
}

////////////////////////////////////////////////////////////////////////////////
export function serializeXml(node: Node) {
  return getXmlSerializer().serializeToString(node);
}

////////////////////////////////////////////////////////////////////////////////
export function serializeXmlNoNs(node: Node) {
  return removeXmlns(serializeXml(node));
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
    a['download'] = filename;
    a.dataset['downloadurl'] = `${mime}:${filename}:${a.href}`;
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
export function openLocalFile(accept: string, multiple: boolean, cb: (files: FileList) => any) {
  let fileInput = document.createElement('input');
  fileInput.setAttribute('type', 'file');
  fileInput.setAttribute('accept', accept);
  fileInput.setAttribute('multiple', multiple.toString());
  fileInput.addEventListener('change', () => {
    cb(fileInput.files);
    fileInput.remove();
  });
  fileInput.click();
}

//////////////////////////////////////////////////////////////////////////////
export async function readToXmlDoc(file: File) {
  return parseXml(await readFile(file));
}

//////////////////////////////////////////////////////////////////////////////
export interface IWebapiCollection<T> {
  length: number;
  item(i: number): T;
}

//////////////////////////////////////////////////////////////////////////////
export function collection2array<T>(collection: IWebapiCollection<T>) {
  let ret = new Array<T>();
  for (let i = 0; i < collection.length; ++i) {
    ret.push(collection.item(i));
  }
  
  return ret;
}

//////////////////////////////////////////////////////////////////////////////
export function loadScript(src: string) {
  return new Promise<HTMLScriptElement>((resolve, reject) => {
    let script = <HTMLScriptElement>document.getElementById(src);
    if (script) {
      resolve(script);
    }
    else {
      script = document.createElement('script');
      script.id = src;
      script.src = src;
      script.onload = () => resolve(script);
      let head = document.getElementsByTagName('head')[0];
      head.appendChild(script);
    }
  });
}
