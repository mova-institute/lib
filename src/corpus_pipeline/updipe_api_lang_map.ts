////////////////////////////////////////////////////////////////////////////////
export const udpipeApiLangMap = {
  'uk': {
    url: 'https://api.mova.institute/udpipe/process',
    model: 'uk',
  },
  'de': {
    model: 'german-ud-2.0-170801',
  },
  'cs': {
    model: 'czech-ud-2.0-170801',
  },
  'en': {
    model: 'english-ud-2.0-170801',
  },
  'fr': {
    model: 'french-ud-2.0-170801',
  },
  'pl': {
    model: 'polish-ud-2.0-170801',
  },
}

let langsServedByUfal = [
  'de',
  'cs',
  'en',
  'fr',
  'pl',
]

langsServedByUfal.forEach(x => udpipeApiLangMap[x].url =
  'http://lindat.mff.cuni.cz/services/udpipe/api/process')
