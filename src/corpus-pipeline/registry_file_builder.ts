import * as path from 'path'



///////////////////////////////////////////////////////////////////////////////
export interface RegistryFileParams {
  // name: string
  title: string
  hasGaps: boolean
  path?: string
}

////////////////////////////////////////////////////////////////////////////////
export function generateRegistryFile(params: RegistryFileParams) {
  let corpus = `

NAME "${params.title}"
#INFO "Корпус української (випробовування)"   # todo: say mova intitute some day
INFOHREF "https://mova.institute/corpus"
MAINTAINER "org@mova.institute"
TAGSETDOC "http://universaldependencies.org"    # todo


LANGUAGE "Ukrainian"
ENCODING "utf8"
LOCALE "uk_UA.UTF-8"
NONWORDRE "[^АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщьЮюЯя’А-Яа-я[:alpha:]].*"


################################################################################
#####################          Positionals        ##############################
################################################################################

ATTRIBUTE word {
  LABEL "слово"
  TYPE "FD_FGD"
}

ATTRIBUTE lc {
  LABEL "слово (мал. літерами)"
  MULTIVALUE yes
  MULTISEP "|"
  DYNAMIC utf8lowercase
  DYNLIB internal
  ARG1 "C"
  FUNTYPE s
  FROMATTR word
  TYPE index
  TRANSQUERY yes
}

ATTRIBUTE lemma {
  LABEL "лема"
  MULTIVALUE yes
  MULTISEP  "|"
  TYPE "FD_FGD"
}

ATTRIBUTE lemma_lc  {
  LABEL "лема (мал. літерами)"
  MULTIVALUE yes
  MULTISEP "|"
  DYNAMIC utf8lowercase
  DYNLIB internal
  ARG1 "C"
  FUNTYPE s
  FROMATTR lemma
  TYPE index
  TRANSQUERY yes
}

ATTRIBUTE tag {
  LABEL "повна мітка"
  TYPE "FD_FGD"
}

ATTRIBUTE pos {
  LABEL "ЧМ"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE pos2 {
  LABEL "українізована ЧМ"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE abbr {
  LABEL "скорочення"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE animacy {
  LABEL "істотовість"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE animacy_gram {
  LABEL "граматична істотовість"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE aspect {
  LABEL "вид"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE case {
  LABEL "відмінок"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE degree {
  LABEL "ступінь"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE foreign {
  LABEL "чужинність"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE gender {
  LABEL "рід"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE hyph {
  LABEL "передрисковість"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE mood {
  LABEL "спосіб"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE nametype {
  LABEL "тип імені"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE number {
  LABEL "число"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE numform {
  LABEL "запис числівника"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE numtype {
  LABEL "тип числівника"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE parttype {
  LABEL "тип частки"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE person {
  LABEL "особа"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE poss {
  LABEL "присвійність"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE prepcase {
  LABEL ""
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE prontype {
  LABEL "займенниковий тип"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

#ATTRIBUTE punctside {
#  LABEL "бік пунктуації"
#  MULTIVALUE yes
#  MULTISEP "|"
#  TYPE "FD_FGD"
#}

ATTRIBUTE puncttype {
  LABEL "тип пунктуації"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE reflex {
  LABEL "зворотність"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE reverse {
  LABEL "зворотність дієслова"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE tense {
  LABEL "час"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE variant {
  LABEL "форма прикметника"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE verbform {
  LABEL "форма дієслова"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE voice {
  LABEL "стан"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE rel {
  LABEL "реляція"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE urel {
  LABEL "універсальна реляція"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE spaceafter  {
  LABEL "пробіл після"
}

ATTRIBUTE id {
  LABEL "номер токена"
  TYPE "FD_FGD"
}



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
  ATTRIBUTE disamb {
    LABEL "уоднозначнення"
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

SHORTREF "=doc.reference_title"

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

FULLREF "doc.title,doc.author,doc.original_author,doc.date,doc.type,doc.domain,doc.comment,doc.wordcount,s.id,doc.url"
STRUCTATTRLIST "doc.title,doc.author,doc.date,doc.type"
SUBCORPATTRS "doc.title,doc.author|doc.date,doc.type"
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
