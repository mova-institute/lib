#!/usr/bin/python

import sys

if len(sys.argv) != 3:
    sys.stderr.write(
"""Usage: transalign.py <MAPPING_L2-L1> <MAPPING_L3-L1>
Creates new mapping file MAPPING_L2-L3.\n
E.g. transalign.py europarl_en2cs europarl_de2cs > europarl_en2de
""")
    sys.exit(1)

map_l1_l2 = {} # store l1 -> l2 mapping
map_l1_l3 = {} # store l1 -> l3 mapping
l1a_ranges = {} # from first mapping file, for each ID store a pointer to a shared list [beg, end]
l1b_ranges = {} # samewise for the second mapping file

sys.stderr.write ("Loading %s ..." % sys.argv[1]) # load l2-l1 mapping
for line in open(sys.argv[1]):
    l2, l1 = line[:-1].split("\t")
    l1 = l1.split(",")
    if -1 in l1:
        continue
    l2 = l2.split(",")
    l1 = [int(l1[0]), int(l1[-1])]
    l2 = [int(l2[0]), int(l2[-1])]
    for part in xrange(l1[0], l1[1] + 1):
        map_l1_l2 [part] = l2
        l1a_ranges [part] = l1

sys.stderr.write ("done.\nLoading %s ..." % sys.argv[2]) # load l3-l1 mapping
for line in open(sys.argv[2]):
    l3, l1 = line[:-1].split("\t")
    l1 = l1.split(",")
    if -1 in l1:
        continue
    l3 = l3.split(",")
    l1 = [int(l1[0]), int(l1[-1])]
    l3 = [int(l3[0]), int(l3[-1])]
    for part in xrange(l1[0], l1[1] + 1):
        map_l1_l3 [part] = l3
        l1b_ranges [part] = l1

def merge_range (r1, r2):
    changed = False
    if r2[0] < r1[0]: r1[0] = r2[0]; changed = True
    if r2[1] > r1[1]: r1[1] = r2[1]; changed = True
    return changed

def skip_empty (idx, final, mapd):
    if idx < final: step = 1; beg = 0
    else: step = beg = -1;
    val = -1
    while idx != final and val == -1:
        try:
            val = mapd [idx][beg]
        except KeyError:
            pass
        idx += step
    return val

sys.stderr.write ("done.\nComputing new alignment:\n")
# map group_l1 to group_l2 transitively
size = len(l1a_ranges) / 100.0
next = 0
map_l2_l3 = []
map_empty_l2 = []
map_empty_l3 = []
for count, beg in enumerate(sorted(l1a_ranges)):
    if count % 100 == 0:
        sys.stderr.write("\r%.2f %%" % (count / size))
    if beg < next:
        continue
    # compute transitive closure on rng taking both l1a_ranges and l1b_ranges
    rng = l1a_ranges [beg]
    changed = True
    while changed:
        changed = False
        if rng[0] in l1b_ranges:
            changed = merge_range (rng, l1b_ranges [rng[0]])
        if rng[1] in l1b_ranges:
            changed |= merge_range (rng, l1b_ranges [rng[1]])
        if changed:
            changed = False
            if rng[0] in l1a_ranges:
                changed = merge_range (rng, l1a_ranges [rng[0]])
            if rng[1] in l1a_ranges:
                changed |= merge_range (rng, l1a_ranges [rng[1]])
    next = rng[1] + 1
    l2 = [skip_empty(rng[0], rng[1]+1, map_l1_l2),
          skip_empty(rng[1], rng[0]-1, map_l1_l2)]
    l3 = [skip_empty(rng[0], rng[1]+1, map_l1_l3),
          skip_empty(rng[1], rng[0]-1, map_l1_l3)]
    if l2[0] == l2[1]: l2 = [l2[0]] # squeeze X, X into X
    if l3[0] == l3[1]: l3 = [l3[0]]
    if l2[0] == -1:
        if l3[0] == -1: continue # -1 to -1
        else: map_empty_l2.append (l3) # -1 to X
    elif l3[0] == -1: map_empty_l3.append (l2) # X to -1
    else: map_l2_l3.append ((l2, l3)) # X to Y
sys.stderr.write("\r100.00 %\nWriting sorted output ...")

map_l2_l3.sort (reverse=True)
map_empty_l2.sort (reverse=True)
map_empty_l3.sort (reverse=True)

class RngStream ():
    def __init__ (self, src, final): self.src = src; self.final = final
    def next (self): return self.src and self.src.pop () or self.final

final = -1
if map_l2_l3:
    final = max (map_l2_l3[0][0][-1], map_l2_l3[0][1][-1])
if map_empty_l2:
    final = max (final, map_empty_l2[0][-1])
if map_empty_l3:
    final = max (final, map_empty_l3[0][-1])
final = [final + 1]
map_l2_l3 = RngStream (map_l2_l3, (final, final))
map_empty_l2 = RngStream (map_empty_l2, final)
map_empty_l3 = RngStream (map_empty_l3, final)

vl2l3 = map_l2_l3.next()
vl3 = map_empty_l2.next()
vl2 = map_empty_l3.next()
while vl2l3 != map_l2_l3.final or vl3 != map_empty_l2.final \
                               or vl2 != map_empty_l2.final:
    l2, l3 = vl2l3[0], vl2l3[1]
    if vl2 < l2:
        l2, l3 = vl2, [-1]
        vl2 = map_empty_l3.next()
    elif vl3 < l3:
        l2, l3 = [-1], vl3
        vl3 = map_empty_l2.next()
    else:
        vl2l3 = map_l2_l3.next()
    if len(l2) > 1: l2 = "%d,%d" % (l2[0], l2[-1])
    else: l2 = str(l2[0])
    if len(l3) > 1: l3 = "%d,%d" % (l3[0], l3[-1])
    else: l3 = str(l3[0])
    sys.stdout.write("%s\t%s\n" % (l2, l3))
sys.stderr.write("done. Finished\n")
