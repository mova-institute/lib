////////////////////////////////////////////////////////////////////////////////
export function generateRegistryFile(copusVersion: number) {
  let corpus = `

NAME "Усі тексти"
#INFO "Корпус української (випробовування)"   # todo: say mova intitute some day
INFOHREF "https://mova.institute/corpus"
MAINTAINER "corpus@mova.institute"
TAGSETDOC "http://nl.ijs.si/ME/V4/msd/html/msd-uk.html"

PATH "/srv/corpora/manatee/everything_${copusVersion}"
#SUBCDEF "/srv/corpora/registry/everything_${copusVersion}_sub"
VERTICAL "/srv/corpora/vertical/dummy.vertical.txt"    # or else error is thrown


LANGUAGE "Ukrainian"
ENCODING "utf8"
LOCALE "uk_UA.UTF-8"
NONWORDRE "[^АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщьЮюЯя’А-Яа-я[:alpha:]].*"



################################################################################

ATTRIBUTE word {
  LABEL "слово"
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
}

ATTRIBUTE tag2 {
  LABEL "морфмітка (службова)"
  MULTIVALUE yes
  MULTISEP "|"
}


################################################################################

STRUCTURE doc {
  ATTRIBUTE id {
    LABEL "індентифікатор"
  }
  ATTRIBUTE title {
    LABEL "назва"
  }
  ATTRIBUTE href {
    LABEL "посилання"
  }
  ATTRIBUTE year_created {
    LABEL "рік написання"
    NUMERIC yes
  }
  ATTRIBUTE date {
    LABEL "дата"
  }
  ATTRIBUTE author {
    LABEL "автор"
    MULTIVALUE yes
    MULTISEP "|"
    MAXLISTSIZE "300"
  }
  ATTRIBUTE publisher {
    LABEL "видавець"
  }
  ATTRIBUTE text_type {
    LABEL "тип тексту"
    MULTIVALUE yes
    MULTISEP "|"
    HIERARCHICAL "::"
  }
  ATTRIBUTE comment {
    LABEL "коментар"
  }
  ATTRIBUTE proofread {
    LABEL "вичитано"
  }
# ATTRIBUTE disamb
  ATTRIBUTE wordcount {
    LABEL "кількість слів"
  }
}
#structure div {
#  LABEL "розділ"
#}
STRUCTURE p {
  #DISPLAYTAG 0
  #DISPLAYBEGIN "_EMPTY_"
  #DISPLAYEND "❡"
}
STRUCTURE s
STRUCTURE g {
  DISPLAYTAG 0
  DISPLAYBEGIN "_EMPTY_"
}


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

FULLREF "doc.id,doc.title,doc.date,doc.author,doc.year_created,doc.href,doc.text_type,doc.comment,doc.wordcount"
STRUCTATTRLIST "doc.id,doc.title,doc.author,doc.year_created,doc.text_type"
SUBCORPATTRS "doc.id|doc.title,doc.author|doc.year_created,doc.text_type"
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
