import {INode, IElement, IDocument} from '../xml/interfaces'
import {LibxmlDocument, LibxmlElement, LibxmlNode} from '../xml/libxmljs_webapi_adapter'
import {readFileSync} from 'fs'
import {dirname} from 'path'
import {parseXmlString} from 'libxmljs'
import {traverseDepth} from '../xml/utils'
//import {str2jsdomRoot} from '../utils.node'

let filename = dirname(dirname(__dirname)) + '/data/tagged.xml';
let xmlstr = readFileSync(filename, 'utf-8');

let doc = parseXmlString(xmlstr);
let root = new LibxmlElement(doc.root());

//let jsdom = str2jsdomRoot(xmlstr);

//console.log(doc.root().child(0).nextSibling().type());
//console.log(root.firstChild.nextSibling.nodeName);
// console.log('------------------');
//console.log(jsdom.firstChild.nextSibling.firstChild.nodeName);

let t = 0;
traverseDepth(root, (node: INode) => {
	++t;
})
//console.log('////////////////////////////////////////////////////////////////////////////');
// traverseDepth(jsdom, (node: INode) => {
// 	++t;
// })
console.log(t);