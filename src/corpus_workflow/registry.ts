
export type Disamb = 'жодного' | 'часткове-правила' | 'руками-Політехніка' | 'руками-стандарт'
export type Type = 'невизначені'
////////////////////////////////////////////////////////////////////////////////
export interface DocumentStructureAttributes {
  reference_title: string
  title: string
  date?: string
  author?: string
  originalAuthor?: string
  type?: Type
  domain?: string
  disamb: Disamb
  url?: string
  comment?: string
}


export interface RegistryFileParams {
  name: string
  title: string
}
////////////////////////////////////////////////////////////////////////////////
export function generateRegistryFile(params: RegistryFileParams) {
  if (params.name.includes('/')) {
    throw new Error()
  }

  let corpus = `

NAME "${params.title}"
#INFO "Корпус української (випробовування)"   # todo: say mova intitute some day
INFOHREF "https://mova.institute/corpus"
MAINTAINER "corpus@mova.institute"
TAGSETDOC "http://nl.ijs.si/ME/V4/msd/html/msd-uk.html"

PATH "/srv/corpora/manatee/${params.name}"
#SUBCDEF "/srv/corpora/registry/${params.name}_sub"
VERTICAL "|echo"


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

ATTRIBUTE  lemma_lc  {
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
  LABEL "морфмітка"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}

ATTRIBUTE tag2 {
  LABEL "морфмітка (службова)"
  MULTIVALUE yes
  MULTISEP "|"
  TYPE "FD_FGD"
}


################################################################################
#####################          Structures        ###############################
################################################################################

STRUCTURE doc {
  ATTRIBUTE reference_title {
    LABEL "джерело"
  }
  ATTRIBUTE title {
    LABEL "назва"
  }
  ATTRIBUTE date {
    LABEL "дата появи"
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
    HIERARCHICAL "::"
  }
  ATTRIBUTE domain {
    LABEL "галузь"
    MULTIVALUE yes
    MULTISEP "|"
    HIERARCHICAL "::"
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
  #DISPLAYTAG 0
  #DISPLAYBEGIN "_EMPTY_"
  #DISPLAYEND "❡"
}
#STRUCTURE s
STRUCTURE g {
  DISPLAYTAG 0
  DISPLAYBEGIN "_EMPTY_"
}


################################################################################
########################          View        ##################################
################################################################################

SHORTREF "=doc.id"

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

FULLREF "doc.title,doc.date,doc.author,doc.date,doc.url,doc.type,doc.comment,doc.wordcount"
STRUCTATTRLIST "doc.reference_title,doc.author,doc.date,doc.type"
SUBCORPATTRS "doc.title,doc.author|doc.date,doc.type"
#FREQTTATTRS ""
WPOSLIST ",іменник,N.*,дієслово,V.*,прикметник,A.*,займенник,P.*,прислівник,R.*,прийменник,S.*,сполучник,C.*,числівник,M.*,частка,Q.*,вигук,I.*,скорочення,Y.*,розділовий,U.*,залишок,X.*"

  `.trim()


  let subcorpus = `

*FREQLISTATTRS word lc lemma lemma_lc tag tag2

=до30ті
  -CQL-
  <doc year_created="1[0-8]*|19[0-2][0-9]" />

  `.trim()

  return { corpus, subcorpus }
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
