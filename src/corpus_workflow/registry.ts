///////////////////////////////////////////////////////////////////////////////
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
  DISPLAYEND ""

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

FULLREF "doc.title,doc.author,doc.original_author,doc.date,doc.type,doc.domain,doc.comment,doc.wordcount,doc.url"
STRUCTATTRLIST "doc.reference_title,doc.author,doc.date,doc.type"
SUBCORPATTRS "doc.title,doc.author|doc.date,doc.type"
#FREQTTATTRS ""
WPOSLIST ",іменник,N.*,дієслово,V.*,прикметник,A.*,займенник,P.*,прислівник,R.*,прийменник,S.*,сполучник,C.*,числівник,M.*,частка,Q.*,вигук,I.*,скорочення,Y.*,розділовий,U.*,залишок,X.*"

  `.trim()


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
