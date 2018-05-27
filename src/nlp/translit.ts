const kabmin2010TranslitMapWordFirst = new Map([
  ['є', 'ye'],
  ['ї', 'yi'],
  ['й', 'y'],
  ['ю', 'yu'],
  ['я', 'ya'],
])

const kabmin2010TranslitMap = new Map([
  ['а', 'a'],
  ['б', 'b'],
  ['в', 'v'],
  ['г', 'h'],
  ['ґ', 'g'],
  ['д', 'd'],
  ['е', 'e'],
  ['є', 'ie'],
  ['ж', 'zh'],
  ['з', 'z'],
  ['и', 'y'],
  ['і', 'i'],
  ['ї', 'i'],
  ['й', 'i'],
  ['к', 'k'],
  ['л', 'l'],
  ['м', 'm'],
  ['н', 'n'],
  ['о', 'o'],
  ['п', 'p'],
  ['р', 'r'],
  ['с', 's'],
  ['т', 't'],
  ['у', 'u'],
  ['ф', 'f'],
  ['х', 'kh'],
  ['ц', 'ts'],
  ['ч', 'ch'],
  ['ш', 'sh'],
  ['щ', 'shch'],
  ['ю', 'iu'],
  ['я', 'ia'],
])

const ukChar = [...kabmin2010TranslitMap.keys()].join('')
const splitRe = new RegExp(`([^${ukChar}]+)`, 'i')


////////////////////////////////////////////////////////////////////////////////
export function translitKabmin2010(text: string) {
  let ret = ''
  let splitted = text.split(splitRe)
  for (let i = 0; i < splitted.length; ++i) {
    if (i % 2) {
      ret += splitted[i]
    } else {
      ret += translitKabmin2010Word(splitted[i].toLowerCase())
    }
  }

  return ret
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function translitKabmin2010Word(word: string) {  // todo: capitalization
  let ret = ''
  let i = 0

  let yotAtStart = kabmin2010TranslitMapWordFirst.get(word[0])
  if (yotAtStart) {
    ret += kabmin2010TranslitMapWordFirst.get(word[0])
    ++i
  }

  for (; i < word.length; ++i) {
    if (word[i] === 'з' && word[i + 1] === 'г') {
      ret += 'zgh'
      ++i
    } else {
      ret += kabmin2010TranslitMap.get(word[i])
    }
  }

  return ret
}
