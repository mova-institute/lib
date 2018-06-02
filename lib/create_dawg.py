#!/usr/bin/env python3

import sys
import dawg

dest = sys.argv[1]

words = []
for line in sys.stdin:
  line = line.strip()
  if not line:
    continue
  words.append(line)

dwg = dawg.DAWG(words)
dwg.write(open(dest, 'wb'))
