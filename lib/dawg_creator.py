#!/usr/bin/env python3

import sys
import json
import dawg

base = sys.argv[1]

with open(base + '/words.dawg.json') as file:
    json_data = json.load(file)
    dawg_data = []
    for word in json_data:
        dawg_data.append(
                (word[0], (word[1], word[2]))
        )

    dwg = dawg.RecordDAWG('>HH', dawg_data)
    dwg.write(open(base + '/words.dawg', 'wb'))
