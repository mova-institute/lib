////////////////////////////////////////////////////////////////////////////////
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

//------------------------------------------------------------------------------
const udpipeApiLangMap = {
  'uk': {
    model: 'uk-180610',
  },
  'de': {
    model: 'german-gsd-ud-2.3-181115',
  },
  'du': {
    model: 'dutch-alpino-ud-2.3-181115',
  },
  'cs': {
    model: 'czech-pdt-ud-2.3-181115',
  },
  'en': {
    model: 'english-ewt-ud-2.3-181115',
  },
  'es': {
    model: 'spanish-gsd-ud-2.3-181115',
    // url: 'https://lindat.mff.cuni.cz/services/udpipe/api/',
  },
  'fr': {
    model: 'french-gsd-ud-2.3-181115',
  },
  'pl': {
    model: 'polish-lfg-ud-2.3-181115',
  },
  'pt': {
    model: 'portuguese-bosque-ud-2.3-181115',
  }
}
