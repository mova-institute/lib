#!/usr/bin/python

# (c) Milos Jakubicek 2012

import sys, re, manatee

if len(sys.argv) != 5:
    sys.stderr.write(
"""Usage: calign.py <CORPUS_L1> <CORPUS_L2> <MAPPING_STRUCTATTR> <MAPPING_FILE_L1-L2>
If MAPPING_FILE is '-', it is supplied via standard input.\n
MAPPING_FILE takes the form of an XML for the PARK system.
The result is a mapping file for Manatee (two tab-separated columns, each
consisting of a comma-separated list of structure IDs).

E.g. calign.py europarl_en europarl_de s.id -
""")
    sys.exit(1)

corp1 = manatee.Corpus(sys.argv[1])
corp2 = manatee.Corpus(sys.argv[2])
attr1 = corp1.get_attr(sys.argv[3])
attr2 = corp2.get_attr(sys.argv[3])

if sys.argv[4] == "-":
    map_file = sys.stdin
else:
    map_file = open(sys.argv[4])

def tr_line (aligned, attr, line_nr):
    if not aligned:
        return -1
    aligned = aligned.split()
    beg, end = aligned[0], aligned[-1]
    if beg == end:
        b = attr.str2id(beg)
        if b == -1:
            sys.stderr.write("Skipping invalid beg/end ('%s') on line %d\n"\
                             % (beg, line_nr + 1))
            return None
        return b
    else:
        b = attr.str2id(beg)
        e = attr.str2id(end)
        if b == -1 or e == -1:
            if b == -1 and e == -1:
                sys.stderr.write("Skipping invalid beg, end ('%s','%s') on "\
                                 "line %d\n" % (beg, end, line_nr + 1))
                return None
            elif b == -1:
                sys.stderr.write("Invalid beg ('%s') on line %d, using end\n"\
                                 % (beg, line_nr + 1))
                return e
            else: # e == -1
                sys.stderr.write("Invalid end ('%s') on line %d, using beg\n"\
                                 % (end, line_nr + 1))
                return b
        return "%d,%d" % (b, e)

for line_nr, line in enumerate(map_file):
    line_m = re.match(r".*xtargets=(\"|')([^\1]+?)\1.*", line)
    if not line_m:
        continue
    aligned = line_m.group(2).split(";")
    if len(aligned) > 2:
        sys.stderr.write("Skipping invalid mapping on line %d\n" % line_nr + 1)
        continue
    l1 = tr_line(aligned[0], attr1, line_nr)
    l2 = tr_line(aligned[1], attr2, line_nr)
    if l1 != None and l2 != None:
        sys.stdout.write("%s\t%s\n" % (l1, l2))
