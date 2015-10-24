let PUNC_SPACING = {
  ',': ['', ' '],
  '.': ['', ' '],
  ':': ['', ' '],
  ';': ['', ' '],
  '-': ['', ''],    // dash
  '–': ['', ''],    // n-dash
  '—': [' ', ' '],  // m-dash
  '(': [' ', ''],
  ')': ['', ' '],
  '„': [' ', ''],
  '“': ['', ''],    // what about eng?
  '«': [' ', ''],
  '»': ['', ' '],
  '!': ['', ' '],
  '?': ['', ' '],
  '…': ['', ' '],
};

const WORD_TAGS = new Set(['w', 'mi:w_']);

////////////////////////////////////////////////////////////////////////////////
export function haveSpaceBetween(a: HTMLElement, b: HTMLElement): boolean {
  if (!a || !b) {
    return false;
  }

  if (WORD_TAGS.has(a.tagName) && WORD_TAGS.has(b.tagName)) {
    return true;
  }

  if (WORD_TAGS.has(a.tagName) && b.tagName === 'pc' && (b.innerHTML in PUNC_SPACING)) {
    return PUNC_SPACING[b.innerHTML][0].length > 0;
  }
  if (WORD_TAGS.has(b.tagName) && a.tagName === 'pc' && (a.innerHTML in PUNC_SPACING)) {
    return PUNC_SPACING[a.innerHTML][1].length > 0;
  }

  if (a.tagName === b.tagName && b.tagName === 'pc') {
    if (a.innerHTML === b.innerHTML) {
      return false;
    }
  }

  if (b.tagName === 'pc' && (b.innerHTML in PUNC_SPACING)) {
    return PUNC_SPACING[b.innerHTML][0].length > 0;
  }

  if (a.tagName === 'mi:se') {
    return true;
  }

  return false;
}