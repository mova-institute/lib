import * as path from 'path'
import { clone } from 'lodash'

export type PositionalAttrs = [string, string, string[]][]

export const positionalAttrsBase = [
  ['tag', 'повна мітка'],
  ['pos', 'ЧМ'],
  ['pos2', 'українізована ЧМ'],
  ['abbr', 'скорочення'],
  ['animacy', 'істотовість'],
  ['animacy_gram', 'граматична істотовість'],
  ['aspect', 'вид'],
  ['case', 'відмінок'],
  ['degree', 'ступінь'],
  ['foreign', 'чужинність'],
  ['gender', 'рід'],
  ['hyph', 'передрисковість'],
  ['mood', 'спосіб'],
  ['nametype', 'тип імені'],
  ['number', 'число'],
  // ['numform', 'запис числівника'],  // del
  ['numtype', 'тип числівника'],
  ['parttype', 'тип частки'],
  ['person', 'особа'],
  ['poss', 'присвійність'],
  // ['prepcase', 'prepcase'],  // del
  ['prontype', 'займенниковий тип'],
  ['puncttype', 'тип пунктуації'],
  ['reflex', 'зворотність'],
  ['reverse', 'зворотність дієслова'],
  ['tense', 'час'],
  ['variant', 'форма прикметника'],
  ['verbform', 'форма дієслова'],
  ['voice', 'стан'],
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

ATTRIBUTE word {
  LABEL "словоформа (word)"
  TYPE "FD_FGD"
}

ATTRIBUTE lc {
  LABEL "словоформа (мал. літерами) (lc)"
  DYNAMIC utf8lowercase
  DYNLIB internal
  ARG1 "C"
  FUNTYPE s
  FROMATTR word
  TYPE index
  TRANSQUERY yes
}

ATTRIBUTE lemma {
  LABEL "лема (lemma)"
  TYPE "FD_FGD"
}

ATTRIBUTE lemma_lc  {
  LABEL "лема (мал. літерами) (lemma_lc)"
  DYNAMIC utf8lowercase
  DYNLIB internal
  ARG1 "C"
  FUNTYPE s
  FROMATTR lemma
  TYPE index
  TRANSQUERY yes
}`



  corpus += positionalAttrs.map(([name, label]) => positionalAttr(name, label)).join('\n')
  if (params.hasDictTags) {
    corpus += `

ATTRIBUTE tag_dic {
  LABEL "повна мітка зі словника"
  TYPE "FD_FGD"
  MULTIVALUE yes
  MULTISEP ";"
}`
  }
  corpus += `


################################################################################
#####################          Structures        ###############################
################################################################################

STRUCTURE doc {
  DISPLAYEND ""

  ATTRIBUTE id
  ATTRIBUTE reference_title {
    LABEL "джерело"
  }
  ATTRIBUTE title {
    LABEL "назва"
  }
  ATTRIBUTE date {
    LABEL "час появи"
  }
  ATTRIBUTE author {
    LABEL "автор"
    MULTIVALUE yes
    MULTISEP "|"
  }
  ATTRIBUTE original_author {
    LABEL "автор первотвору"
    MULTIVALUE yes
    MULTISEP "|"
  }
  ATTRIBUTE chtyvo_section {
    LABEL "розділ (для Чтива)"
  }
  ATTRIBUTE chtyvo_type {
    LABEL "тип (для Чтива)"
  }
  ATTRIBUTE type {
    LABEL "тип"
    MULTIVALUE yes
    MULTISEP "|"
#    HIERARCHICAL "::"
  }
  ATTRIBUTE domain {
    LABEL "галузь"
    MULTIVALUE yes
    MULTISEP "|"
#    HIERARCHICAL "::"
  }
  ATTRIBUTE wordcount {
    LABEL "кількість слів"
  }
  ATTRIBUTE url {
    LABEL "посилання"
  }
  ATTRIBUTE comment {
    LABEL "коментар"
  }
}
STRUCTURE p {
  ATTRIBUTE id
}
STRUCTURE s {
  ATTRIBUTE id {
    LABEL "код речення"
  }
}
STRUCTURE g {
  DISPLAYTAG 0
  DISPLAYBEGIN "_EMPTY_"
}`
  if (params.hasGaps) {
    corpus += `
STRUCTURE gap {
  LABEL "пропуск"
  ATTRIBUTE type {
    LABEL "тип"
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
WPOSLIST ",іменник,noun|propn,дієслово,verb,прикметник,adj,прислівник,adv,прийменник,adp,сполучник,cconj|sconj,числівник,num,частка,part,вигук,intj,розділовий,punct,залишок,x"
`

  if (params.path) {
    corpus += `\nPATH "${path.resolve(params.path)}"`
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
function positionalAttr(name: string, label: string, options: string[] = []) {
  let ret = `\nATTRIBUTE ${name} {\n  LABEL "${label} (${name})"\n  TYPE "FD_FGD"`
  ret += options.map(x => `\n  ${x}`)
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
