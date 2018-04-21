#!/usr/bin/python

# (c) Milos Jakubicek 2012

import sys

if len(sys.argv) != 1:
    sys.stderr.write(
"""Usage: fixgaps.py < infile > outfile
Fixes gaps in Manatee alignment file
""")
    sys.exit(1)

last_l1 = last_l2 = -1

for line in sys.stdin:
    l1, l2 = line[:-1].split("\t")
    l1 = l1.split(",")
    l2 = l2.split(",")
    l1[0] = int(l1[0])
    l2[0] = int(l2[0])
    l1[-1] = int(l1[-1])
    l2[-1] = int(l2[-1])
    while l1[0] > last_l1 + 1:
        last_l1 += 1
        sys.stdout.write("%d\t-1\n" % last_l1)
    while l2[0] > last_l2 + 1:
        last_l2 += 1
        sys.stdout.write("-1\t%d\n" % last_l2)
    if l1[-1] != -1:
        last_l1 = l1[-1]
    if l2[-1] != -1:
        last_l2 = l2[-1]
    sys.stdout.write(line)
