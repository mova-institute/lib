import * as path from 'path'
import { clone } from 'lodash'
import { Dict } from '../types';



type PositionalAttrs = [string, string, string[]][]

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
] as PositionalAttrs

///////////////////////////////////////////////////////////////////////////////
export interface RegistryFileParams {
  // name: string
  title: string
  hasDictTags: boolean
  hasGaps: boolean
  hasTokenIds: boolean
  path?: string
  vertical?: string
}

////////////////////////////////////////////////////////////////////////////////
export function generateRegistryFiles(params: RegistryFileParams) {
  let positionalAttrs = clone(positionalAttrsBase)
  if (params.hasTokenIds) {
    positionalAttrs.push(['id', 'код токена', ['UNIQUE yes']])
  }


  let corpus = `

NAME "${params.title}"
#INFO "Корпус української (випробовування)"
INFOHREF "https://mova.institute/corpus"
MAINTAINER "org@mova.institute"
TAGSETDOC "http://universaldependencies.org/guidelines.html"


LANGUAGE "Ukrainian"
ENCODING "utf8"
LOCALE "uk_UA.UTF-8"
NONWORDRE "[^АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщьЮюЯя’А-Яа-я[:alpha:]].*"


################################################################################
#####################          Positionals        ##############################
################################################################################
`
  corpus += positionalAttr('word', 'словоформа')
  corpus += positionalAttr('lc', 'словоформа мал. літерами', {
    dynamic: 'utf8lowercase',
    dynlib: 'internal',
    arg1: 'C',
    funtype: 's',
    fromattr: 'word',
    type: 'index',
    transquery: 'yes',
  })
  corpus += positionalAttr('lemma', 'лема')
  corpus += positionalAttr('lemma_lc', 'лема мал. літерами', {
    dynamic: 'utf8lowercase',
    dynlib: 'internal',
    arg1: 'C',
    funtype: 's',
    fromattr: 'lemma',
    type: 'index',
    transquery: 'yes',
  })

  corpus += positionalAttrs.map(([name, label]) => positionalAttr(name, label)).join('\n')
  if (params.hasDictTags) {
    corpus += positionalAttr('tag_dic', 'повна міта зі словника', {
      multivalue: 'yes',
      multisep: ';'
    })
  }
  corpus += `

################################################################################
#####################          Structures        ###############################
################################################################################

STRUCTURE doc {
  ATTRIBUTE id {
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE title {
    LABEL "назва"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE date {
    LABEL "час появи"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE author {
    LABEL "автор"
    MULTIVALUE yes
    MULTISEP "|"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE original_author {
    LABEL "автор первотвору"
    MULTIVALUE yes
    MULTISEP "|"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE chtyvo_section {
    LABEL "розділ (для Чтива)"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE chtyvo_type {
    LABEL "тип (для Чтива)"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE source {
    LABEL "джерело"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE type {
    LABEL "тип"
    MULTIVALUE yes
    MULTISEP "|"
#    HIERARCHICAL "::"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE domain {
    LABEL "галузь"
    MULTIVALUE yes
    MULTISEP "|"
#    HIERARCHICAL "::"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE url {
    LABEL "посилання"
    TYPE file64
    DEFAULTVALUE ""
  }
  ATTRIBUTE wordcount {
    LABEL "кількість слів"
    TYPE file64
    DEFAULTVALUE ""
  }
}
STRUCTURE p {
  ATTRIBUTE id {
    LABEL "код абзаца"
    TYPE file64
    DEFAULTVALUE ""
  }
}
STRUCTURE s {
  ATTRIBUTE id {
    LABEL "код речення"
    TYPE file64
    DEFAULTVALUE ""
  }
}
STRUCTURE g {
  DISPLAYTAG 0
  DISPLAYBEGIN "_EMPTY_"
  TYPE file64
  DEFAULTVALUE ""
}`
  if (params.hasGaps) {
    corpus += `
STRUCTURE gap {
  LABEL "пропуск"
  ATTRIBUTE type {
    LABEL "тип"
    TYPE file64
    DEFAULTVALUE ""
  }
}`
  }
  corpus += `



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

FULLREF "doc.title,doc.author,doc.original_author,doc.date,doc.domain,doc.comment,doc.wordcount,s.id,doc.url"
#STRUCTATTRLIST "doc.title,doc.author,doc.date"
SUBCORPATTRS "doc.title,doc.author|doc.date"
#FREQTTATTRS ""
WPOSLIST ",іменник,noun|propn|pron,дієслово,verb,прикметник,adj|det,прислівник,adv,прийменник,adp,сполучник,cconj|sconj,числівник,num,частка,part,вигук,intj,символ,sym,розділовий,punct,залишок,x"
`

  if (params.path) {
    corpus += `\nPATH "${path.resolve(params.path)}"`
  }

  if (params.vertical) {
    corpus += `\nVERTICAL "${path.resolve(params.vertical)}"`
  }


  corpus = corpus.trim()
  let subcorpus = `

*FREQLISTATTRS word lc lemma lemma_lc tag tag2

=до30ті
  -CQL-
  <doc date="[0-9]{4}.*" & date<="1932">

  `.trim()

  return { corpus, subcorpus }
}


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

//------------------------------------------------------------------------------
function positionalAttr(name: string, label: string, options: Dict<string> = {}) {
  options.type = 'FD_FGD'
  let ret = `\nATTRIBUTE ${name} {\n  LABEL "${label} [${name}]"\n  DEFAULTVALUE ""`
  for (let [k, v] of Object.entries(options)) {
    ret += `\n  ${k.toUpperCase()} "${v}"`
  }
  ret += '\n}'
  return ret
}

/*




reference_title
title назва
date дата
author автор
original_author автор первотвору
url посилання
disamb уоднозначнення    жодного|часткове-правила|руками-Політехніка|руками-стандарт
type тип    художня проза|поезія|публіцистика|закон (НПА)||

domain галузь спорт|економіка|мистецтво|історія|

хххх    оповідання|стаття|роман|

wordcount
comment

// proofread

*/
