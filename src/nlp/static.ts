import { r } from '../lang'


// todo: wait for unicode in node's V8
export const EMOJI_RE = require('emoji-regex')()
export const LETTER_UK = r`АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя`
export const LETTER_UK_UPPERCASE = r`АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ`
export const LETTER_UK_LOWERCASE = r`абвгґдеєжзиіїйклмнопрстуфхцчшщьюя`
export const EMOJIS = r`\ud83c[\udf00-\udfff]|\ud83d[\udc00-\ude4f]|\ud83d[\ude80-\udeff]`

export const WCHAR_UK = r`\-’${LETTER_UK}`
export const WCHAR_UK_UPPERCASE = r`\-’${LETTER_UK_UPPERCASE}`
export const FOREIGN_RE = new RegExp(`^[${WCHAR_UK}]*[A-Za-zЫыЁёЪъЭэ]+[${WCHAR_UK}]*$`)  // not negation
export const WORDCHAR_UK_RE = new RegExp(`^[${WCHAR_UK}]+$`)
export const WCHAR_NOT_UK_RE = new RegExp(`^[^${WCHAR_UK}]+$`)
export const WCHAR_OTHER = r`\u0301А-Яа-яóéëá`
export const WORDCHAR = r`\w${WCHAR_UK}${WCHAR_OTHER}'\``
export const WORDCHAR_RE = new RegExp(`^[${WORDCHAR}]+$`)

export const URL_RE = /^(https?:\/\/|www\.)\w+(\.\w+)+(\/([\w/\-]+)?)?$/
export const EMAIL_RE = /^[\w\.]+@\w+(\.\w+)+$/
export const ARABIC_NUMERAL_RE = /^(\d+[½]?|\d+[,.]\d+)$/
export const ROMAN_NUMERAL_RE = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/
export const SYMBOL_RE = new RegExp(r`^([№@#$%*§©+×÷=<>♥∙°₴❤❄~]|${EMOJIS}|:\()$`)
export const LITERAL_SMILE_RE = /^:\w+:$/
export const HASHTAG_RE = new RegExp(`^#${WORDCHAR}$`)

//(?:(?=\w)(?<!\w)|(?<=\w)(?!\w))

const diacritics = [
  ['і', '\u{308}', 'ї'],
  ['и', '\u{306}', 'й'],
  // ['', '', ''],
]

export const APOSTROPES = '\'"`’'
export const APOSTROPES_REPLACE_RE = /['"*`]/g


const SMILE_RE_STRS = [
  r`[:;]?[)(]+`,
  r`О_о`
  // r``,
]
export const SMILE_RE_STR = SMILE_RE_STRS.join('|')
export const SMILE_RE = new RegExp(`^(${SMILE_RE_STR})$`)

const PUNC_REGS = [
  r`\.{3,}`,
  r`!\.{2,}`,
  r`\?\.{2,}`,
  r`[!?]+`,
  r`,`,
  r`„`,
  r`“`,
  r`”`,
  r`«`,
  r`»`,
  r`\(`,
  r`\)`,
  r`\[`,
  r`\]`,
  r`\.`,
  r`…`,
  r`:`,
  r`;`,
  r`—`,  // M
  r`–`,  // N
  r`---?`,
  r`/`,
  r`•`,
  r`"`,
]
export const ANY_PUNC = PUNC_REGS.join('|')
export const ANY_PUNC_OR_DASH_RE = new RegExp(`^(${ANY_PUNC}|-)$`)

export const PUNC_SPACING = {
  ',': [false, true],
  '.': [false, true],
  ':': [false, true],
  ';': [false, true],
  '-': [false, false],   // dash
  '–': [false, false],   // n-dash
  '—': [true, true],     // m-dash
  '(': [true, false],
  ')': [false, true],
  '[': [true, false],
  ']': [false, true],
  '„': [true, false],
  '“': [true, false],    // what about ukr/eng?
  '”': [false, true],
  '«': [true, false],
  '»': [false, true],
  '!': [false, true],
  '?': [false, true],
  '…': [false, true],
}

export const PUNC_GLUED_AFTER = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][0]).map(x => '\\' + x).join('')
export const PUNC_GLUED_BEFORE = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][1]).map(x => '\\' + x).join('')
export const NO_GLUE_PUNC = Object.keys(PUNC_SPACING).filter(x => PUNC_SPACING[x][0] && PUNC_SPACING[x][1]).map(x => '\\' + x).join('')

export const SMILIES_1 = [
  'О_о'
].join('|')
