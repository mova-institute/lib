import {INode, IElement, IDocument} from '../xml/api/interfaces'
import {LibxmlDocument, LibxmlElement, LibxmlNode} from '../xml/api/libxmljs_adapters'
import {readFileSync} from 'fs'
import {dirname} from 'path'
import * as libxmljs from 'libxmljs'
import {traverseDepth} from '../xml/utils'

let filename = dirname(dirname(__dirname)) + '/data/tagged.xml';
let xmlstr = readFileSync(filename, 'utf-8');

let doc = libxmljs.parseXmlString(xmlstr);
let root = new LibxmlElement(doc.root());

let a: Node;

//console.log(doc.root().child(0).nextSibling().child(0).nextSibling());

traverseDepth(root, (node: INode) => {
	console.log(node.lang());
})
