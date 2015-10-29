var jsdom = require('jsdom').jsdom;

var doc = jsdom('<element xml:lang="uk"></element>', {
    parsingMode: 'xml'
});

var xmlns = 'http://www.w3.org/XML/1998/namespace';
var lang = doc.documentElement.getAttributeNS(xmlns, 'lang');

console.log(lang);  // null, while 'uk' for XMLDocument in browser