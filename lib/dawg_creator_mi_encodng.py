#!/usr/bin/env python3

import sys
import array
import dawg


base = sys.argv[1]

dawg_data = []
for l in open(base + '/words.dawg.lst'):
    dawg_data.append(array.array('B', [int(x) for x in l.split()]).tobytes())

dwg = dawg.CompletionDAWG(dawg_data)
dwg.write(open(base + '/words.dawg', 'wb'))
