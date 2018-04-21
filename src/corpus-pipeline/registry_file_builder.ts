import * as path from 'path'
import { clone } from 'lodash'
import { Dict } from '../types';
import { indexTableByColumn } from '../algo';



const positionalAttrsBase = [
  ['pos', 'ЧМ'],
  ['upos', 'універсальна ЧМ'],
  ['abbr', 'скороченість'],
  ['animacy', 'істотовість'],
  ['animacy_gram', 'граматична істотовість'],
  ['aspect', 'вид дієслова'],
  ['case', 'відмінок'],
  ['degree', 'ступінь порівняння'],
  ['foreign', 'чужинність'],
  ['gender', 'рід'],
  ['hyph', 'передрисковість'],
  ['mood', 'спосіб дієслова'],
  ['nametype', 'тип імені'],
  ['number', 'число'],
  ['numtype', 'тип числівника'],
  ['orth', 'правопис'],
  ['parttype', 'тип частки'],
  ['person', 'особа'],
  ['poss', 'присвійність'],
  ['prontype', 'займенниковий тип'],
  ['puncttype', 'тип пунктуації'],
  ['reflex', 'зворотність'],
  // ['reverse', 'зворотність дієслова'],
  ['tense', 'час'],
  ['uninflect', 'невідмінюваність'],
  ['variant', 'форма прикметника'],
  ['verbform', 'тип дієслова'],
  ['voice', 'стан дієслова'],
  ['tag', 'повна міта'],
  ['index', 'номер в реченні'],
  ['rel', 'реляція'],
  ['urel', 'універсальна реляція'],
  ['head', 'номер голови'],
  ['relhead', 'відстань до голови'],
  ['spaceafter', 'пробіл після'],
]

///////////////////////////////////////////////////////////////////////////////
export interface RegistryFileParams {
  title: string
  langCode: string
  hasDictTags?: boolean
  hasGaps?: boolean
  hasTokenIds?: boolean
  path?: string
  vertical?: string
  subcorpAttrs?: string
}

let langMetas = indexTableByColumn([
  {
    code: 'uk',
    name: 'Ukrainian',
    locale: 'uk_UA',
    nonwordre: '[^АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщьЮюЯя’А-Яа-я[:alpha:]].*',
  },
  {
    code: 'fr',
    name: 'French',
    locale: 'fr_FR',
  },
  {
    code: 'cs',
    name: 'Czech',
    locale: 'cz_CZ',
    // nonwordre: '',
  },
  {
    code: 'pl',
    name: 'Polish',
    locale: 'pl_PL',
    // nonwordre: '',
  },
  {
    code: 'de',
    name: 'German',
    locale: 'de_DE',
    // nonwordre: '',
  },
  {
    code: 'en',
    name: 'English',
    locale: 'en_US',
  },
  // {
  //   code: '',
  //   name: '',
  //   locale: '',
  //   nonwordre: '',
  // },
], 'code')

////////////////////////////////////////////////////////////////////////////////
export function generateRegistryFile(params: RegistryFileParams) {
  let langMeta = langMetas.get(params.langCode)
  if (!langMeta) {
    throw new Error(`Missing lang meta for "${params.langCode}"`)
  }

  let positionalAttrs = clone(positionalAttrsBase) as any[]
  if (params.hasTokenIds) {
    positionalAttrs.push(['id', 'код токена', ['UNIQUE yes']])
  }


  let ret = `

NAME "${params.title}"
INFOHREF "https://mova.institute/corpus"
MAINTAINER "org@mova.institute"
TAGSETDOC "http://universaldependencies.org/guidelines.html"


LANGUAGE "${langMeta.name}"
ENCODING "utf8"
LOCALE "${langMeta.locale}.UTF-8"
${attrOrNothing('NONWORDRE', langMeta.nonwordre)}


################################################################################
#####################          Positionals        ##############################
################################################################################
`
  ret += positionalAttr('word', 'словоформа')
  ret += positionalAttr('lc', 'словоформа мал. літерами', {
    dynamic: 'utf8lowercase',
    dynlib: 'internal',
    arg1: 'C',
    funtype: 's',
    fromattr: 'word',
    type: 'index',
    transquery: 'yes',
  })
  ret += positionalAttr('lemma', 'лема')
  ret += positionalAttr('lemma_lc', 'лема мал. літерами', {
    dynamic: 'utf8lowercase',
    dynlib: 'internal',
    arg1: 'C',
    funtype: 's',
    fromattr: 'lemma',
    type: 'index',
    transquery: 'yes',
  })

  ret += positionalAttrs.map(([name, label]) => positionalAttr(name, label)).join('\n')
  if (params.hasDictTags) {
    ret += positionalAttr('tag_dic', 'повна міта зі словника', {
      multivalue: 'yes',
      multisep: ';'
    })
  }
  ret += `

################################################################################
#####################          Structures        ###############################
################################################################################

STRUCTURE doc {
  TYPE file64
  ATTRIBUTE id {
    LABEL "код документа"
    DEFAULTVALUE ""
  }
  ATTRIBUTE title {
    LABEL "назва"
    DEFAULTVALUE ""
  }
  ATTRIBUTE date {
    LABEL "час появи"
    DEFAULTVALUE ""
  }
  ATTRIBUTE author {
    LABEL "автор"
    MULTIVALUE yes
    MULTISEP "|"
    DEFAULTVALUE ""
  }
  ATTRIBUTE original_author {
    LABEL "автор первотвору"
    MULTIVALUE yes
    MULTISEP "|"
    DEFAULTVALUE ""
  }
  ATTRIBUTE chtyvo_section {
    LABEL "розділ (для Чтива)"
    DEFAULTVALUE ""
  }
  ATTRIBUTE chtyvo_type {
    LABEL "тип (для Чтива)"
    DEFAULTVALUE ""
  }
  ATTRIBUTE source {
    LABEL "джерело"
    DEFAULTVALUE ""
  }
  ATTRIBUTE type {
    LABEL "тип"
    MULTIVALUE yes
    MULTISEP "|"
#    HIERARCHICAL "::"
    DEFAULTVALUE ""
  }
  ATTRIBUTE domain {
    LABEL "галузь"
    MULTIVALUE yes
    MULTISEP "|"
#    HIERARCHICAL "::"
    DEFAULTVALUE ""
  }
  ATTRIBUTE url {
    LABEL "посилання"
    DEFAULTVALUE ""
  }
  ATTRIBUTE wordcount {
    LABEL "кількість слів"
    DEFAULTVALUE ""
  }
}
STRUCTURE p {
  TYPE file64
  ATTRIBUTE id {
    LABEL "код абзаца"
    DEFAULTVALUE ""
  }
}
STRUCTURE s {
  TYPE file64
  ATTRIBUTE id {
    LABEL "код речення"
    DEFAULTVALUE ""
  }
}
STRUCTURE g {
  TYPE file64
  DISPLAYTAG 0
  DISPLAYBEGIN "_EMPTY_"
  DEFAULTVALUE ""
}`
  if (params.hasGaps) {
    ret += `
STRUCTURE gap {
  TYPE file64
  LABEL "пропуск"
  ATTRIBUTE type {
    LABEL "тип"
    DEFAULTVALUE ""
  }
}`
  }
  ret += `



################################################################################
########################          View        ##################################
################################################################################

SHORTREF "=doc.title"

HARDCUT "2000"
MAXKWIC "100"
MAXCONTEXT "100"
MAXDETAIL "100"

DOCSTRUCTURE doc
DEFAULTATTR word
#FULLREF
#STRUCTCTX yes    # test
#WRAPDETAIL

# todo ATTRDOC, ATTRDOCLABEL,

FULLREF "doc.title,doc.author,doc.original_author,doc.date,doc.domain,doc.wordcount,s.id,doc.url"
#STRUCTATTRLIST "doc.title,doc.author,doc.date"
SUBCORPATTRS "`
  ret += params.subcorpAttrs
    ? params.subcorpAttrs
    : 'doc.source,doc.chtyvo_section,doc.chtyvo_type,doc.title,doc.author,doc.original_author,doc.date'
  ret += `"
#FREQTTATTRS ""
#WPOSLIST ",іменник,noun|propn|pron,дієслово,verb,прикметник,adj|det,прислівник,adv,прийменник,adp,сполучник,cconj|sconj,числівник,num,частка,part,вигук,intj,символ,sym,розділовий,punct,залишок,x"
WPOSLIST ",іменник,.+(NOUN|PROPN|PRON).*,дієслово,.+VERB.*,прикметник,.+(ADJ|DET).*,прислівник,.+ADV.*,прийменник,.+ADP.*,сполучник,.+[CS]CONJ.*,числівник,.+NUM.*,частка,.+PART.*,вигук,.+INTJ.*,символ,.+SYM.*,розділовий,.+PUNCT.*,залишок,.+X.*"
`

  if (params.path) {
    ret += `\nPATH "${path.resolve(params.path)}"`
  }

  if (params.vertical) {
    ret += `\nVERTICAL "${path.resolve(params.vertical)}"`
  }


  ret = ret.trim()

  return ret
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
const uiSettings = {
  uilang: 'uk',
  attrs: 'word',
  copy_icon: '0',
  ctxattrs: 'word',
  gdex_enabled: '0',
  gdexcnt: '100',
  line_numbers: '1',
  multiple_copy: '0',
  pagesize: '20',
  refs: '=doc.reference_title',
  refs_up: '0',
  select_lines: '1',
  shorten_refs: '1',
  show_gdex_scores: '0',
  structs: 'doc,g',
  use_noflash: '0',
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function positionalAttr(name: string, label: string, options: Dict<string> = {}) {
  options.type = 'FD_FGD'
  let ret = `\nATTRIBUTE ${name} {\n  LABEL "${label} [${name}]"\n  DEFAULTVALUE ""`
  for (let [k, v] of Object.entries(options)) {
    ret += `\n  ${k.toUpperCase()} "${v}"`
  }
  ret += '\n}'
  return ret
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function attrOrNothing(name: string, value: string) {
  if (value) {
    return `${name.toUpperCase()} "${value}"`
  }
  return ''
}
