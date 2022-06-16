export function getEndpoint(lang: string) {
  if (!(lang in udpipeApiLangMap)) {
    return
  }
  let { url, model } = udpipeApiLangMap[lang]
  if (!url) {
    url = 'https://api.mova.institute/udpipe/process'
  }

  return { url, model }
}

const LINDAT_API_ENDPOINT = 'https://lindat.mff.cuni.cz/services/udpipe/api/'

const udpipeApiLangMap = {
  uk: {
    model: 'uk-180610',
  },
  de: {
    model: 'german-gsd-ud-2.3-181115',
  },
  du: {
    model: 'dutch-alpino-ud-2.3-181115',
  },
  cs: {
    model: 'czech-pdt-ud-2.3-181115',
  },
  en: {
    model: 'english-ewt-ud-2.3-181115',
  },
  es: {
    model: 'spanish-gsd-ud-2.3-181115',
  },
  fr: {
    model: 'french-gsd-ud-2.3-181115',
  },
  pl: {
    model: 'polish-lfg-ud-2.3-181115',
  },
  pt: {
    model: 'portuguese-bosque-ud-2.3-181115',
  },
  sk: {
    model: 'slovak-snk-ud-2.3-181115',
  },
  ar: {
    model: 'arabic-padt-ud-2.3-181115',
  },
  bg: {
    model: 'bulgarian-btb-ud-2.3-181115',
  },
  be: {
    model: 'belarusian-hse-ud-2.3-181115',
  },
  et: {
    model: 'estonian-edt-ud-2.3-181115',
  },
  hr: {
    model: 'croatian-set-ud-2.3-181115',
  },
  nl: {
    model: 'dutch-alpino-ud-2.3-181115',
  },
  el: {
    model: 'greek-gdt-ud-2.3-181115',
  },
  ca: {
    model: 'catalan-ancora-ud-2.3-181115',
  },
  eu: {
    // Basque not in UD !!!!!!!!!
    model: 'basque-bdt-ud-2.3-181115',
  },
  he: {
    model: 'hebrew-htb-ud-2.3-181115',
  },
  hu: {
    model: 'hungarian-szeged-ud-2.3-181115',
  },
  it: {
    model: 'italian-isdt-ud-2.3-181115',
  },
  lt: {
    model: 'lithuanian-hse-ud-2.3-181115',
  },
  lv: {
    model: 'latvian-lvtb-ud-2.3-181115',
  },
  ro: {
    model: 'romanian-rrt-ud-2.3-181115',
  },
  ru: {
    model: 'russian-syntagrus-ud-2.3-181115',
  },
  tr: {
    model: 'turkish-imst-ud-2.3-181115',
  },
  vi: {
    model: 'vietnamese-vtb-ud-2.3-181115',
  },
  sr: {
    model: 'serbian-set-ud-2.3-181115',
  },
  fa: {
    model: 'persian-seraji-ud-2.3-181115',
  },
  hi: {
    model: 'hindi-hdtb-ud-2.3-181115',
  },
  hy: {
    model: 'armenian-armtdp-ud-2.3-181115',
  },
  id: {
    model: 'indonesian-gsd-ud-2.3-181115',
  },
  ja: {
    model: 'japanese-gsd-ud-2.3-181115',
  },
  // 'ka': {  //?
  //   model: 'kazakh-ud-2.0-170801',
  // },
  // 'kk': {
  //   model: '',
  // },
  // 'kr': {
  //   model: '',
  // },
  // 'ky': {
  //   model: '',
  // },
  // 'mn': {
  //   model: '',
  // },
  // 'th': {
  //   model: '',
  // },
  // 'tk': {
  //   model: '',
  // },
  // 'tt': {
  //   model: '',
  // },
  // 'uz': {
  //   model: '',
  // },
  zh: {
    model: 'chinese-gsd-ud-2.3-181115',
  },
}
