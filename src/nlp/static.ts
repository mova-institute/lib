import { r } from '../lang'
import { flipObjMap } from '../algo'

export const ukComparator = new Intl.Collator('uk-UA').compare

export const APOSTROPES = '\'"*`’‘'

export const EMOJIS = r`\ud83c[\udf00-\udfff]|\ud83d[\udc00-\ude4f]|\ud83d[\ude80-\udeff]`
export const LETTER_CYR = r`А-ЯІЇЄҐа-яіїєґ`
export const LETTER_CYR_EXCLUSIVE = r`БбВвГгҐґДдЄєЖжЗзИиЙйКкЛлмнПпТУФфЦцЧчШшЩщЬьЮюЯя`
export const LETTER_LAT_EXCLUSIVE = r`QqWwRtYUuSsDdFfGghJjkLlZzVvbNnm`
export const LETTER_UK = r`АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщЬьЮюЯя`
export const LETTER_UK_UPPERCASE = r`АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ`
export const LETTER_UK_LOWERCASE = r`абвгґдеєжзиіїйклмнопрстуфхцчшщьюя`
export const APOSTROPHES_COMMON = r`“᾿ʹ”´΄ʾ᾽‘´\`'’ʼ"`
export const APOSTROPHES_SICK = r`ˈי»\uF0A2\u0313*`
export const APOSTROPHES = APOSTROPHES_COMMON + APOSTROPHES_SICK
export const APOSTROPHE_PRECEEDERS = `бпвмфгґкхжчшр`
export const APOSTROPHE_FOLLOWERS = `єїюя`


export const EMOJI_RE = require('emoji-regex')()
export const INVISIBLES_RE = /[\u0000-\u0008\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060]/gu
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
export const ARABIC_NUMERAL_RE = /^(\d+[½]?|\d+[,.]\d+|\d+([ ,]\d{3})+)$/  // keep enclosing ()
export const ROMAN_NUMERAL_RE = /^M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/
export const SYMBOL_RE = new RegExp(r`^([@#$*+×÷=<>♥∙·❤❄~←→↑↓✓☀]|${EMOJIS}|:\()$`)
export const LITERAL_SMILE_RE = /^:\w+:$/
export const HASHTAG_RE = new RegExp(`^#${WORDCHAR}$`)

export const APOSTROPES_REPLACE_RE = new RegExp(r`[${APOSTROPES}]`)
export const NUMERAL_PREFIXED_TOKEN_RE = new RegExp(r`^(\d+)-([${APOSTROPES}${LETTER_UK}]+)$`)


const SMILE_RE_STRS = [
  r`[:;]?[)(]+`,
  r`О_о`,
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
  r`−`,  // minus
  r`---?`,
  r`/`,
  r`•`,
  r`"`,
  r`✓`,
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
  r`О_о`,
  r`0_0`,
].join('|')


const INTERJECTION_RE_STRS = [
  r`о+`,
  r`є+`,
  r`а+`,
  r`уу+`,
  r`ги+`,
  r`ммм+`,
  r`еее+`,
  r`гг+`,
  r`фу+`,
  r`бу+`,
  r`о+к`,
  r`юху+`,
  r`ура+`,
  r`о(ло){2,}`,
  r`уфф+`,
  r`а?(ха)+х?`,
  r`і?(хі)+х?`,
  r`б+ах`,
  r`хм+`,
]
const INTERJECTION_RE_STR = INTERJECTION_RE_STRS.join('|')
export const INTERJECTION_RE = new RegExp(`^(${INTERJECTION_RE_STR})$`, 'i')

export const latToCyrUnaccented = {
  'e': 'е',
  'y': 'у',
  'i': 'і',
  'o': 'о',
  'p': 'р',
  'a': 'а',
  'x': 'х',
  'c': 'с',
  'E': 'Е',
  'T': 'Т',
  'I': 'І',
  'O': 'О',
  'P': 'Р',
  'A': 'А',
  'H': 'Н',
  'K': 'К',
  'X': 'Х',
  'C': 'С',
  'B': 'В',
  'M': 'М',
  'ï': 'ї',
  'Ï': 'Ї',
  'ȉ': 'ї',
  'Ȉ': 'Ї',
  'ı': 'і',
  'r': 'г',
  'u': 'и',  // ~
}

export const latToCyrAccented = {
  'À': 'А',
  'Á': 'А',
  'È': 'Е',
  'É': 'Е',
  'Ì': 'І',
  'Í': 'І',
  'Ò': 'О',
  'Ó': 'О',
  'à': 'а',
  'á': 'а',
  'ȁ': 'а',
  'è': 'е',
  'ѐ': 'е',
  'é': 'е',
  'ì': 'і',
  'í': 'і',
  'ȉ': 'ї',
  'ḯ': 'ї',
  'ò': 'о',
  'ó': 'о',
  'ȍ': 'о',
  'ú': 'и',
  'ù': 'и',
  'ý': 'у',
  'ỳ': 'у',
}

export const latToCyr = { ...latToCyrUnaccented, ...latToCyrAccented }
export const cyrToLat = flipObjMap(latToCyrUnaccented)
export const latMixins = Object.keys(latToCyr).join('')
export const cyrMixins = Object.values(latToCyr).join('')
export const accentLatMixins = Object.keys(latToCyrAccented).join('')
