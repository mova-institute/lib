#!/usr/bin/python

# (c) Milos Jakubicek 2012

import sys

if len(sys.argv) != 1:
    sys.stderr.write(
"""Usage: fixgaps.py < infile > outfile
Compresses subsequent empty alignment lines into a range
""")
    sys.exit(1)

def print_range (beg, end, rightEmpty):
    if beg == end:
        if rightEmpty:
            sys.stdout.write("%d\t-1\n" % beg)
        else:
            sys.stdout.write("-1\t%d\n" % beg)
    else:
        if rightEmpty:
            sys.stdout.write("%d,%d\t-1\n" % (beg, end))
        else:
            sys.stdout.write("-1\t%d,%d\n" % (beg, end))

beg_l1 = beg_l2 = end_l1 = end_l2 = None

for line in sys.stdin:
    l1, l2 = line[:-1].split("\t")
    l1 = l1.split(",")
    l2 = l2.split(",")
    l1[0] = int(l1[0])
    l2[0] = int(l2[0])
    l1[-1] = int(l1[-1])
    l2[-1] = int(l2[-1])
    if l2[0] == -1:
        if beg_l1 == None:
            beg_l1 = l1[0]
            end_l1 = l1[-1]
        else:
            end_l1 = l1[-1]
        continue
    elif beg_l1 != None:
        print_range (beg_l1, end_l1, True)
        beg_l1 = None
    if l1[0] == -1:
        if beg_l2 == None:
            beg_l2 = l2[0]
            end_l2 = l2[-1]
        else:
            end_l2 = l2[-1]
        continue
    elif beg_l2 != None:
        print_range (beg_l2, end_l2, False)
        beg_l2 = None
    sys.stdout.write(line)
if beg_l1:
    print_range (beg_l1, end_l1, True)
elif beg_l2:
    print_range (beg_l2, end_l2, False)
