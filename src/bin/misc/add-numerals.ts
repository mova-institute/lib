import * as fs from 'fs';


let regexps = `
^перший
^другий
^третій
^четвертий
^п'ятий
^шостий
^сьомий
^восьмий
^дев'ятий
^десятий
^одинадцятий
^дванадцятий
^тринадцятий
^чотирнадцятий
^п'ятнадцятий
^шістнадцятий
^сімнадцятий
^вісімнадцятий
^дев'ятнадцятий
^двадцятий
^тридцятий
^сороковий
^.*десятий
дев'яностий
^.*сотий
^.*тисячний
^.*мільйонний
^(?!багато).*мільярдний
^.*трильйонний

`.trim().split('\n').map(x => x.trim());

const DICT_PATH = '/Users/msklvsk/Developer/mova-institute/spell-uk/src/Dictionary/base.lst';

let dict = fs.readFileSync(DICT_PATH, 'utf-8').split('\n');

for (let regex of regexps) {
  let wasMatched = false;
  let re = new RegExp(regex);
  for (let i=0; i < dict.length; ++i) {
    let line = dict[i];
    if (re.test(line)) {
      console.log(line);
      wasMatched = true;
      
      if (line.includes(':')) {
        line += '&^numr';
      } else {
        line += ' :&^numr';
      }
      dict[i] = line;
    }
  }
  if (!wasMatched) {
    throw new Error('No match for ' + regex);
  }
}

fs.writeFileSync(DICT_PATH, dict.join('\n'), 'utf8')
