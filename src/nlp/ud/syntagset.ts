export type Ud20UniversalRelation =
  'acl' |
  'advcl' |
  'advmod' |
  'amod' |
  'appos' |
  'aux' |
  'case' |
  'cc' |
  'ccomp' |
  'compound' |
  'conj' |
  'cop' |
  'csubj' |
  'det' |
  'discourse' |
  'dislocated' |
  'expl' |
  'fixed' |
  'flat' |
  'goeswith' |
  'iobj' |
  'list' |
  'mark' |
  'nmod' |
  'nsubj' |
  'nummod' |
  'obj' |
  'obl' |
  'orphan' |
  'parataxis' |
  'punct' |
  'reparandum' |
  'root' |
  'vocative' |
  'xcomp'

export type Ud20MiSpecificRelation =
  'aux:pass' |
  'compound:svc' |
  'conj:parataxis' |
  'conj:repeat' |
  'csubj:pass' |
  'det:numgov' |
  'det:nummod' |
  'flat:foreign' |
  'flat:name' |
  'mark:iobj' |
  'mark:nsubj' |
  'mark:obj' |
  'mark:obl' |
  'nsubj:pass' |
  'nummod:gov' |
  'obl:agent'

export type UdMiRelation = Ud20UniversalRelation | Ud20MiSpecificRelation

